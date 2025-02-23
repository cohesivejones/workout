# Workout Tracker

A React application for tracking workouts, built with Vite and TypeScript.

## Local Development

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

## Heroku Deployment

1. Create a new Heroku app:
```bash
heroku create your-app-name
```

2. Set environment variables:
```bash
heroku config:set API_URL=your-backend-url
```

3. Deploy to Heroku:
```bash
git push heroku main
```

## Environment Variables

- `VITE_API_URL`: Backend API URL (used during development)
- `API_URL`: Backend API URL (used in production)
- `PORT`: Port for the Express server (defaults to 3000)

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run preview`: Preview production build locally

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- Express (production server)
