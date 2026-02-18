# Docker Deployment Scripts

This directory contains scripts for Docker-based deployment of the Workout App.

## Quick Start

```bash
# Deploy or update the application
./scripts/deploy.sh

# Restart the container
./scripts/restart.sh
```

## Scripts Overview

### `deploy.sh` - Main Deployment Script

Pulls the latest Docker image and starts the container with proper configuration.

**Features:**
- Pulls latest Docker image
- Stops and removes old container
- Starts new container with persistent database
- Auto-restart on crashes
- Environment variable configuration

**Configuration:**

Set environment variables in a `.env` file in the project root:

```bash
# Required
JWT_SECRET=your-secret-here

# Optional (with auto-detection)
CORS_ORIGIN=http://your-server-ip:3000  # Auto-detected if not set
OPENAI_API_KEY=your-openai-key
PORT=3000
INTERNAL_PORT=5001
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=workout_production
FORCE_HTTPS=false
LOG_LEVEL=info
```

**Note:** The script will automatically detect your server's network IP address for `CORS_ORIGIN` if not explicitly set. This allows the app to be accessed from other devices on your network.

**Usage:**
```bash
./scripts/deploy.sh
```

The script will:
1. Load environment variables from `.env` (if exists)
2. Generate JWT_SECRET if not provided
3. Pull latest Docker image
4. Stop and remove old container
5. Start new container with configuration
6. Verify container is running

### `restart.sh` - Simple Restart

Restarts the existing Docker container without pulling a new image.

**Usage:**
```bash
./scripts/restart.sh
```

### Auto-start on Boot

Docker's built-in restart policy (`--restart unless-stopped`) is automatically configured in `deploy.sh`, so the container will restart when Docker starts.

To ensure Docker itself starts on boot:
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

## Docker Management Commands

```bash
# View logs
sudo docker logs -f workout-app

# Check status
sudo docker ps | grep workout-app

# Stop container
sudo docker stop workout-app

# Start container
sudo docker start workout-app

# Remove container (preserves database)
sudo docker rm -f workout-app

# Update to latest version
./scripts/deploy.sh
```

## Database Backup & Restore

```bash
# Backup database
sudo docker run --rm -v workout-db:/data -v $(pwd):/backup alpine \
  tar czf /backup/workout-db-backup-$(date +%Y%m%d).tar.gz /data

# Restore database
sudo docker run --rm -v workout-db:/data -v $(pwd):/backup alpine \
  tar xzf /backup/workout-db-backup-YYYYMMDD.tar.gz -C /
```

## Troubleshooting

**Container won't start:**
```bash
sudo docker logs workout-app
```

**Check environment variables:**
```bash
sudo docker inspect workout-app | grep -A 20 Env
```

**Force clean start:**
```bash
sudo docker stop workout-app
sudo docker rm workout-app
sudo docker volume rm workout-db  # Warning: This deletes all data!
./scripts/deploy.sh
```
