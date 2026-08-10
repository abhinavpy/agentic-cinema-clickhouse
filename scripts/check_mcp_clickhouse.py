"""Exercise the mcp-clickhouse MCP server directly, with no Gemini call
involved. Confirms the ClickHouse half of the integration works on its own,
independent of Agent Platform billing/API status.

Usage: python scripts/check_mcp_clickhouse.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from mcp import ClientSession
from mcp.client.stdio import stdio_client

from agentic_cinema.agent import _clickhouse_server_params


async def main():
    async with stdio_client(_clickhouse_server_params()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("Available MCP tools:", [t.name for t in tools.tools])

            result = await session.call_tool(
                "run_query",
                {
                    "query": (
                        "SELECT episode_id, count() AS drop_offs "
                        "FROM agentic_cinema.viewing_events "
                        "WHERE event_type = 'drop_off' "
                        "GROUP BY episode_id ORDER BY episode_id"
                    )
                },
            )
            print("\nDrop-offs per episode:")
            for content in result.content:
                print(content.text if hasattr(content, "text") else content)


if __name__ == "__main__":
    asyncio.run(main())
