#!/bin/bash

# Exit on error
set -e

echo "Restarting app process..."

# 1. Kill all Node.js processes
echo "Killing all Node.js processes..."
killall node || echo "No Node.js processes were running."

# 2. Build the app (this will build both frontend and backend)
echo "Building the application..."
npm run build

# 3. Run the app (this will start both frontend and backend)
echo "Starting the application..."
nohup npm start > /dev/null 2>&1 &

echo "Restarted app successfully!"
