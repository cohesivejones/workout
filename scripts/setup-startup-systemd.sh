#!/bin/bash

# Setup script to install the workout deploy service for startup

set -e

SERVICE_NAME="workout-deploy.service"
TEMPLATE_FILE="$(dirname "$0")/workout-deploy.service.template"
SERVICE_FILE="$(dirname "$0")/$SERVICE_NAME"
SYSTEMD_DIR="/etc/systemd/system"

echo "Setting up $SERVICE_NAME for startup..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script needs to be run as root (use sudo)"
    exit 1
fi

# Get current user info (the user who ran sudo)
CURRENT_USER="${SUDO_USER:-$(whoami)}"
CURRENT_GROUP=$(id -gn "$CURRENT_USER")
CURRENT_HOME=$(eval echo "~$CURRENT_USER")
WORKING_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Detected user: $CURRENT_USER"
echo "Detected group: $CURRENT_GROUP"
echo "Detected home: $CURRENT_HOME"
echo "Working directory: $WORKING_DIR"

# Get the user's PATH by running as that user
USER_PATH=$(sudo -u "$CURRENT_USER" bash -c 'echo $PATH')
echo "User's PATH: $USER_PATH"

# Generate service file from template
echo "Generating service file from template..."
sed -e "s|{{USER}}|$CURRENT_USER|g" \
    -e "s|{{GROUP}}|$CURRENT_GROUP|g" \
    -e "s|{{WORKING_DIR}}|$WORKING_DIR|g" \
    -e "s|{{PATH}}|$USER_PATH|g" \
    -e "s|{{HOME}}|$CURRENT_HOME|g" \
    "$TEMPLATE_FILE" > "$SERVICE_FILE"

# Copy generated service file to systemd directory
echo "Copying generated service file to $SYSTEMD_DIR..."
cp "$SERVICE_FILE" "$SYSTEMD_DIR/"

# Set proper permissions
chmod 644 "$SYSTEMD_DIR/$SERVICE_NAME"

# Reload systemd daemon
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service to start on boot
echo "Enabling service for startup..."
systemctl enable "$SERVICE_NAME"

echo "Service setup complete!"
echo ""
echo "To manually run the service: sudo systemctl start $SERVICE_NAME"
echo "To check service status: sudo systemctl status $SERVICE_NAME"
echo "To view service logs: sudo journalctl -u $SERVICE_NAME"
echo "To disable startup: sudo systemctl disable $SERVICE_NAME"
