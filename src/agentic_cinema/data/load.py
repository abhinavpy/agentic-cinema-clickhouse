"""Create the ClickHouse Cloud schema and bulk-load synthetic viewing events.

Usage:
    python -m agentic_cinema.data.load --parquet data/viewing_events.parquet
"""
import argparse
import os
from pathlib import Path

import clickhouse_connect
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_client():
    return clickhouse_connect.get_client(
        host=os.environ["CLICKHOUSE_HOST"],
        port=int(os.environ.get("CLICKHOUSE_PORT", 8443)),
        username=os.environ.get("CLICKHOUSE_USER", "default"),
        password=os.environ["CLICKHOUSE_PASSWORD"],
        secure=os.environ.get("CLICKHOUSE_SECURE", "true").lower() == "true",
    )


def apply_schema(client):
    statements = SCHEMA_PATH.read_text().split(";")
    for stmt in statements:
        stmt = stmt.strip()
        if stmt:
            client.command(stmt)


def load(parquet_path: str, chunk_size: int = 200_000):
    client = get_client()
    apply_schema(client)

    df = pd.read_parquet(parquet_path)
    total = len(df)
    for start in range(0, total, chunk_size):
        chunk = df.iloc[start : start + chunk_size]
        client.insert_df("agentic_cinema.viewing_events", chunk)
        print(f"Loaded {min(start + chunk_size, total):,}/{total:,} rows")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parquet", type=str, default="data/viewing_events.parquet")
    args = parser.parse_args()
    load(args.parquet)


if __name__ == "__main__":
    main()
