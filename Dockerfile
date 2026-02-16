FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (including devDependencies for build)
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Build backend
RUN cd server && npm run build

# Production stage
FROM node:20-alpine

# Install PostgreSQL server, client, and su-exec for running as postgres user
RUN apk add --no-cache postgresql postgresql-contrib su-exec

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies
RUN npm ci --only=production
RUN cd server && npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy built backend from builder
COPY --from=builder /app/server/dist ./server/dist

# Copy server source files needed at runtime
COPY server/src/migrations ./server/src/migrations
COPY server/src/data-source.ts ./server/src/data-source.ts
COPY server/src/entities ./server/src/entities

# Copy the consolidated server.js (serves both frontend and backend)
COPY server.js ./server.js

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create PostgreSQL data and run directories
RUN mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql

# Create volume mount point for database persistence
VOLUME /var/lib/postgresql/data

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PGHOST=localhost
ENV PGPORT=5432

# Use entrypoint script to start PostgreSQL and app
ENTRYPOINT ["./docker-entrypoint.sh"]
