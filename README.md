# Workout Tracker

A full-stack React application for tracking workouts, built with Vite, TypeScript, and Node.js. This application uses a **single-node architecture** where both the frontend and backend run on the same server process.

## Architecture

This application uses a consolidated single-server approach:
- **Single Express server** serves both the React frontend and API endpoints
- **API routes** are available at `/api/*` 
- **Static files** (React build) served from `/dist`
- **Database** uses PostgreSQL with TypeORM
- **Authentication** via JWT tokens with HTTP-only cookies

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure variables:

```bash
cp .env.example .env
```

3. Set up the database:

```bash
psql -U postgres
CREATE DATABASE workout;
```

4. Run migrations:

```bash
npm run db:migrate
```

5. Start the development server:

```bash
npm run dev
```

This will start:
- Vite dev server (frontend) on port 5173
- API server (backend) on port 5001
- The frontend will proxy API requests to the backend

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

- `npm run dev`: Start development servers (Vite + API server)
- `npm run build`: Build for production (frontend + backend)
- `npm start`: Start production server (single consolidated server)
- `npm run db:create`: Create database
- `npm run db:migrate`: Run database migrations
- `npm test`: Run tests
- `npm run lint`: Run ESLint

## Deployment

### Heroku Deployment

This application is optimized for single-dyno Heroku deployment:

1. **Create Heroku app:**
```bash
heroku create your-app-name
```

2. **Add Heroku Postgres:**
```bash
heroku addons:create heroku-postgresql:mini
```

3. **Set environment variables:**
```bash
heroku config:set JWT_SECRET=your-secret-key
heroku config:set OPENAI_API_KEY=your-openai-key
heroku config:set NODE_ENV=production
```

4. **Deploy:**
```bash
git push heroku main
```

5. **Run migrations:**
```bash
heroku run npm run db:migrate
```

### Traditional Server Deployment

The application includes deployment scripts for traditional server deployment:

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
