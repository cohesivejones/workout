#!/bin/bash

# Exit on error
set -e

echo "Starting Docker deployment process..."

# Configuration
CONTAINER_NAME="workout-app"
IMAGE_NAME="drnatejones/natetastic-adventures:workout-latest"
PORT="${PORT:-3000}"
INTERNAL_PORT="${INTERNAL_PORT:-5001}"

# Auto-detect network IP address for CORS_ORIGIN
if [ -z "$CORS_ORIGIN" ]; then
    # Get the primary network IP using ip route
    DETECTED_IP=$(ip route get 1 | awk '{print $7; exit}' 2>/dev/null)
    
    if [ -n "$DETECTED_IP" ]; then
        CORS_ORIGIN="http://$DETECTED_IP:$PORT"
        echo "Auto-detected CORS_ORIGIN: $CORS_ORIGIN"
    else
        CORS_ORIGIN="http://localhost:$PORT"
        echo "Warning: Could not detect network IP. Using localhost."
        echo "Set CORS_ORIGIN in .env file for network access."
    fi
fi

# Check if .env file exists for secrets
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Validate required environment variables
if [ -z "$JWT_SECRET" ]; then
    echo "Warning: JWT_SECRET not set. Generating a new one..."
    JWT_SECRET=$(openssl rand -base64 32)
fi

echo "Pulling latest Docker image..."
sudo docker pull "$IMAGE_NAME"

echo "Stopping existing container..."
sudo docker stop "$CONTAINER_NAME" 2>/dev/null || echo "No existing container to stop."

echo "Removing existing container..."
sudo docker rm "$CONTAINER_NAME" 2>/dev/null || echo "No existing container to remove."

echo "Starting new container..."
sudo docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT:$INTERNAL_PORT" \
  -v workout-db:/var/lib/postgresql/data \
  -e PORT="$INTERNAL_PORT" \
  -e PGUSER="${PGUSER:-postgres}" \
  -e PGPASSWORD="${PGPASSWORD:-postgres}" \
  -e PGDATABASE="${PGDATABASE:-workout_production}" \
  -e CORS_ORIGIN="$CORS_ORIGIN" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  -e FORCE_HTTPS="${FORCE_HTTPS:-false}" \
  -e LOG_LEVEL="${LOG_LEVEL:-info}" \
  "$IMAGE_NAME"

echo "Waiting for container to start..."
sleep 5

echo "Checking container status..."
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ Docker deployment completed successfully!"
    echo "Container: $CONTAINER_NAME"
    echo "Image: $IMAGE_NAME"
    echo "Port: http://localhost:$PORT"
    echo ""
    echo "View logs with: sudo docker logs -f $CONTAINER_NAME"
else
    echo "❌ Container failed to start. Check logs with: sudo docker logs $CONTAINER_NAME"
    exit 1
fi
