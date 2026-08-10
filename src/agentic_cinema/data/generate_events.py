"""Synthesize viewer-event data for a fictional series, with an engineered
drop-off spike in one episode so the agent has a real signal to find.

Usage:
    python -m agentic_cinema.data.generate_events --users 50000 --out data/viewing_events.parquet
"""
import argparse
import uuid
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

CONTENT_ID = "nebula-heist"
EPISODES = {
    1: 2600,
    2: 2700,
    3: 2750,  # has the engineered slow patch below
    4: 2650,
    5: 2800,
    6: 3100,
}
# (episode_id, start_second, end_second, extra_drop_probability)
SLOW_PATCHES = [
    (3, 1180, 1420, 0.35),  # a dragging mid-episode monologue
]
DEVICES = ["mobile", "tv", "tablet", "desktop"]
DEVICE_WEIGHTS = [0.35, 0.30, 0.15, 0.20]
REGIONS = ["us", "eu", "latam", "apac", "mea"]
REGION_WEIGHTS = [0.35, 0.25, 0.15, 0.18, 0.07]

SAMPLE_INTERVAL_S = 30
BASE_DROP_PER_SAMPLE = 0.012


def slow_patch_bonus(episode_id: int, position: int) -> float:
    bonus = 0.0
    for ep, start, end, extra in SLOW_PATCHES:
        if ep == episode_id and start <= position <= end:
            bonus += extra
    return bonus


def gen_session(rng, user_id: int, episode_id: int, duration: int, start_ts: datetime):
    session_id = str(uuid.uuid4())
    device = rng.choice(DEVICES, p=DEVICE_WEIGHTS)
    region = rng.choice(REGIONS, p=REGION_WEIGHTS)

    rows = []
    position = 0
    ts = start_ts
    rows.append((user_id, session_id, CONTENT_ID, episode_id, "play", position, device, region, ts))

    while position < duration:
        position = min(position + SAMPLE_INTERVAL_S, duration)
        ts = ts + timedelta(seconds=SAMPLE_INTERVAL_S)

        drop_p = BASE_DROP_PER_SAMPLE + slow_patch_bonus(episode_id, position)
        if rng.random() < drop_p:
            rows.append((user_id, session_id, CONTENT_ID, episode_id, "drop_off", position, device, region, ts))
            return rows

        if rng.random() < 0.03:
            rows.append((user_id, session_id, CONTENT_ID, episode_id, "seek", position, device, region, ts))
        if rng.random() < 0.02:
            rows.append((user_id, session_id, CONTENT_ID, episode_id, "pause", position, device, region, ts))

    rows.append((user_id, session_id, CONTENT_ID, episode_id, "complete", duration, device, region, ts))
    return rows


def generate(num_users: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    base_ts = datetime(2026, 6, 1)
    all_rows = []

    for user_id in range(1, num_users + 1):
        episodes_watched = rng.integers(1, len(EPISODES) + 1)
        start_ts = base_ts + timedelta(minutes=int(rng.integers(0, 60 * 24 * 21)))
        for episode_id in range(1, episodes_watched + 1):
            duration = EPISODES[episode_id]
            all_rows.extend(gen_session(rng, user_id, episode_id, duration, start_ts))
            start_ts = start_ts + timedelta(days=1, minutes=int(rng.integers(-30, 30)))

    df = pd.DataFrame(
        all_rows,
        columns=[
            "user_id", "session_id", "content_id", "episode_id", "event_type",
            "position_seconds", "device", "region", "event_ts",
        ],
    )
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=50_000)
    parser.add_argument("--out", type=str, default="data/viewing_events.parquet")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = generate(args.users, args.seed)
    df.to_parquet(args.out, index=False)
    print(f"Wrote {len(df):,} events for {args.users:,} users to {args.out}")


if __name__ == "__main__":
    main()
