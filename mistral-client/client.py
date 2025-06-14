#!/usr/bin/env python
import asyncio
import os

from mistralai import Mistral
from mistralai.extra.run.context import RunContext
from mistralai.extra.mcp.sse import MCPClientSSE, SSEServerParams
from pathlib import Path

# Set the current working directory and model to use
cwd = Path(__file__).parent
MODEL = "mistral-medium-latest"

async def main():
    # Initialize the Mistral client with your API key
    api_key = os.environ["MISTRAL_API_KEY"]
    client = Mistral(api_key)
