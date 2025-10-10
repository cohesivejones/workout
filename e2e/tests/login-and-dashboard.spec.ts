import { test, expect } from '@playwright/test';

test.describe('Login and Dashboard', () => {
  // Clear storage before each test to ensure clean state
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should login successfully and view dashboard', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/');
    
    // Wait for the login page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for the login form to be visible (h2 with "Login" text)
    await expect(page.locator('h2:has-text("Login")')).toBeVisible({ timeout: 10000 });
    
    // Fill in the login form using id selectors
    await page.fill('#email', 'test@foo.com');
    await page.fill('#password', 'Secure123!');
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete by checking for the Timeline link (appears after login)
    await expect(page.getByRole('link', { name: 'Timeline' })).toBeVisible({ timeout: 10000 });
    
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
    await expect(page.locator('text=/Failed to login|check your email and password/i')).toBeVisible({ timeout: 5000 });
  });
});
