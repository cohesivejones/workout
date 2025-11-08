import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import * as dotenv from "dotenv";
import dataSource from "./data-source";
import router from "./routes";

// Initialize reflect-metadata
import "reflect-metadata";
import logger from "./logger";

// Load environment variables from the appropriate .env file
// Use path.join to resolve relative to the server directory
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
// When running with ts-node, __dirname is in src/, so we need to go up one level
// When running compiled code, __dirname is in dist/, so we also go up one level
const envPath = path.join(__dirname, '..', envFile);
dotenv.config({ path: envPath });

logger.info('Environment loaded', { 
  nodeEnv: process.env.NODE_ENV,
  envFile,
  port: process.env.PORT || '5001'
});

// OpenAI client moved to services/openai.ts (import there where needed)

// Initialize TypeORM connection
dataSource
  .initialize()
  .then(() => {
    logger.info("Database connection initialized successfully");
  })
  .catch((err) => {
    logger.error("Database connection initialization failed", { error: err });
    process.exit(1);
  });

const app = express();

// Middleware
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "").split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Mount API routes extracted into ./routes
app.use("/api", router);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../../dist")));

// Send all other requests to the React app
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../../dist", "index.html"));
});

const PORT = parseInt(process.env.PORT || '5001', 10);
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started successfully', {
    port: PORT,
    host: '0.0.0.0',
    nodeEnv: process.env.NODE_ENV,
    buildTimestamp: new Date().toISOString()
  });
});
