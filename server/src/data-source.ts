import "reflect-metadata";
import { DataSource } from "typeorm";
import * as entities from "./entities";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the appropriate .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envPath = path.join(__dirname, '..', envFile);
dotenv.config({ path: envPath });

// Parse DATABASE_URL if provided (Heroku), otherwise use individual config vars
// Only skip migrations during vitest integration tests (not E2E tests)
// Vitest sets VITEST=true, so we can use that to distinguish
const migrations = process.env.VITEST === 'true' ? [] : [__dirname + "/migrations/*.ts"];

const dataSource = process.env.DATABASE_URL
  ? new DataSource({
      type: "postgres",
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Heroku
      },
      synchronize: false, // Set to true only in development
      logging: process.env.NODE_ENV === "development",
      entities,
      migrations,
      migrationsTransactionMode: "each",
      subscribers: [],
    })
  : new DataSource({
      type: "postgres",
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || "5432"),
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      synchronize: false, // Set to true only in development
      logging: process.env.NODE_ENV === "development",
      entities,
      migrations,
      migrationsTransactionMode: "each",
      subscribers: [],
    });

export default dataSource;
