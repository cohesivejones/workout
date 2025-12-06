import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/migrations/**',
      '**/test/**', // Exclude integration tests
    ],
    // Run unit tests co-located with source files (no database required)
    include: ['src/**/*.test.ts'],
  },
});
