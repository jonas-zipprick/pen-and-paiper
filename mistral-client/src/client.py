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
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()


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
summaryOfWhatWasSaid = ''
async def process_talk():
    global is_running
    global unprocessed_talk
    global summaryOfWhatWasSaid
    global run_ctx

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
        if run_ctx is None:
            run_ctx = await run_ctx_co
        res = await client.beta.conversations.run_async(
            run_ctx=run_ctx,
            inputs="So far this happened: " + summaryOfWhatWasSaid + "\nNow, Someone people in the group say: " + this_talk,
        )
        print('sending update')
        for entry in res.output_entries:
            content = json.loads(entry.content)
            await manager.broadcast("content:")
            await manager.broadcast("Read this text: " + content['readThisTextToYourPlayers'])
            await manager.broadcast("Related Rule: " + content['relatedGameRule'])
            await manager.broadcast("What could happen Next: " + content['whatCouldHappenNext'])
            summaryOfWhatWasSaid = content['summaryOfWhatWasSaid']
            await manager.broadcast("Summary of what was said: " + summaryOfWhatWasSaid)

app = FastAPI()

@app.post("/")
async def post_talk(talk: Talk, background_tasks: BackgroundTasks):
    global unprocessed_talk
    unprocessed_talk += '\n' + talk.words_spoken
    if not is_running:
        background_tasks.add_task(process_talk)
    return {"message": "Notification sent in the background"}

@app.get('/')
async def health_check():
    global run_ctx
    if run_ctx is None:
        run_ctx = await run_ctx_co
    return {"message": "OK"}

@app.websocket("/ws")
async def new_subscription(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, user)
