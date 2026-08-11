"""Fast, direct ClickHouse queries for the dashboard -- no LLM involved.

These back the at-a-glance metrics and charts; the agent (agent.py) is
reserved for open-ended natural-language questions.
"""
import bisect
import os
from collections import defaultdict

import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

TABLE = "agentic_cinema.viewing_events"


def get_client():
    return clickhouse_connect.get_client(
        host=os.environ["CLICKHOUSE_HOST"],
        port=int(os.environ.get("CLICKHOUSE_PORT", 8443)),
        username=os.environ.get("CLICKHOUSE_USER", "default"),
        password=os.environ["CLICKHOUSE_PASSWORD"],
        secure=os.environ.get("CLICKHOUSE_SECURE", "true").lower() == "true",
    )


def get_overview() -> dict:
    client = get_client()
    row = client.query(
        f"""
        SELECT
            count(DISTINCT user_id) AS total_viewers,
            count(DISTINCT session_id) AS total_sessions,
            countIf(event_type = 'complete') AS total_completes,
            countIf(event_type = 'drop_off') AS total_dropoffs
        FROM {TABLE}
        """
    ).result_rows[0]
    total_viewers, total_sessions, total_completes, total_dropoffs = row
    finished = total_completes + total_dropoffs
    completion_rate = (total_completes / finished) if finished else 0.0
    return {
        "total_viewers": total_viewers,
        "total_sessions": total_sessions,
        "total_completes": total_completes,
        "total_dropoffs": total_dropoffs,
        "completion_rate": round(completion_rate, 4),
    }


def get_dropoffs_by_episode() -> list[dict]:
    client = get_client()
    rows = client.query(
        f"""
        SELECT episode_id, countIf(event_type = 'drop_off') AS dropoffs
        FROM {TABLE}
        GROUP BY episode_id
        ORDER BY episode_id
        """
    ).result_rows
    return [{"episode_id": ep, "dropoffs": n} for ep, n in rows]


def get_by_device() -> list[dict]:
    client = get_client()
    rows = client.query(
        f"""
        SELECT device, count(DISTINCT session_id) AS viewers
        FROM {TABLE}
        GROUP BY device
        ORDER BY viewers DESC
        """
    ).result_rows
    return [{"device": d, "viewers": n} for d, n in rows]


def get_by_region() -> list[dict]:
    client = get_client()
    rows = client.query(
        f"""
        SELECT region, count(DISTINCT session_id) AS viewers
        FROM {TABLE}
        GROUP BY region
        ORDER BY viewers DESC
        """
    ).result_rows
    return [{"region": r, "viewers": n} for r, n in rows]


SAMPLE_INTERVAL_S = 30  # must match agentic_cinema.data.generate_events


def get_retention_curves() -> list[dict]:
    """Per episode, % of sessions still watching at each 30s mark.

    Rows are only emitted for seek/pause/drop_off/complete events plus the
    initial play (see generate_events.py) -- most 30s ticks have no row at
    all. So retention can't be read off row-presence at each position; it
    has to be a survival curve computed from each session's actual
    endpoint (its drop_off position, or the episode duration if it
    completed): retention at P = fraction of sessions whose endpoint >= P.
    """
    client = get_client()
    rows = client.query(
        f"""
        SELECT episode_id, session_id, max(position_seconds) AS final_position
        FROM {TABLE}
        GROUP BY episode_id, session_id
        """
    ).result_rows

    by_episode: dict[int, list[int]] = defaultdict(list)
    for episode_id, _session_id, final_position in rows:
        by_episode[episode_id].append(final_position)

    curves = []
    for episode_id in sorted(by_episode):
        finals = sorted(by_episode[episode_id])
        total = len(finals)
        max_pos = finals[-1] if finals else 0
        buckets = range(0, max_pos + SAMPLE_INTERVAL_S, SAMPLE_INTERVAL_S)
        points = []
        for bucket in buckets:
            remaining = total - bisect.bisect_left(finals, bucket)
            points.append(
                {
                    "position_seconds": bucket,
                    "viewers": remaining,
                    "pct_remaining": round(remaining / total, 4) if total else 0,
                }
            )
        curves.append({"episode_id": episode_id, "points": points})
    return curves


# -- Churn risk -------------------------------------------------------------
#
# The dataset is a single show, so there's no real subscription-cancellation
# signal to learn from. This scores each viewer's risk of *abandoning this
# series* from the behavioral signals we do have -- completion rate, how far
# into the series they got, how early within episodes they tend to quit, and
# recency of last activity. In a product with multiple shows and account-level
# activity, the same shape of score (weighted, explainable, per-entity) would
# extend directly to real subscription churn.

RISK_WEIGHTS = {
    "inactivity": 40,
    "completion": 25,
    "progress": 20,
    "drop_severity": 15,
}


def _risk_bucket(score: float) -> str:
    if score >= 70:
        return "critical"
    if score >= 50:
        return "serious"
    if score >= 30:
        return "warning"
    return "good"


def _percentile_ranks(records: list[dict], key: str) -> list[float]:
    """Rank of each record's value for `key` among all records, as 0..1
    (0 = lowest value, 1 = highest). Used to score each risk factor relative
    to the population rather than against an arbitrary absolute threshold --
    with a data generator that spreads activity across a multi-week window,
    a fixed "days since last event" cutoff unfairly penalizes anyone who
    happened to start earlier in that window, not just viewers who actually
    disengaged.
    """
    n = len(records)
    if n <= 1:
        return [0.0] * n
    order = sorted(range(n), key=lambda i: records[i][key])
    ranks = [0.0] * n
    for rank, i in enumerate(order):
        ranks[i] = rank / (n - 1)
    return ranks


def get_churn_risk(limit: int = 50) -> dict:
    client = get_client()

    total_episodes = client.query(f"SELECT count(DISTINCT episode_id) FROM {TABLE}").result_rows[0][0]
    now = client.query(f"SELECT max(event_ts) FROM {TABLE}").result_rows[0][0]

    rows = client.query(
        f"""
        WITH episode_durations AS (
            SELECT episode_id, max(position_seconds) AS duration
            FROM {TABLE}
            GROUP BY episode_id
        ),
        per_user_episode AS (
            SELECT
                user_id,
                episode_id,
                max(position_seconds) AS final_position,
                countIf(event_type = 'complete') > 0 AS completed,
                countIf(event_type = 'drop_off') > 0 AS dropped,
                max(event_ts) AS last_event_ts
            FROM {TABLE}
            GROUP BY user_id, episode_id
        )
        SELECT
            pue.user_id AS user_id,
            count() AS episodes_started,
            sum(pue.completed) AS episodes_completed,
            sum(pue.dropped) AS episodes_dropped,
            max(pue.episode_id) AS max_episode_reached,
            max(pue.last_event_ts) AS last_activity,
            avgIf(pue.final_position / ed.duration, pue.dropped = 1) AS avg_drop_relative_position
        FROM per_user_episode pue
        JOIN episode_durations ed ON pue.episode_id = ed.episode_id
        GROUP BY pue.user_id
        """
    ).result_rows

    records = []
    for (
        user_id,
        episodes_started,
        episodes_completed,
        episodes_dropped,
        max_episode_reached,
        last_activity,
        avg_drop_relative_position,
    ) in rows:
        completion_rate = episodes_completed / episodes_started if episodes_started else 0.0
        series_progress = max_episode_reached / total_episodes if total_episodes else 0.0
        days_inactive = (now - last_activity).total_seconds() / 86400
        # avg_drop_relative_position is None/NaN when the viewer never dropped
        drop_severity = (
            1 - avg_drop_relative_position
            if avg_drop_relative_position is not None and avg_drop_relative_position == avg_drop_relative_position
            else 0.0
        )

        records.append(
            {
                "user_id": user_id,
                "episodes_started": episodes_started,
                "episodes_completed": episodes_completed,
                "completion_rate": completion_rate,
                "series_progress": series_progress,
                "max_episode_reached": max_episode_reached,
                "days_inactive": days_inactive,
                "drop_severity": drop_severity,
                # "badness" direction: higher = more at-risk, for ranking
                "badness_inactivity": days_inactive,
                "badness_completion": 1 - completion_rate,
                "badness_progress": 1 - series_progress,
                "badness_drop": drop_severity,
            }
        )

    pct_inactivity = _percentile_ranks(records, "badness_inactivity")
    pct_completion = _percentile_ranks(records, "badness_completion")
    pct_progress = _percentile_ranks(records, "badness_progress")
    pct_drop = _percentile_ranks(records, "badness_drop")

    scored = []
    bucket_counts = {"critical": 0, "serious": 0, "warning": 0, "good": 0}

    for i, r in enumerate(records):
        components = {
            "inactivity": RISK_WEIGHTS["inactivity"] * pct_inactivity[i],
            "completion": RISK_WEIGHTS["completion"] * pct_completion[i],
            "progress": RISK_WEIGHTS["progress"] * pct_progress[i],
            "drop_severity": RISK_WEIGHTS["drop_severity"] * pct_drop[i],
        }
        risk_score = round(sum(components.values()), 1)
        bucket = _risk_bucket(risk_score)
        bucket_counts[bucket] += 1

        top_component = max(components, key=components.get)
        reason = {
            "inactivity": f"Inactive for {r['days_inactive']:.0f} days (longer than most viewers)",
            "completion": f"Low completion rate ({r['completion_rate'] * 100:.0f}%)",
            "progress": f"Stalled at episode {r['max_episode_reached']} of {total_episodes}",
            "drop_severity": "Tends to abandon episodes early",
        }[top_component]

        scored.append(
            {
                "user_id": r["user_id"],
                "risk_score": risk_score,
                "risk_bucket": bucket,
                "primary_reason": reason,
                "episodes_started": r["episodes_started"],
                "episodes_completed": r["episodes_completed"],
                "completion_rate": round(r["completion_rate"], 3),
                "max_episode_reached": r["max_episode_reached"],
                "days_inactive": round(r["days_inactive"], 1),
            }
        )

    scored.sort(key=lambda r: r["risk_score"], reverse=True)

    return {
        "total_viewers": len(scored),
        "bucket_counts": bucket_counts,
        "top_at_risk": scored[:limit],
    }
