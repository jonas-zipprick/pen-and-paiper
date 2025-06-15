#!/usr/bin/env python3
import asyncio
import os
import json
import time
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form

from mistralai import Mistral
from mistralai.extra.run.context import RunContext
from mistralai.extra.mcp.sse import MCPClientSSE, SSEServerParams
from mistralai.types import BaseModel

from extract_text import process_pdf_bytes, list_chroma_collections, query_collection

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

class RaQuery(BaseModel):
    query: str

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
        to-the-point so that they can be read by the Game Master on the fly.
        However, if you have relevant information and you are confident about
        that it is correct, don't hesitate to include it.
        while he is doing other things.

        Use markdown to format your tips.

        Don't just base your tip on the last 10 seconds of what was being said,
        but instead think about the big picture of the conversation (the last 1
        to 10 minutes of talk).

        Every 10 seconds, I will send you what the people in the room have said,
        as they play the game.
        This is what I call "first prompt".
        Your response to this first prompt has to be query to a vector database
        that contains background information about the current game like rule books,
        adventure books, player character-sheets.
        I will then query that information for you and give it to you in a second prompt.
        Your response to that second prompt should be the actual tip and have
        the following content (square brackets must be replaced by you with
        actual content):

        1) "readThisTextToYourPlayers":
            This is supposed to contain a text that the Dungeon Master can read to
            his players if he is out of ideas of what to say.
            Example: "
            As you investigate the room you find a **dead body** behind a drawer.
            As you open the drawer, you freeze in fear as you spot his **lifeless hand** falling towards you
            "
        2) "relatedGameRule":
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
        3) "whatCouldHappenNext":
            Ideas for the Dungeon Master of what could happen next, based on the adventure that the players have been playing so far.
            Cite relevant page numbers from the adventure book.
            Example: "
            The dead man is the famous vampire from Netherwinter called **"Count Dragu"**.
            He is **only playing dead**. Once the players leave the room again, he will follow them.

            >  [insert short quote from adventure book here, like: Count Dragu is a vampire from Netherwinter who...]
            (Adventure: Curse of Stradh p.120)
            "

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
        query_res = await client.beta.conversations.run_async(
            run_ctx=run_ctx,
            output_format=RaQuery,
            inputs='''First prompt, this was the talk:

            >>>
            {this_talk}
            <<<

            Please respond with the query now
            '''.format(this_talk=this_talk),
        )
        print(query_res)
        db_res = query_collection(collection_name, query_res.output_entries[0].content, int(n_results))
        print(db_res)
        tip_res = await client.beta.conversations.run_async(
            run_ctx=run_ctx,
            output_format=DmTip,
            inputs='''Second prompt, here is the information of the database: {db_res}

            Please respond with the tip now
            '''.format(db_res=db_res),
        )
        print('sending update')
        for entry in tip_res.output_entries:
            content = json.loads(entry.content)
            print(content)
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


@app.post("/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_name: str = Form(...)
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

@app.post("/query-text")
async def query_text(
    collection_name: str = Form(...),
    query: str = Form(...),
    n_results: int = Form(3)
):
    """Query a collection for relevant documents and return texts."""
    try:
        docs = query_collection(collection_name, query, int(n_results))
        return {"results": docs, "count": len(docs)}
    except Exception as e:
        return {"error": str(e)}

@app.get("/collections")
async def list_collections():
    """Return a list of all ChromaDB collections."""
    try:
        cols = list_chroma_collections()
        return {"collections": [c.name for c in cols]}
    except Exception as e:
        return {"error": str(e)}