#!/bin/bash

# Script to set up the e2e test database
# This script starts the Docker test database and runs migrations

set -e

echo "🚀 Setting up e2e test database..."

# Start Docker test database
echo "📦 Starting Docker test database..."
npm run test:e2e:db:start

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is healthy
echo "🏥 Checking database health..."
docker-compose -f docker-compose.test.yml ps

# Run migrations
echo "🔄 Running database migrations..."
cd server && npm run db:migrate:test

echo "✅ E2E test database is ready!"
echo ""
echo "Next steps:"
echo "  1. Start the backend: cd server && npm run dev:test"
echo "  2. Start the frontend: npm run dev (in another terminal)"
echo "  3. Run e2e tests: npm run test:e2e (in another terminal)"
echo ""
echo "To stop the test database: npm run test:e2e:db:stop"
echo "To reset the test database: npm run test:e2e:db:reset"
