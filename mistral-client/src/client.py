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
    readThisTextToYourPlayers: str
    relatedGameRule: str
    whatCouldHappenNext: str

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
        inputs= '''
        You are an assistant to a Dungeon Master of a Dungeons and Dragons 5E Game.
        In the following messages I will send you what the people in the room
        are saying as they play the game.
        Your job is to give tips to the game master that have the following content:

        1) "readThisTextToYourPlayers":
            This is supposed to contain a text that the Dungeon Master can read to
            his players if he is out of ideas of what to say.
            For example: "As you investigate the room you find a dead body behind a drawer.
            As you open the drawer, you freeze in fear as you spot his lifeless hand falling towards you"
        2) "relatedGameRule":
            A quote from the rule-book or adventure-book that is relevant to the current situation.
            For example: "Player must win a DC 15 constitution safe throw or be paralyzed by fear (DnD 5e core rules p. 34)"
        3) "whatCouldHappenNext":
            Ideas for the Dungeon Master of what could happen next.
            Example: "The dead man is the famous vampire from Netherwinter called "Count Dragu" (Adventure: Curse of Stradh p.120). He is only playing dead. Once the players leave the room again, he will follow them"
        '''
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
            inputs='''Now, Someone people in the group say this:
            <<<
            {talk}
            >>>
            '''.format(talk=this_talk)
        )
        print('sending update')
        print(res)
        for entry in res.output_entries:
            content = json.loads(entry.content)
            await manager.broadcast("content:")
            await manager.broadcast("Read this text: " + content['readThisTextToYourPlayers'])
            await manager.broadcast("Related Rule: " + content['relatedGameRule'])
            await manager.broadcast("What could happen Next: " + content['whatCouldHappenNext'])

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
        manager.disconnect(websocket)
