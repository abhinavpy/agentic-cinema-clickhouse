"""Cutting Room Copilot: an audience-analytics agent on Gemini Enterprise
Agent Platform, grounded in ClickHouse Cloud via the official mcp-clickhouse
MCP server.

Note: we don't hand Gemini a live `mcp.ClientSession` as a tool (the pattern
shown in the SDK docs). That object holds live asyncio Futures, and this SDK
version deep-copies GenerateContentConfig on every generate_content call
(google/genai/models.py, `config.model_copy(deep=True)`), which crashes on
non-picklable objects. Instead we pull static tool schemas from the MCP
server once, hand Gemini plain FunctionDeclarations, and drive the
call -> execute -> respond loop ourselves.
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
MAX_TOOL_TURNS = 4  # if not converged by here, the next turn is forced text-only


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


async def _mcp_function_declarations(session: ClientSession) -> list[types.FunctionDeclaration]:
    listed = await session.list_tools()
    return [
        types.FunctionDeclaration(
            name=t.name,
            description=t.description or "",
            parameters_json_schema=t.inputSchema,
        )
        for t in listed.tools
    ]


def _extract_text(content_blocks) -> str:
    return "".join(getattr(c, "text", "") for c in content_blocks)


def _response_text(response: types.GenerateContentResponse) -> str:
    # response.text (the SDK convenience property) returns None whenever a
    # candidate mixes text with any non-text part, which happens often here
    # since a turn can carry both a function_call and reasoning text. Extract
    # and join text parts ourselves instead of relying on it.
    if not response.candidates:
        return ""
    parts = response.candidates[0].content.parts or []
    return "".join(part.text for part in parts if part.text)


async def ask(user_prompt: str) -> str:
    client = genai.Client(
        enterprise=True,
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
    )

    async with stdio_client(_clickhouse_server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            clickhouse_tool = types.Tool(
                function_declarations=await _mcp_function_declarations(session)
            )

            contents: list[types.Content] = [
                types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])
            ]
            evidence_log: list[str] = []

            for _ in range(MAX_TOOL_TURNS):
                response = await client.aio.models.generate_content(
                    model=MODEL,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        temperature=0,
                        tools=[clickhouse_tool],
                    ),
                )

                candidate_content = response.candidates[0].content
                contents.append(candidate_content)

                function_calls = [
                    part.function_call for part in candidate_content.parts if part.function_call
                ]
                if not function_calls:
                    text = _response_text(response)
                    if text:
                        return text
                    break

                response_parts = []
                for fc in function_calls:
                    result = await session.call_tool(fc.name, dict(fc.args or {}))
                    result_text = _extract_text(result.content)
                    evidence_log.append(f"Query: {fc.name}({dict(fc.args or {})})\nResult: {result_text}")
                    response_parts.append(
                        types.Part.from_function_response(
                            name=fc.name,
                            response={"result": result_text},
                        )
                    )
                contents.append(types.Content(role="tool", parts=response_parts))

            # Didn't converge on its own -- ask again with a clean, tool-free
            # turn so the API can't keep echoing prior function calls.
            summary_prompt = (
                f"Original question: {user_prompt}\n\n"
                "You already ran these ClickHouse queries and got these results:\n\n"
                + "\n\n".join(evidence_log)
                + "\n\nBased only on this data, give your final answer now: name the "
                "exact episode and timestamp range where drop-off spikes, cite the "
                "numbers, and give one concrete recommendation for editorial."
            )
            final_response = await client.aio.models.generate_content(
                model=MODEL,
                contents=summary_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0,
                ),
            )
            return _response_text(final_response) or (
                "I gathered data but couldn't produce a final answer. "
                "Evidence collected:\n\n" + "\n\n".join(evidence_log)
            )


if __name__ == "__main__":
    import asyncio

    question = "Where do viewers drop off in episode 3, and what should editorial do about it?"
    print(asyncio.run(ask(question)))
