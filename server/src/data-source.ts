import "reflect-metadata";
import { DataSource } from "typeorm";
import * as entities from "./entities";
import dotenv from "dotenv";

dotenv.config();

// Parse DATABASE_URL if provided (Heroku), otherwise use individual config vars
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
      migrations: [__dirname + "/migrations/*.ts"],
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
      migrations: [__dirname + "/migrations/*.ts"],
      migrationsTransactionMode: "each",
      subscribers: [],
    });

export default dataSource;
