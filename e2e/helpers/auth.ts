import { Page, expect } from '@playwright/test';

/**
 * Login helper for e2e tests
 * Logs in with the test user credentials and waits for successful authentication
 */
export async function login(page: Page, email = 'test@foo.com', password = 'Secure123!') {
  // Navigate to login page
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait for login form to be visible
  await expect(page.locator('h2:has-text("Login")')).toBeVisible({ timeout: 10000 });

  // Fill in credentials
  await page.fill('#email', email);
  await page.fill('#password', password);

  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for successful login - Timeline link appears after login
  await expect(page.getByRole('link', { name: 'Timeline' })).toBeVisible({ timeout: 10000 });
}

/**
 * Logout helper for e2e tests
 * Logs out the current user and waits for redirect to login page
 */
export async function logout(page: Page) {
  // Click the user dropdown toggle
  await page.click('button.dropdownToggle, button:has-text("test")');

  // Wait for dropdown menu to appear and click logout
  await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 5000 });
  await page.click('button:has-text("Logout")');

  // Verify user is redirected to login page
  await expect(page.locator('h2:has-text("Login")')).toBeVisible({ timeout: 10000 });
}
