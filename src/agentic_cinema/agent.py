"""Cutting Room Copilot: an audience-analytics agent on Gemini Enterprise
Agent Platform, grounded in ClickHouse Cloud via the official mcp-clickhouse
MCP server, with code execution for deriving stats/charts from query results.
"""
import os
import shutil
import sys

from dotenv import load_dotenv
from google import genai
from google.genai import types
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

load_dotenv()

SYSTEM_INSTRUCTION = """\
You are an audience analytics copilot for a streaming studio's editorial team.
You have access to a ClickHouse database (agentic_cinema.viewing_events) via
MCP tools, and a code execution tool for computing derived stats or charts.

Rules:
- Only ever run read-only SELECT queries.
- Ground every claim in an actual query result; state the row counts behind it.
- When you find a drop-off pattern, name the exact episode and timestamp range,
  and give one concrete, actionable recommendation for editorial (e.g. trim,
  reorder, or recut a scene).
"""

MODEL = "gemini-3.5-flash"


def _clickhouse_command() -> str:
    # Prefer the console script installed alongside this interpreter (venv),
    # fall back to whatever's on PATH.
    venv_bin = os.path.join(os.path.dirname(sys.executable), "mcp-clickhouse")
    if os.path.exists(venv_bin):
        return venv_bin
    found = shutil.which("mcp-clickhouse")
    if found:
        return found
    raise RuntimeError("mcp-clickhouse not found; pip install -r requirements.txt")


def _clickhouse_server_params() -> StdioServerParameters:
    return StdioServerParameters(
        command=_clickhouse_command(),
        args=[],
        env={
            "CLICKHOUSE_HOST": os.environ["CLICKHOUSE_HOST"],
            "CLICKHOUSE_PORT": os.environ.get("CLICKHOUSE_PORT", "8443"),
            "CLICKHOUSE_USER": os.environ.get("CLICKHOUSE_USER", "default"),
            "CLICKHOUSE_PASSWORD": os.environ["CLICKHOUSE_PASSWORD"],
            "CLICKHOUSE_SECURE": os.environ.get("CLICKHOUSE_SECURE", "true"),
        },
    )


async def ask(user_prompt: str) -> str:
    client = genai.Client(
        enterprise=True,
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
    )

    code_execution_tool = types.Tool(code_execution=types.ToolCodeExecution())

    async with stdio_client(_clickhouse_server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            response = await client.aio.models.generate_content(
                model=MODEL,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=[session, code_execution_tool],
                    temperature=0,
                ),
            )
            return response.text


if __name__ == "__main__":
    import asyncio

    question = "Where do viewers drop off in episode 3, and what should editorial do about it?"
    print(asyncio.run(ask(question)))
