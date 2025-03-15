#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# 1. Kill all Node.js processes
echo "Killing all Node.js processes..."
killall node || echo "No Node.js processes were running."

# 2. Pull the latest code from git
echo "Pulling latest code from git..."
git pull

# 3. Install packages (this will also install server packages due to postinstall script)
echo "Installing packages..."
npm install

# 4. Run migrations
echo "Running database migrations..."
npm run db:migrate

# 5. Build the app (this will build both frontend and backend)
echo "Building the application..."
npm run build

# 6. Run the app (this will start both frontend and backend)
echo "Starting the application..."
npm start &

echo "Deployment completed successfully!"
