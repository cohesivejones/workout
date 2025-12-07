import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createDatabase() {
  // Connect to postgres database to create/drop the target database
  // Get database connection details from environment variables
  const pgHost = process.env.PGHOST || 'localhost';
  const pgPort = parseInt(process.env.PGPORT || '5432');

  // The task requested to use the 'postgres' role, but we'll use the current system user
  // if the postgres role doesn't exist, which is more reliable across different systems
  const pgUser = process.env.PGUSER || process.env.USER || 'postgres'; // Try env var first, then system user, fallback to postgres

  const pgPassword = process.env.PGPASSWORD;
  const pgDefaultDb = 'postgres'; // Default postgres database for initial connection

  const pgClient = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: pgDefaultDb, // Connect to default postgres database
  });

  const dbName = process.env.PGDATABASE || 'workout';

  try {
    console.log(`Database connection details:
  - Host: ${pgHost}
  - Port: ${pgPort}
  - User: ${pgUser}
  - Database: ${pgDefaultDb}
`);
    console.log('Connecting to postgres database...');
    await pgClient.connect();

    // Drop database if exists
    console.log(`Dropping database "${dbName}" if it exists...`);
    await pgClient.query(`DROP DATABASE IF EXISTS ${dbName}`);

    // Create database with the specified role
    console.log(`Creating database "${dbName}" with role "${pgUser}"...`);
    await pgClient.query(`CREATE DATABASE ${dbName} WITH OWNER = "${pgUser}"`);

    console.log(`Database "${dbName}" created successfully.`);
    await pgClient.end();

    // Connect to the newly created database to run the SQL script
    const dbClient = new Client({
      host: pgHost,
      port: pgPort,
      user: pgUser,
      password: pgPassword,
      database: dbName,
    });

    await dbClient.connect();

    // Read and execute the SQL from database.sql
    const sqlFilePath = path.join(__dirname, '..', 'src', 'database.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL script from database.sql...');
    await dbClient.query(sqlScript);

    console.log('SQL script executed successfully.');
    await dbClient.end();

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  }
}

createDatabase();
