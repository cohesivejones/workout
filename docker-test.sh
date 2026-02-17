#!/bin/bash

# Quick script to test Docker build locally

set -e

echo "======================================"
echo "Docker Build & Test Script"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "Creating .env file from .env.docker..."
  cp .env.docker .env
  echo "✅ .env created"
else
  echo "✅ .env already exists"
fi

echo ""
echo "Building Docker image..."
docker build -t workout-app .

echo ""
echo "======================================"
echo "Build complete! Ready to run."
echo "======================================"
echo ""
echo "To start the container:"
echo "  docker run -d --name workout-app -p 3000:3000 -v workout-db:/var/lib/postgresql/data --env-file .env workout-app"
echo ""
echo "To view logs:"
echo "  docker logs workout-app -f"
echo ""
echo "To stop:"
echo "  docker stop workout-app && docker rm workout-app"
echo ""
echo "Test in browser: http://localhost:3000"
echo ""
