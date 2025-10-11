import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';

test.describe('Create Pain Score', () => {
  // Clear storage and test data before each test to ensure clean state
  test.beforeEach(async ({ page, request }) => {
    await page.context().clearCookies();
    await clearTestData(request);
    await page.goto('/');
  });

  test('should create a pain score and verify in list and calendar views', async ({ page }) => {
    // Step 1: Login using helper
    await login(page);

    // Step 2: Switch to List view to access "New Pain Score" button
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Step 3: Navigate to New Pain Score page
    await page.getByRole('link', { name: 'New Pain Score' }).click();
    await expect(page.getByRole('heading', { name: 'Add Pain Score' })).toBeVisible({
      timeout: 5000,
    });

    // Step 4: Fill in the pain score form
    // Wait for the form to be fully loaded
    await page.waitForLoadState('networkidle');

    // Select pain level 7 (clicking on the 7th pain scale option)
    // The pain scale selector has clickable options numbered 0-10
    const painLevel = 7;
    await page
      .locator(`[role="button"][aria-label*="Pain level ${painLevel}"]`)
      .click({ timeout: 5000 });

    // Verify the pain level is selected
    await expect(
      page.locator(`[role="button"][aria-pressed="true"][aria-label*="Pain level ${painLevel}"]`)
    ).toBeVisible();

    // Add optional notes
    const notes = "Lower back pain after yesterday's workout";
    await page.fill('textarea[placeholder*="notes"]', notes);

    // Step 5: Submit the pain score
    await page.getByRole('button', { name: 'Save Pain Score' }).click();

    // Wait for redirect to Timeline page
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h2:has-text("Activity Timeline")')).toBeVisible({ timeout: 5000 });

    // Step 6: Verify in List View
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Verify pain score card appears in list view
    await expect(page.locator('text=Pain Score').first()).toBeVisible({ timeout: 5000 });

    // Verify the pain level is displayed (shows as "7 - Severe pain..." not "7/10")
    await expect(page.locator(`text=/.*${painLevel}.*Severe pain.*/`).first()).toBeVisible();

    // Verify notes are displayed (at least partially)
    await expect(page.locator(`text=/.*${notes.substring(0, 20)}.*/`).first()).toBeVisible();

    // Step 7: Verify in Calendar View
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });

    // Find today's date cell in the calendar
    const todayCell = page.locator('.today, [class*="today"]').first();
    await expect(todayCell).toBeVisible({ timeout: 5000 });

    // Click on the pain score button to navigate to detail page
    // Pain scores are rendered as buttons with aria-label
    const painScoreButton = page
      .locator(`button[aria-label*="Edit pain score ${painLevel}"]`)
      .first();
    await expect(painScoreButton).toBeVisible({ timeout: 5000 });
    await painScoreButton.click();

    // Wait for navigation to pain score edit page
    await page.waitForURL(/\/pain-scores\/\d+\/edit/, { timeout: 5000 });

    // Verify we're on the pain score edit page
    await expect(page.getByRole('heading', { name: 'Edit Pain Score' })).toBeVisible({
      timeout: 5000,
    });

    // Verify the pain level is pre-selected in the form
    await expect(
      page.locator(`[role="button"][aria-pressed="true"][aria-label*="Pain level ${painLevel}"]`)
    ).toBeVisible();

    // Verify notes are pre-filled in the textarea
    await expect(page.locator('textarea[placeholder*="notes"]')).toHaveValue(notes);
  });
});
