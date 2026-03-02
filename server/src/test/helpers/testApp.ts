import express, { Router } from 'express';
import cookieParser from 'cookie-parser';

/**
 * Creates a minimal test Express application with common middleware
 * @param routes - Array of route configurations with path and router
 * @returns Configured Express application
 */
export function createTestApp(routes: { path: string; router: Router }[]): express.Application {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  routes.forEach(({ path, router }) => {
    app.use(path, router);
  });

  return app;
}
