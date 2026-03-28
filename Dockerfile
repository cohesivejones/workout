FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files for both root and server
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies with cache mount (postinstall will handle server)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build && cd server && npm run build

# ==========================================
# Production stage
# ==========================================
FROM node:20-alpine

# Install PostgreSQL and su-exec
RUN apk add --no-cache postgresql postgresql-contrib su-exec

WORKDIR /app

# Copy package files for both root and server
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies with cache mount (postinstall will handle server)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Copy runtime files
COPY server/src/migrations ./server/src/migrations
COPY server/src/data-source.ts ./server/src/data-source.ts
COPY server/src/entities ./server/src/entities
COPY server.js ./server.js
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Setup permissions
RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql

# Volume for database
VOLUME /var/lib/postgresql/data

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PGHOST=localhost
ENV PGPORT=5432

ENTRYPOINT ["./docker-entrypoint.sh"]
