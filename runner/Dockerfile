# CodeLab Runner Agent Dockerfile (ARM64 & x86_64)
FROM python:3.12-alpine

WORKDIR /app

# Instalar Docker CLI client (para interactuar con /var/run/docker.sock)
RUN apk add --no-cache docker-cli

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PYTHONUNBUFFERED=1

CMD ["python", "src/daemon.py"]

