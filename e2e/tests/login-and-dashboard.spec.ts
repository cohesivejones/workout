import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Login and Dashboard', () => {
  // Clear storage before each test to ensure clean state
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should login successfully and view dashboard', async ({ page }) => {
    // Use login helper
    await login(page);

    // Verify navigation is present with key links
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Exercises' })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/');

    // Fill in invalid credentials using id selectors
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');

    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for error message (matches actual error text from LoginPage)
    await expect(page.locator('text=/Failed to login|check your email and password/i')).toBeVisible(
      { timeout: 5000 }
    );
  });
});
