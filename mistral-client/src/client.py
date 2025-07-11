#!/usr/bin/env python3
import asyncio
import os
import json
import yaml
import time
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from mistralai import Mistral
from mistralai.extra.run.context import RunContext
from mistralai.types import BaseModel

from extract_pdf_text import process_pdf_bytes, list_chroma_collections, query_collection

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

client = Mistral(api_key)
agent = client.beta.agents.create(
    model=MODEL,
    description="Assists the Dungeon Master in a Dungeons and Dragons game",
    name="Dungeon Master Assistant"
)
async def setup_run_ctx():
    conversation_id = client.beta.conversations.start(
        agent_id=agent.id,
        inputs= '''
        You are an assistant to a Dungeon Master of a Dungeons and Dragons 5E Game.

        Your overall job is to respond with tips to the game master that he can
        use as he is leading the game.

        Remember that DnD games can be quite fast and chaotic, so keep the tips
        to-the-point so that they can be read by the Game Master on the fly while
		he is doing other things.

        Don't just base your tip on the last 10 seconds of what was being said,
        but instead think about the big picture of the conversation (the last 1
        to 10 minutes of talk).

        Every 10 seconds, I will send you what the people in the room have said,
        as they play the game.

        Your response to that prompt must be valid yaml and have
        the following properties (square brackets must be replaced by you with
        actual content):

        1st property "relatedGameRule":
            A quote from the rule-book or adventure-book that is relevant to the current situation.
            If multiple rules apply, list them all and order them by relevance.
            Also quote the original rule.
            Example: "
            1) Constitution Save

            Player must win a **DC 15 constitution saving throw* or be paralyzed by fear.

            > [insert short quote from the rulebook here, like: Constitution safe throw must be won every time ...]
            (DnD 5e core rules p. 34)


            2) Detect Undead

            Players who win a **DC 20 detect undead** notice that the dead man is actually **a vampire** that only pretends to be dead

            > [insert short quote from the rulebook here, like: Detect undead reveals an NPC to be ...]
            (DnD 5e core rules p. 99)
            "
        2nd property "readThisTextToYourPlayers":
            This is supposed to contain a text that the Dungeon Master can read to
            his players if he is out of ideas of what to say.
            Example: "
            As you investigate the room you find a **dead body** behind a drawer.
            As you open the drawer, you freeze in fear as you spot his **lifeless hand** falling towards you
            "

        3rd property "whatCouldHappenNext":
            Ideas for the Dungeon Master of what could happen next, based on the adventure that the players have been playing so far.
            Cite relevant page numbers from the adventure book.
            Example: "
            The dead man is the famous vampire from Netherwinter called **"Count Dragu"**.
            He is **only playing dead**. Once the players leave the room again, he will follow them.

            > [insert short quote from adventure book here, like: Count Dragu is a vampire from Netherwinter who...]
            (Adventure: Curse of Stradh p.120)

            "

        Inside of each property, use markdown to format the content.
        Don't wrap your response in "```yaml" "```" or other invalid yaml.

        That's all. Let's start.
        '''
    ).conversation_id
    ctx = RunContext(
        conversation_id=conversation_id,
        agent_id=agent.id,
        continue_on_fn_error=True,
    )
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
        events = await client.beta.conversations.run_stream_async(
            run_ctx=run_ctx,
            inputs=this_talk,
        )
        buffer = ''
        async for chunk in events:
            try:
                buffer += chunk.data.content
                tip = yaml.safe_load(buffer)
                await manager.broadcast(json.dumps({
                    'relatedGameRule': tip.get('relatedGameRule') or '',
                    'readThisTextToYourPlayers': tip.get('readThisTextToYourPlayers') or '',
                    'whatCouldHappenNext': tip.get('whatCouldHappenNext') or '',
                }))
            except (AttributeError, yaml.YAMLError) as err:
                pass

app = FastAPI(
	docs_url='/assistant/docs',
	openapi_url='/assistant/openapi.json',
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

@app.post("/assistant/")
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

@app.websocket("/assistant/ws")
async def new_subscription(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/assistant/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_name: str = Form(default="dnd-5e-core-rules")
):
    """Upload a PDF file and store its contents in ChromaDB asynchronously."""
    if not file.filename.lower().endswith('.pdf'):
        return {"error": "File must be a PDF"}
    content = await file.read()
    pdf_name = os.path.splitext(file.filename)[0]

    # Schedule background task
    background_tasks.add_task(process_pdf_bytes, content, pdf_name, collection_name)

    return {
        "message": "PDF received. Processing in background.",
        "pdf_name": pdf_name,
        "collection": collection_name
    }

@app.post("/assistant/query-text")
async def query_text(
    collection_name: str = Form(default="dnd-5e-core-rules"),
    query: str = Form(...),
    n_results: int = Form(default=3)
):
    """Query a collection for relevant documents and return texts."""
    try:
        docs = query_collection(collection_name, query, int(n_results))
        return {"results": docs, "count": len(docs)}
    except Exception as e:
        return {"error": str(e)}


@app.get("/assistant/collections")
async def list_collections():
    """Return a list of all ChromaDB collections."""
    try:
        cols = list_chroma_collections()
        return {"collections": [c.name for c in cols]}
    except Exception as e:
        return {"error": str(e)}
