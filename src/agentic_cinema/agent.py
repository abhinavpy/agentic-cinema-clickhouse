"""Cutting Room Copilot: an audience-analytics agent built on Google's Agent
Development Kit (ADK), powered by Gemini Enterprise Agent Platform, grounded
in ClickHouse Cloud via the official mcp-clickhouse MCP server.

ADK's LlmAgent + McpToolset handle the tool-calling loop (query -> execute ->
respond -> repeat until a final answer) natively, so we don't hand-roll it.
"""
import os
import shutil
import sys
import uuid

from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
from google.genai import types
from mcp import StdioServerParameters

load_dotenv()

SYSTEM_INSTRUCTION = """\
You are an audience analytics copilot for a streaming studio's editorial team.
You have access to a ClickHouse database (agentic_cinema.viewing_events) via
MCP tools.

Rules:
- Only ever run read-only SELECT queries.
- Ground every claim in an actual query result; state the row counts behind it.
- Be efficient: 2-3 queries should be enough to find a pattern. Start broad
  (aggregate drop-offs per episode), then narrow into the specific episode
  and time window, then stop and answer.
- When you find a drop-off pattern, name the exact episode and timestamp range,
  and give one concrete, actionable recommendation for editorial (e.g. trim,
  reorder, or recut a scene).
"""

MODEL = "gemini-3.5-flash"
APP_NAME = "cutting-room-copilot"


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


def _clickhouse_connection_params() -> StdioConnectionParams:
    return StdioConnectionParams(
        server_params=StdioServerParameters(
            command=_clickhouse_command(),
            args=[],
            env={
                "CLICKHOUSE_HOST": os.environ["CLICKHOUSE_HOST"],
                "CLICKHOUSE_PORT": os.environ.get("CLICKHOUSE_PORT", "8443"),
                "CLICKHOUSE_USER": os.environ.get("CLICKHOUSE_USER", "default"),
                "CLICKHOUSE_PASSWORD": os.environ["CLICKHOUSE_PASSWORD"],
                "CLICKHOUSE_SECURE": os.environ.get("CLICKHOUSE_SECURE", "true"),
            },
        ),
        timeout=60,
    )


def _build_agent() -> LlmAgent:
    clickhouse_toolset = McpToolset(connection_params=_clickhouse_connection_params())
    return LlmAgent(
        name="cutting_room_copilot",
        model=MODEL,
        instruction=SYSTEM_INSTRUCTION,
        tools=[clickhouse_toolset],
    )


async def ask(user_prompt: str) -> str:
    agent = _build_agent()
    runner = InMemoryRunner(agent=agent, app_name=APP_NAME)
    user_id = "editorial"

    try:
        session = await runner.session_service.create_session(
            app_name=APP_NAME, user_id=user_id
        )

        final_text = ""
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=types.Content(
                role="user", parts=[types.Part.from_text(text=user_prompt)]
            ),
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_text = "".join(
                    part.text for part in event.content.parts if part.text
                )

        return final_text or "The agent finished without producing a final answer."
    finally:
        await runner.close()


if __name__ == "__main__":
    import asyncio

    question = "Where do viewers drop off in episode 3, and what should editorial do about it?"
    print(asyncio.run(ask(question)))
