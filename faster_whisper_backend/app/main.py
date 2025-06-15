from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import asyncio
import logging
import torch
import io
import os
from dotenv import load_dotenv
import aiohttp
from datetime import datetime, timedelta
from typing import List, Dict

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)
# --- Your Model Loading Logic ---
MODEL_NAME = "distil-whisper/distil-large-v3.5-ct2"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16"
MODEL_PATH = os.getenv("WHISPER_MODEL_PATH", "./whisper_models")
TRANSCRIPTION_ENDPOINT = os.getenv("TRANSCRIPTION_ENDPOINT", "http://localhost:8002/transcriptions")

logger.info(f"Loading model '{MODEL_NAME}'...")
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE, download_root=MODEL_PATH)
logger.info("Model loaded successfully.")

# Global storage for transcriptions
transcription_buffer: List[Dict] = []
last_send_time = datetime.now()

async def send_transcriptions():
    """Send collected transcriptions to the endpoint."""
    global transcription_buffer, last_send_time
    
    while True:
        try:
            await asyncio.sleep(10)
            
            current_time = datetime.now()
            if not transcription_buffer:
                continue
                
            # Combine all transcriptions into a single text
            combined_text = " ".join(trans["text"] for trans in transcription_buffer)
            
            # Combine all words with their timestamps
            all_words = []
            for trans in transcription_buffer:
                all_words.extend(trans["words"])
            
            # Sort words by their start time
            all_words.sort(key=lambda x: x["start"])
            
            # Prepare the payload
            payload = {
                #"timestamp": current_time.isoformat(),
                #"duration": (current_time - last_send_time).total_seconds(),
                "words_spoken": combined_text,
                #"words": all_words,
                #"segment_count": len(transcription_buffer)
            }
            
            # Send to endpoint
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.post(TRANSCRIPTION_ENDPOINT, json=payload) as response:
                        if response.status == 200:
                            logger.info(f"Successfully sent combined transcription of {len(combined_text)} characters")
                            transcription_buffer = []  # Clear buffer after successful send
                            last_send_time = current_time
                        else:
                            logger.error(f"Failed to send transcriptions. Status: {response.status}")
                except Exception as e:
                    logger.error(f"Error sending transcriptions: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error in send_transcriptions task: {str(e)}")
            await asyncio.sleep(5)  # Wait a bit before retrying

@app.on_event("startup")
async def startup_event():
    """Start the background task when the application starts."""
    asyncio.create_task(send_transcriptions())

@app.websocket("/listen")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established.")
    
    try:
        while True:
            audio_file_chunk = await websocket.receive_bytes()
            logger.info(f"Received a complete audio file of {len(audio_file_chunk)} bytes.")

            try:
                segments, info = await asyncio.to_thread(
                    model.transcribe,
                    io.BytesIO(audio_file_chunk),
                    beam_size=5,
                    language="en",
                    vad_filter=True,
                    word_timestamps=True
                )
                
                results = []
                for segment in segments:
                    if segment.text.strip():
                        segment_data = {
                            "text": segment.text.strip(),
                            "words": [
                                {"word": word.word.strip(), "start": word.start, "end": word.end}
                                for word in segment.words
                            ]
                        }
                        results.append(segment_data)
                        # Add to global buffer
                        transcription_buffer.append(segment_data)
                
                if results:
                    logger.info(f"SUCCESS: Transcribed {info.duration:.2f}s of audio and sending results.")
                    await websocket.send_json({"type": "transcription", "segments": results})
                else:
                    logger.info("VAD filtered all audio, no speech detected in this chunk.")

            except Exception as e:
                logger.error(f"Transcription error on a chunk: {e}")

    except WebSocketDisconnect:
        logger.info("Client disconnected.")
    except Exception as e:
        logger.error(f"An unexpected websocket error occurred: {e}")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Serve the HTML interface
@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("app/static/index.html", "r") as f:
        html_content = f.read()
    
    # Replace the hardcoded WebSocket URL with the one from environment variables
    websocket_url = os.getenv("WEBSOCKET_URL", "ws://localhost:8000/listen")
    html_content = html_content.replace(
        'const WEBSOCKET_URL = \'ws://localhost:8000/listen\';',
        f'const WEBSOCKET_URL = \'{websocket_url}\';'
    )
    
    return html_content

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 