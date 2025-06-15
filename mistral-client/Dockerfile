FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PYTHONPATH=/app:/app/src

EXPOSE 8000

CMD ["uvicorn", "src.client:app", "--host", "0.0.0.0", "--port", "8000"]
#docker run --gpus all -p 8000:8000 -v "${PWD}/chroma_db:/app/mistral_client/chroma_db" --env-file .env mistral_client