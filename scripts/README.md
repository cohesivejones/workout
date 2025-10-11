# Linux Startup Scripts for Workout App

This directory contains scripts to automatically run the deploy script on Linux system startup.

## Quick Setup

```bash
# Run as root to install the service (detects current user automatically)
sudo ./scripts/setup-startup-systemd.sh
```

## How It Works

The setup script automatically detects:

- Current user (from `$SUDO_USER` when run with sudo)
- User's group
- User's home directory
- Current working directory
- User's PATH (including nvm, system paths, etc.)

It then generates a systemd service file from the template with these values.

## Files

- `deploy.sh` - Main deployment script
- `workout-deploy.service.template` - Template for systemd service file
- `setup-startup-systemd.sh` - Generates service file and installs it
- `setup-startup-cron.sh` - Alternative cron-based setup
- `workout-deploy.service` - Generated service file (created by setup script)

## Managing the Service

```bash
# Check status
sudo systemctl status workout-deploy.service

# View logs
sudo journalctl -u workout-deploy.service

# Manually run
sudo systemctl start workout-deploy.service

# Disable startup
sudo systemctl disable workout-deploy.service
```

## Template Variables

The service template uses these variables:

- `{{USER}}` - Current user
- `{{GROUP}}` - User's primary group
- `{{WORKING_DIR}}` - Project directory
- `{{PATH}}` - User's complete PATH
- `{{HOME}}` - User's home directory

This makes the setup portable across different users and systems.
