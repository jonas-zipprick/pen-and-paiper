# Transcription Receiver

A FastAPI server that receives and displays transcriptions from the main speech-to-text service.

## Features

- Receives transcriptions via HTTP POST requests
- Displays transcriptions in a web interface
- Shows word-level timestamps
- Auto-refreshes the display every 30 seconds
- Health check endpoint

## Installation

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

Create a `.env` file with the following variables:
```env
PORT=8002  # The port to run the server on
```

## Usage

1. Start the server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8002
```

2. View the transcriptions:
```
http://localhost:8002
```

## API Endpoints

- `POST /transcriptions`: Receive transcriptions from the main server
- `GET /`: Web interface to view transcriptions
- `GET /health`: Health check endpoint

## Data Format

The server expects POST requests to `/transcriptions` with the following JSON format:
```json
{
    "timestamp": "2024-03-14T12:00:00",
    "duration": 60.0,
    "transcriptions": [
        {
            "text": "transcribed text",
            "words": [
                {
                    "word": "word",
                    "start": 0.0,
                    "end": 0.5
                }
            ]
        }
    ]
}
``` 