#!/bin/bash

# Exit on error
set -e

echo "Starting RunPod setup..."

# Update package list
echo "Updating package list..."
apt-get update

# Install CUDA dependencies
echo "Installing CUDA dependencies..."
apt-get install -y \
    libcudnn9-cuda-12 \
    libcudnn9-dev-cuda-12

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Set up transcription receiver
echo "Setting up transcription receiver..."
cd transcription_receiver
pip install -r requirements.txt
cd ..

echo "Setup completed successfully!"
echo "To start the main server:"
echo "uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "To start the transcription receiver (in a separate terminal):"
echo "cd transcription_receiver"
echo "uvicorn app.main:app --host 0.0.0.0 --port 8002"
