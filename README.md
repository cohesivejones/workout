# Workout Tracker

A full-stack React application for tracking workouts, built with Vite, TypeScript, and Node.js. This application uses a **single-node architecture** where both the frontend and backend run on the same server process.

## Architecture

This application uses a consolidated single-server approach:

- **Single Express server** serves both the React frontend and API endpoints
- **API routes** are available at `/api/*`
- **Static files** (React build) served from `/dist`
- **Database** uses PostgreSQL with TypeORM
- **Authentication** via JWT tokens with HTTP-only cookies

## Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

3. Generate SSL certificates (first time only):

```bash
npm run certs:generate
```

4. Start the PostgreSQL database and Nginx proxy using Docker:

```bash
npm run dev:env:start
```

5. Run database migrations:

```bash
npm run db:migrate
```

6. Start the development servers:

```bash
npm run dev
```

7. Access the application at **https://localhost**

   **Note:** Your browser will show a security warning because this is a self-signed certificate. This is normal for development. Click "Advanced" and proceed to localhost.

This will start:

- Nginx HTTPS proxy on ports 80 (HTTP) and 443 (HTTPS)
- Vite dev server (frontend) on port 3000 (proxied through Nginx)
- API server (backend) on port 5001 (proxied through Nginx)
- PostgreSQL database on port 5432 (in Docker)
  - Database: `workout_dev`
  - User: `postgres`
  - Password: `password`
- HTTP requests are automatically redirected to HTTPS

### Test User Credentials

For testing purposes, you can use these credentials:

- Email: `test@foo.com`
- Password: `Secure123!`

### SSL Certificate Trust (Optional)

To avoid the browser security warning, you can trust the self-signed certificate:

**macOS:**

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain nginx/certs/localhost.crt
```

**Linux:**

```bash
sudo cp nginx/certs/localhost.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

**Windows:**

1. Double-click `nginx/certs/localhost.crt`
2. Click "Install Certificate"
3. Select "Local Machine"
4. Select "Place all certificates in the following store"
5. Browse and select "Trusted Root Certification Authorities"
6. Click "Finish"

After trusting the certificate, restart your browser.

### Database Management

- `npm run dev:env:start` - Start the development database and Nginx proxy
- `npm run dev:env:stop` - Stop the development database and Nginx proxy
- `npm run dev:env:reset` - Reset the database (removes all data and restarts)
- `npm run db:migrate` - Run database migrations

## Production Build

For local testing of the production build:

```bash
npm run build
npm start
```

For actual deployment, use the Docker image (see Deployment section below).

## Environment Variables

All environment variables are now consolidated in a single `.env` file:

- `PORT`: Server port (defaults to 3000)
- `DATABASE_URL`: PostgreSQL connection string (for production)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Individual DB config (for development)
- `JWT_SECRET`: Secret key for JWT token signing
- `CORS_ORIGIN`: Allowed CORS origins (comma-separated)
- `OPENAI_API_KEY`: OpenAI API key for workout generation
- `NODE_ENV`: Environment (development/production)

## Scripts

### Development

- `npm run dev` - Start development servers (Vite + API server)
- `npm run certs:generate` - Generate SSL certificates for HTTPS (first time only)
- `npm run dev:env:start` - Start the development database and Nginx proxy
- `npm run dev:env:stop` - Stop the development database and Nginx proxy
- `npm run dev:env:reset` - Reset the database (removes all data)
- `npm run db:migrate` - Run database migrations

### Testing

- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests (requires test environment setup)
- `npm run test:env:start` - Start test environment (database + nginx)
- `npm run test:env:stop` - Stop test environment
- `npm run test:env:reset` - Reset test environment

**E2E Test Setup:**

E2E tests run against `https://localhost` using the same HTTPS setup as development:

1. Generate SSL certificates (if not already done):

   ```bash
   npm run certs:generate
   ```

2. Start test database, nginx, and run migrations:

   ```bash
   npm run test:env:start
   ```

3. Run tests (Playwright auto-starts backend server):

   ```bash
   npm run test:e2e
   ```

4. Stop test environment:
   ```bash
   npm run test:env:stop
   ```

**Note:**

- Playwright automatically starts the backend (port 5001) and frontend (port 5173) servers when running locally
- You only need to manually start the test database and nginx proxy
- In CI, all services (database, nginx, backend, frontend) are started by the workflow
- E2E tests use the same HTTPS configuration as development, ensuring production parity

### Production

- `npm run build` - Build for production (frontend + backend)
- `npm start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Deployment

The application is deployed as an all-in-one Docker image that includes the frontend, backend, and PostgreSQL database.

### Prerequisites

- Docker installed on your server
- A secure JWT_SECRET (generate with `openssl rand -base64 32`)
- OpenAI API key (optional, for AI features)

### Quick Start

```bash
docker run -d \
  --name workout-app \
  --restart unless-stopped \
  -p 3000:5001 \
  -v workout-db:/var/lib/postgresql/data \
  -e PORT=5001 \
  -e PGUSER=postgres \
  -e PGPASSWORD=postgres \
  -e PGDATABASE=workout_production \
  -e CORS_ORIGIN="http://your-server-ip:3000" \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e OPENAI_API_KEY="your-openai-api-key-or-leave-blank" \
  drnatejones/natetastic-adventures:workout-latest
```

Access your app at: `http://your-server-ip:3000`

### Environment Variables

**Required:**
- `PORT` - Server port (5001)
- `PGUSER`, `PGPASSWORD`, `PGDATABASE` - PostgreSQL credentials
- `CORS_ORIGIN` - Your server URL (e.g., "http://192.168.1.100:3000")
- `JWT_SECRET` - Random secure string for JWT tokens

**Optional:**
- `OPENAI_API_KEY` - For AI workout generation features
- `FORCE_HTTPS` - Set to "true" if behind SSL proxy/reverse proxy
- `LOG_LEVEL` - Logging verbosity (default: info)

### Docker Management

```bash
# View logs
docker logs -f workout-app

# Restart container
docker restart workout-app

# Stop container
docker stop workout-app

# Update to latest version
docker pull drnatejones/natetastic-adventures:workout-latest
docker stop workout-app
docker rm workout-app
# Then re-run the docker run command above
```

### Data Persistence

The database is stored in a Docker volume (`workout-db`). This persists across container restarts and updates.

### Backup & Restore

```bash
# Backup database
docker run --rm -v workout-db:/data -v $(pwd):/backup alpine \
  tar czf /backup/workout-db-backup-$(date +%Y%m%d).tar.gz /data

# Restore database
docker run --rm -v workout-db:/data -v $(pwd):/backup alpine \
  tar xzf /backup/workout-db-backup-YYYYMMDD.tar.gz -C /
```

### Using Specific Versions

```bash
# Use a specific version tag
docker pull drnatejones/natetastic-adventures:workout-v1.0.2
docker run -d --name workout-app ... drnatejones/natetastic-adventures:workout-v1.0.2
```

Available tags:
- `workout-latest` - Latest stable version
- `workout-v1.0.2` - Specific version (recommended for production)
- `workout` - Alias for latest

## Tech Stack

- **Frontend:**
  - React 18
  - TypeScript
  - Vite
  - React Router
  - Recharts (for data visualization)

- **Backend:**
  - Node.js
  - Express
  - TypeORM
  - PostgreSQL
  - JWT Authentication
  - OpenAI API integration

- **Development:**
  - ESLint
  - Vitest (testing)
  - Concurrently (dev server orchestration)

## Key Features

- **Workout Tracking:** Log exercises, reps, and weights
- **Pain & Sleep Scoring:** Track daily pain and sleep quality
- **AI-Powered Diagnostics:** Analyze correlations between exercises and pain
- **Workout Generation:** AI-generated workout suggestions based on history
- **Progress Visualization:** Charts showing weight progression over time
- **User Authentication:** Secure login with JWT tokens
- **Responsive Design:** Works on desktop and mobile devices
