import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('Logout', () => {
  // Clear storage before each test to ensure clean state
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should logout successfully and redirect to login page', async ({ page }) => {
    // Log in first using helper
    await login(page);

    // Log out using helper
    await logout(page);

    // Verify login form is present
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should not be able to access protected pages after logout', async ({ page }) => {
    // Log in first using helper
    await login(page);

    // Log out using helper
    await logout(page);

    // Try to navigate to a protected page (dashboard)
    await page.goto('/dashboard');

    // Should be redirected back to login page
    await expect(page.locator('h2:has-text("Login")')).toBeVisible({ timeout: 10000 });

    // Verify we're still on login page and not on dashboard
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should clear authentication state after logout', async ({ page }) => {
    // Log in first using helper
    await login(page);

    // Verify user dropdown is visible (indicates logged in state)
    await expect(page.locator('button.dropdownToggle, button:has-text("test")')).toBeVisible();

    // Log out using helper
    await logout(page);

    // Verify user dropdown is no longer visible (indicates logged out state)
    await expect(page.locator('button.dropdownToggle, button:has-text("test")')).not.toBeVisible();
  });
});
