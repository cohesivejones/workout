# End-to-End (E2E) Tests

This directory contains Playwright end-to-end tests for the Workout Tracker application.

## Overview

The E2E tests verify the complete user flow from login to viewing the dashboard, ensuring that the application works correctly from a user's perspective.

## Prerequisites

1. **Node.js 18+** installed
2. **Docker** installed (for local testing)
3. **Playwright browsers** installed

## Setup

### Local Development Setup (with Docker)

The easiest way to run e2e tests locally is using Docker for the test database. This ensures isolation from your development database.

#### 1. Install Dependencies

```bash
npm install
```

This will automatically install Playwright and its dependencies.

#### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

#### 3. Set Up Test Database with Docker

Use the provided setup script:

```bash
./scripts/setup-e2e-db.sh
```

Or manually:

```bash
# Start Docker test database (runs on port 5433 to avoid conflicts)
npm run test:e2e:db:start

# Wait a few seconds for database to be ready, then run migrations
cd server && npm run db:migrate:test
```

The test database uses these credentials (configured in `server/.env.test`):

- **Host**: localhost
- **Port**: 5433 (different from dev database on 5432)
- **User**: test_user
- **Password**: test_password
- **Database**: workout_test

The migrations will automatically create a test user with these credentials:

- **Email**: `test@foo.com`
- **Password**: `Secure123!`

#### 4. Start the Application

In separate terminals:

```bash
# Terminal 1: Start backend with test database
cd server && npm run dev:test

# Terminal 2: Start frontend
npm run dev
```

#### 5. Run E2E Tests

In a third terminal:

```bash
npm run test:e2e
```

#### 6. Cleanup

When done testing:

```bash
# Stop the test database
npm run test:e2e:db:stop

# Or reset it completely (removes all data)
npm run test:e2e:db:reset
```

### CI/CD Setup (GitHub Actions)

The CI environment uses GitHub Actions services instead of Docker:

- PostgreSQL service on port 5432
- Credentials: postgres/postgres
- Database: workout_test

This setup is configured in `.github/workflows/e2e-tests.yml` and runs automatically on pushes and pull requests.

## Running Tests

### Run all E2E tests (headless)

```bash
npm run test:e2e
```

### Run with UI mode (for debugging)

```bash
npx playwright test --ui
```

### Run with headed browser (visible)

```bash
npx playwright test --headed
```

### Run specific test file

```bash
npx playwright test e2e/tests/login-and-dashboard.spec.ts
```

### Debug mode

```bash
npx playwright test --debug
```

## Test Structure

```
e2e/
├── tests/
│   └── login-and-dashboard.spec.ts  # Login and dashboard verification tests
└── README.md                         # This file
```

## What's Tested

### Login and Dashboard Flow

1. **Successful Login**
   - Navigate to login page
   - Enter valid credentials
   - Verify redirect to dashboard
   - Check dashboard elements are visible

2. **Invalid Login**
   - Attempt login with invalid credentials
   - Verify error message is shown
   - Confirm user stays on login page

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root. Key settings:

- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Browser**: Chromium (can add Firefox/WebKit)
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Captured on first retry

## CI/CD

E2E tests run automatically on GitHub Actions for:

- Push to `main` or `master` branches
- Pull requests to `main` or `master` branches

The workflow:

1. Sets up PostgreSQL test database
2. Installs dependencies
3. Runs database migrations
4. Executes Playwright tests
5. Uploads test artifacts (reports, screenshots, videos) on failure

See `.github/workflows/e2e-tests.yml` for details.

## Troubleshooting

### Tests fail with "Connection refused"

Make sure the dev server is running. Playwright will automatically start it, but if you see connection errors:

```bash
# Start dev server manually in another terminal
npm run dev
```

### Database connection errors

Verify your test database exists and migrations have run:

```bash
psql -l | grep workout_test
cd server && DATABASE_URL=postgresql://localhost:5432/workout_test npm run db:migrate
```

### Test user doesn't exist

Run the migration that creates the test user:

```bash
cd server
DATABASE_URL=postgresql://localhost:5432/workout_test npm run db:migrate
```

### View test results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Writing New Tests

1. Create a new `.spec.ts` file in `e2e/tests/`
2. Import test utilities: `import { test, expect } from '@playwright/test';`
3. Write your test using Playwright's API
4. Run and verify: `npx playwright test your-test.spec.ts`

Example:

```typescript
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  await page.goto('/some-page');
  await expect(page.locator('h1')).toContainText('Expected Text');
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
