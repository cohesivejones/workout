import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/migrations/**',
    ],
    // Only run integration tests (require database)
    include: ['src/test/integration/**/*.test.ts'],
  },
});
