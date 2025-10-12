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

2. Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

3. Start the PostgreSQL database using Docker:

```bash
npm run db:start
```

4. Run database migrations:

```bash
npm run db:migrate
```

5. Start the development servers:

```bash
npm run dev
```

This will start:

- Vite dev server (frontend) on port 3000
- API server (backend) on port 5001
- PostgreSQL database on port 5432 (in Docker)
- The frontend will proxy API requests to the backend

### Test User Credentials

For testing purposes, you can use these credentials:

- Email: `test@foo.com`
- Password: `Secure123!`

### Database Management

- `npm run db:start` - Start the development database
- `npm run db:stop` - Stop the development database
- `npm run db:reset` - Reset the database (removes all data and restarts)
- `npm run db:migrate` - Run database migrations

## Production Build

```bash
npm run build
npm start
```

This will:

- Build the React frontend to `/dist`
- Compile the TypeScript backend to `/server/dist`
- Start the single consolidated server on the configured PORT

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
- `npm run db:start` - Start the development database
- `npm run db:stop` - Stop the development database
- `npm run db:reset` - Reset the database (removes all data)
- `npm run db:migrate` - Run database migrations

### Testing

- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:db:start` - Start test database
- `npm run test:e2e:db:stop` - Stop test database
- `npm run test:e2e:db:reset` - Reset test database

### Production

- `npm run build` - Build for production (frontend + backend)
- `npm start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Deployment

The application is deployed to Heroku and automatically deploys when changes are pushed to the main branch on GitHub.

### Deployment Process

1. **Push to GitHub:**

```bash
git push origin main
```

2. **Heroku automatically deploys** from the connected GitHub repository

### Manual Deployment (if needed)

If you need to manually trigger a deployment or run migrations:

```bash
# Trigger manual deployment
git push heroku main

# Run migrations on Heroku
heroku run npm run db:migrate
```

### Deployment Scripts

The application includes deployment scripts for server management:

```bash
./scripts/deploy.sh
```

This script:

1. Kills existing Node.js processes
2. Pulls latest code from git
3. Installs dependencies
4. Runs database migrations
5. Builds the application
6. Starts the production server

Make the script executable:

```bash
chmod +x scripts/deploy.sh
```

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
