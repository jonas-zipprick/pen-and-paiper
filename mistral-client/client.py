#!/usr/bin/env python3
import asyncio
import os
import json

from mistralai import Mistral
from mistralai.extra.run.context import RunContext
from mistralai.extra.mcp.sse import MCPClientSSE, SSEServerParams
from mistralai.types import BaseModel

from pathlib import Path

MODEL = "mistral-small-2503"
server_url = "https://mcp.semgrep.ai/sse"

async def main():
    # Initialize the Mistral client with your API key
    api_key = os.environ["MISTRAL_API_KEY"]
    client = Mistral(api_key)
    # Define the URL for the remote MCP server
    mcp_client = MCPClientSSE(sse_params=SSEServerParams(url=server_url, timeout=100))

    agent = client.beta.agents.create(
        model=MODEL,
        description="Assists the Dungeon Master in a Dungeons and Dragons game",
        name="Dungeon Master Assistant"
    )

    class DmTipp(BaseModel):
        whatCouldHappenNext: str
        readThisText: str
        relatedGameRule: str

    async with RunContext(
        agent_id=agent.id,
        output_format=DmTipp,
        continue_on_fn_error=True,
    ) as run_ctx:
        # Create and register an MCP client with the run context
        mcp_client = MCPClientSSE(sse_params=SSEServerParams(url=server_url, timeout=100))
        await run_ctx.register_mcp_client(mcp_client=mcp_client)
        res = await client.beta.conversations.run_async(
            run_ctx=run_ctx,
            inputs="Give Tipps to the Dungeon Master of this Dungeons and Dragons game",
        )
        # Print the results
        for entry in res.output_entries:
            content = json.loads(entry.content)
            print("Read this text: " + content['readThisText'])
            print("Related Rule: " + content['relatedGameRule'])
            print("What could happen Next: " + content['whatCouldHappenNext'])

if __name__ == "__main__":
    asyncio.run(main())
