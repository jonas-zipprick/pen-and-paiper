from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from datetime import datetime
import json
from typing import List, Dict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Store transcriptions in memory (you might want to use a database in production)
transcriptions: List[Dict] = []

@app.post("/transcriptions")
async def receive_transcriptions(request: Request):
    """Receive transcriptions from the main server."""
    try:
        data = await request.json()
        timestamp = data.get("timestamp")
        duration = data.get("duration")
        combined_text = data.get("words_spoken", "")
        words = data.get("words", [])
        segment_count = data.get("segment_count", 0)
        
        # Create a transcription entry
        transcription = {
            "received_at": datetime.now().isoformat(),
            "batch_timestamp": timestamp,
            "batch_duration": duration,
            "text": combined_text,
            "words": words,
            "segment_count": segment_count
        }
        
        # Add to our storage
        transcriptions.append(transcription)
        
        # Log the received transcription
        logger.info(f"Received transcription of {len(combined_text)} characters from {segment_count} segments")
        logger.info(f"Text: {combined_text}")
        
        return {"status": "success", "received": True}
    
    except Exception as e:
        logger.error(f"Error processing transcription: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/", response_class=HTMLResponse)
async def get_transcriptions():
    """Display all received transcriptions in a web page."""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Transcription Receiver</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .transcription {
                margin: 10px 0;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #fafafa;
            }
            .timestamp {
                color: #666;
                font-size: 0.8em;
            }
            .text {
                margin: 5px 0;
                font-size: 1.1em;
                line-height: 1.4;
            }
            .words {
                font-size: 0.9em;
                color: #444;
                margin-top: 10px;
            }
            .word {
                display: inline-block;
                margin: 0 2px;
                padding: 2px 4px;
                border-radius: 3px;
                background-color: #e3f2fd;
            }
            .metadata {
                font-size: 0.8em;
                color: #666;
                margin-top: 5px;
            }
            h1 {
                color: #333;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Received Transcriptions</h1>
            <div id="transcriptions">
    """
    
    # Add each transcription to the HTML
    for trans in reversed(transcriptions):  # Show newest first
        html_content += f"""
            <div class="transcription">
                <div class="timestamp">Received at: {trans.get('received_at', 'N/A')}</div>
                <div class="text">{trans.get('text', '')}</div>
                <div class="metadata">
                    Duration: {trans.get('batch_duration', 0):.1f}s | 
                    Segments: {trans.get('segment_count', 0)}
                </div>
                <div class="words">
        """
        
        # Add words with timestamps
        for word in trans.get('words', []):
            html_content += f"""
                <span class="word" title="{word.get('start', 0):.2f}s - {word.get('end', 0):.2f}s">
                    {word.get('word', '')}
                </span>
            """
        
        html_content += """
                </div>
            </div>
        """
    
    html_content += """
            </div>
        </div>
        <script>
            // Auto-refresh the page every 30 seconds
            setTimeout(() => {
                window.location.reload();
            }, 30000);
        </script>
    </body>
    </html>
    """
    
    return html_content

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "transcriptions_received": len(transcriptions)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 