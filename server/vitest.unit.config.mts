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
    ],
    // Only run unit tests (no database required)
    include: ['src/test/unit/**/*.test.ts'],
  },
});
