#!/bin/bash

# Add deploy script to crontab to run on reboot
# This will append to the current user's crontab

# Get the absolute path to the deploy script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy.sh"
LOG_FILE="/var/log/workout-deploy.log"

echo "Setting up deploy script to run on startup via cron..."

# Create log file if it doesn't exist and set permissions
sudo touch "$LOG_FILE"
sudo chown pepper:users "$LOG_FILE"

# Add to crontab if not already present
(crontab -l 2>/dev/null | grep -v "$DEPLOY_SCRIPT"; echo "@reboot $DEPLOY_SCRIPT >> $LOG_FILE 2>&1") | crontab -

echo "Deploy script added to crontab for startup execution"
echo "Logs will be written to $LOG_FILE"
echo ""
echo "To view current crontab: crontab -l"
echo "To remove from crontab: crontab -e (then delete the @reboot line)"
echo "To view logs: tail -f $LOG_FILE"
