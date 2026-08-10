"""Quick connectivity smoke test for ClickHouse Cloud.

Usage: python scripts/check_clickhouse_connection.py
"""
import os
import sys

import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

required = ["CLICKHOUSE_HOST", "CLICKHOUSE_PASSWORD"]
missing = [k for k in required if not os.environ.get(k)]
if missing:
    print(f"Missing env vars: {missing}. Fill them in .env first.")
    sys.exit(1)

client = clickhouse_connect.get_client(
    host=os.environ["CLICKHOUSE_HOST"],
    port=int(os.environ.get("CLICKHOUSE_PORT", 8443)),
    username=os.environ.get("CLICKHOUSE_USER", "default"),
    password=os.environ["CLICKHOUSE_PASSWORD"],
    secure=os.environ.get("CLICKHOUSE_SECURE", "true").lower() == "true",
)

print("Ping:", client.ping())
print("Server version:", client.server_version)
print("Databases:", client.query("SHOW DATABASES").result_rows)
