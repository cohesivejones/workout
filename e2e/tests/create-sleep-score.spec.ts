import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { clickFabMenuItem } from '../helpers/navigation';

test.describe('Create Sleep Score', () => {
  // Clear storage and test data before each test to ensure clean state
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should create a sleep score and verify in list and calendar views', async ({
    page,
    request,
  }) => {
    // Step 1: Login using helper
    await login(page);

    // Clear test data after login (when backend is running)
    await clearTestData(request);

    // Step 2: Switch to List view to access "New Sleep Score" button
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Step 3: Navigate to New Sleep Score page using FAB
    await clickFabMenuItem(page, 'New Sleep Score');
    await expect(page.getByRole('heading', { name: 'Add Sleep Score' })).toBeVisible({
      timeout: 5000,
    });

    // Step 4: Fill in the sleep score form
    // Wait for the form to be fully loaded
    await page.waitForLoadState('networkidle');

    // Select sleep quality level 4 (Good - clicking on the 4th sleep scale option)
    // The sleep scale selector has clickable options numbered 1-5
    const sleepLevel = 4;
    await page
      .locator(`[role="button"][aria-label*="Sleep level ${sleepLevel}"]`)
      .click({ timeout: 5000 });

    // Verify the sleep level is selected
    await expect(
      page.locator(`[role="button"][aria-pressed="true"][aria-label*="Sleep level ${sleepLevel}"]`)
    ).toBeVisible();

    // Add optional notes
    const notes = 'Slept well, only woke up once during the night';
    await page.fill('textarea[placeholder*="notes"]', notes);

    // Step 5: Submit the sleep score
    await page.getByRole('button', { name: 'Save Sleep Score' }).click();

    // Wait for redirect to Timeline page
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h2:has-text("Activity Timeline")')).toBeVisible({ timeout: 5000 });

    // Step 6: Verify in List View
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Verify sleep score card appears in list view
    await expect(page.locator('text=Sleep Score').first()).toBeVisible({ timeout: 5000 });

    // Verify the sleep level is displayed (shows as "4 - Good - ..." not "4/5")
    await expect(page.locator(`text=/.*${sleepLevel}.*Good.*/`).first()).toBeVisible();

    // Verify notes are displayed (at least partially)
    await expect(page.locator(`text=/.*${notes.substring(0, 20)}.*/`).first()).toBeVisible();

    // Step 7: Verify in Calendar View
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });

    // Find today's date cell in the calendar
    const todayCell = page.locator('.today, [class*="today"]').first();
    await expect(todayCell).toBeVisible({ timeout: 5000 });

    // Click on the sleep score button to navigate to detail page
    // Sleep scores are rendered as buttons with aria-label
    const sleepScoreButton = page
      .locator(`button[aria-label*="Edit sleep score ${sleepLevel}"]`)
      .first();
    await expect(sleepScoreButton).toBeVisible({ timeout: 5000 });
    await sleepScoreButton.click();

    // Wait for navigation to sleep score edit page
    await page.waitForURL(/\/sleep-scores\/\d+\/edit/, { timeout: 5000 });

    // Verify we're on the sleep score edit page
    await expect(page.getByRole('heading', { name: 'Edit Sleep Score' })).toBeVisible({
      timeout: 5000,
    });

    // Verify the sleep level is pre-selected in the form
    await expect(
      page.locator(`[role="button"][aria-pressed="true"][aria-label*="Sleep level ${sleepLevel}"]`)
    ).toBeVisible();

    // Verify notes are pre-filled in the textarea
    await expect(page.locator('textarea[placeholder*="notes"]')).toHaveValue(notes);
  });
});
