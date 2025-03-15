# Workout Tracker

A full-stack React application for tracking workouts, built with Vite, TypeScript, and Node.js.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure Frontend/Backend variables:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

3. Set up the database:

```bash
psql -U postgres
CREATE DATABASE workout;
\c workout
\i src/database.sql
```

4. Run migrations:

```bash
npm run db:migrate
```

4. Start the development server:

```bash
npm run dev
```

## Environment Variables

### Frontend

- `VITE_API_URL`: Backend API URL (used during development)
- `API_URL`: Backend API URL (used in production)
- `PORT`: Port for the Express server (defaults to 3000)

### API Server

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port
- `CORS_ORIGIN`: Frontend application URL
- Local development variables (see server/.env.example)

## Scripts

### Frontend

- `npm run db:migrate`: Run migrations
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run preview`: Preview production build locally

## Deployment

The application includes a deployment script that automates the process of updating and running the application in a production environment.

### Using the Deployment Script

```bash
./scripts/deploy.sh
```

This script performs the following actions:

1. Kills all running Node.js processes
2. Pulls the latest code from git
3. Installs packages for both frontend and backend
4. Runs database migrations
5. Builds the application (frontend and backend)
6. Starts the application in production mode

Make sure the script is executable:

```bash
chmod +x scripts/deploy.sh
```

## Tech Stack

- Frontend:

  - React
  - TypeScript
  - Vite
  - React Router
  - Express (production server)

- Backend:
  - Node.js
  - Express
  - PostgreSQL
  - TypeScript
