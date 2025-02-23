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

## Heroku Deployment

### API Server Deployment

1. Create a new Heroku app for the API:
```bash
cd server
heroku create your-api-name
```

2. Add PostgreSQL:
```bash
heroku addons:create heroku-postgresql:mini
```

3. Set environment variables:
```bash
heroku config:set CORS_ORIGIN=https://your-frontend-app.herokuapp.com
```

4. Deploy the API:
```bash
git subtree push --prefix server heroku main
```

5. Set up the database:
```bash
heroku pg:psql < server/src/database.sql
```

### Frontend Deployment

1. Create a new Heroku app for the frontend:
```bash
heroku create your-frontend-name
```

2. Set environment variables:
```bash
heroku config:set API_URL=https://your-api-name.herokuapp.com
```

3. Deploy the frontend:
```bash
git push heroku main
```

## Environment Variables

### Frontend
- `VITE_API_URL`: Backend API URL (used during development)
- `API_URL`: Backend API URL (used in production)
- `PORT`: Port for the Express server (defaults to 3000)

### API Server
- `DATABASE_URL`: PostgreSQL connection string (provided by Heroku)
- `PORT`: Server port (provided by Heroku)
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
