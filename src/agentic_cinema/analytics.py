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
