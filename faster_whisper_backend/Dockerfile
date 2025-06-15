FROM nvidia/cuda:12.3.2-cudnn9-devel-ubuntu22.04

WORKDIR /app

# Install pip and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install setuptools first
RUN pip3 install --no-cache-dir setuptools

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install PyTorch and other requirements in a single layer
RUN pip3 install --no-cache-dir \
    torch==2.2.0 torchvision==0.17.0 torchaudio==2.2.0 --index-url https://download.pytorch.org/whl/cu121 \
    -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV DEVICE=cuda
ENV COMPUTE_TYPE=float16
ENV WHISPER_MODEL_PATH=./whisper_models
ENV WEBSOCKET_URL=ws://localhost:8000/listen

# Expose ports
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 