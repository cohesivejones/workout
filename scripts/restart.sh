#!/bin/bash

# Exit on error
set -e

echo "Restarting Docker container..."

# Configuration
CONTAINER_NAME="workout-app"

# Check if container exists
if ! sudo docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container '$CONTAINER_NAME' does not exist."
    echo "Run ./scripts/deploy.sh to create and start the container."
    exit 1
fi

echo "Restarting container..."
sudo docker restart "$CONTAINER_NAME"

echo "Waiting for container to restart..."
sleep 3

echo "Checking container status..."
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ Container restarted successfully!"
    echo ""
    echo "View logs with: sudo docker logs -f $CONTAINER_NAME"
else
    echo "❌ Container failed to restart. Check logs with: sudo docker logs $CONTAINER_NAME"
    exit 1
fi
