# Workout Tracker

A full-stack React application for tracking workouts, built with Vite, TypeScript, and Node.js.

## Local Development

### Frontend

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure variables:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

### API Server

1. Navigate to server directory and install dependencies:

```bash
cd server
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
\c workout
\i src/database.sql
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

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run preview`: Preview production build locally

### API Server

- `npm run dev`: Start development server
- `npm run build`: Build TypeScript
- `npm start`: Start production server

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
