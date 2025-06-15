# Live Speech-to-Text API

A real-time speech-to-text transcription service using FastAPI, WebSocket, and Faster-Whisper. This service provides live transcription of audio streams with word-level timestamps.

You can deploy the whisper server on one server, and locally run test.html (add the correct werbsocket url) to communicate with it.

## Prerequisites

- Python 3.11+
- CUDA 12.x compatible GPU (for optimal performance)
- Docker (optional, for containerized deployment)

## Installation

### Local Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Create and activate a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
pip install torch==2.4.0 torchvision==0.19.0 torchaudio==2.4.0 --index-url https://download.pytorch.org/whl/cu124
```

### Docker Installation

1. Build the Docker image:
```bash
docker build -t whisper_backend .
#DOCKER_BUILDKIT=1 docker build -t whisper-backend .
```

```bash
```

2. Run the container:

For Windows (PowerShell):
```bash
docker run --gpus all --ipc=host --ulimit memlock=-1 --ulimit stack=67108864 -p 8000:8000 -v ${PWD}/whisper_models:/app/whisper_models whisper_backend
```

For Linux:
```bash
docker run --gpus all --ipc=host --ulimit memlock=-1 --ulimit stack=67108864 -p 8000:8000 -v $(pwd)/whisper_models:/app/whisper_models whisper_backend
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
WEBSOCKET_URL=ws://your_server_ip:8000/listen

# Model Configuration
WHISPER_MODEL_PATH=./whisper_models
```

## Usage

1. Start the server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

2. Open the web interface:
```
http://localhost:8000
```

3. Click "Start Recording" to begin transcription.

## API Endpoints

- `GET /`: Web interface for testing
- `WebSocket /listen`: WebSocket endpoint for real-time audio streaming and transcription
- `GET /health`: Health check endpoint

## Development

The project structure:
```
.
├── app/
│   ├── main.py           # FastAPI application
│   └── static/
│       └── index.html    # Web interface
├── whisper_models/       # Directory for Whisper models
├── requirements.txt      # Python dependencies
├── Dockerfile           # Docker configuration
└── .env                 # Environment variables
```