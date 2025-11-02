import { beforeAll, afterAll, beforeEach } from 'vitest';
import dataSource from '../data-source';

// Initialize database connection before all tests
beforeAll(async () => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
});

// Close database connection after all tests
afterAll(async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
});

// Clear test data before each test
beforeEach(async () => {
  // We'll implement cleanup in individual test files as needed
  // to avoid accidentally clearing production data
});
