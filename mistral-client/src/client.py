#!/usr/bin/env python3
import asyncio
import os
import json
import time

from mistralai import Mistral
from mistralai.extra.run.context import RunContext
from mistralai.extra.mcp.sse import MCPClientSSE, SSEServerParams
from mistralai.types import BaseModel

from pathlib import Path
from fastapi import BackgroundTasks, FastAPI

MODEL = "mistral-small-2503"
server_url = "https://mcp.semgrep.ai/sse"
api_key = os.environ["MISTRAL_API_KEY"]

class Talk(BaseModel):
    words_spoken: str

class DmTip(BaseModel):
    summaryOfWhatWasSaid: str
    whatCouldHappenNext: str
    readThisTextToYourPlayers: str
    relatedGameRule: str

client = Mistral(api_key)
agent = client.beta.agents.create(
    model=MODEL,
    description="Assists the Dungeon Master in a Dungeons and Dragons game",
    name="Dungeon Master Assistant"
)
mcp_client = MCPClientSSE(sse_params=SSEServerParams(url=server_url, timeout=100))
async def setup_run_ctx():
    conversation_id = client.beta.conversations.start(
        agent_id=agent.id,
        inputs="Give Tips to the Dungeon Master of this Dungeons and Dragons game",
    ).conversation_id
    ctx = RunContext(
        conversation_id=conversation_id,
        agent_id=agent.id,
        output_format=DmTip,
        continue_on_fn_error=True,
    )
    await ctx.register_mcp_client(mcp_client=mcp_client)
    return ctx

run_ctx_co = setup_run_ctx()
run_ctx = None

unprocessed_talk = ''
is_running = False
async def process_talk():
    global is_running
    global unprocessed_talk
    if is_running:
        return
    is_running = True
    while True:
        if unprocessed_talk == '':
            await asyncio.sleep(0.1)
            continue
        this_talk = unprocessed_talk
        unprocessed_talk = ''
        print('next tip')
        print(this_talk)
        global run_ctx
        if run_ctx is None:
            run_ctx = await run_ctx_co
        res = await client.beta.conversations.run_async(
            run_ctx=run_ctx,
            inputs="Someone people in the group say: " + this_talk,
        )
        # Print the results
        for entry in res.output_entries:
            content = json.loads(entry.content)
            print("content:")
            print("Read this text: " + content['readThisTextToYourPlayers'])
            print("Related Rule: " + content['relatedGameRule'])
            print("What could happen Next: " + content['whatCouldHappenNext'])
            print("Summary of what was said: " + content['summaryOfWhatWasSaid'])

app = FastAPI()

@app.post("/")
async def post_talk(talk: Talk, background_tasks: BackgroundTasks):
    global unprocessed_talk
    unprocessed_talk += '\n' + talk.words_spoken
    if not is_running:
        background_tasks.add_task(process_talk)
    return {"message": "Notification sent in the background"}

@app.get('/')
def health_check():
    return {}
