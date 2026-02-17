#!/bin/sh
set -e

echo "==================================="
echo "Workout App - Docker Entrypoint"
echo "==================================="

# Initialize PostgreSQL if data directory is empty
if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  echo "Initializing PostgreSQL database..."
  su-exec postgres initdb -D /var/lib/postgresql/data
  
  # Configure PostgreSQL to listen on localhost
  echo "host all all 127.0.0.1/32 trust" >> /var/lib/postgresql/data/pg_hba.conf
  echo "local all all trust" >> /var/lib/postgresql/data/pg_hba.conf
fi

# Start PostgreSQL in the background
echo "Starting PostgreSQL..."
su-exec postgres pg_ctl -D /var/lib/postgresql/data -o "-c logging_collector=off" start

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until su-exec postgres pg_isready -h localhost -p 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is ready!"

# Create database if it doesn't exist
echo "Ensuring database exists..."
DB_NAME="${PGDATABASE:-workout_production}"
su-exec postgres psql -h localhost -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" || su-exec postgres psql -h localhost -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Database $DB_NAME is ready!"

# Create user if needed (with password)
if [ -n "$PGUSER" ] && [ "$PGUSER" != "postgres" ]; then
  echo "Setting up user $PGUSER..."
  su-exec postgres psql -h localhost -d postgres -c "CREATE USER ${PGUSER} WITH PASSWORD '${PGPASSWORD}';" 2>/dev/null || echo "User already exists"
  su-exec postgres psql -h localhost -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${PGUSER};" 2>/dev/null || true
fi

# Run database migrations
echo "Running database migrations..."
cd /app/server
# Use compiled JavaScript for migrations in production
node ./node_modules/typeorm/cli.js migration:run -d dist/data-source.js

echo "Migrations completed successfully!"

# Start the application
echo "Starting workout application..."
cd /app/server
exec node dist/index.js
