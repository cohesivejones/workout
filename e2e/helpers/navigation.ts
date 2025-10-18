import { Page } from '@playwright/test';

/**
 * Helper function to interact with the Floating Action Button (FAB) menu
 * Opens the FAB and clicks on the specified menu item
 *
 * @param page - Playwright page object
 * @param itemName - Name of the menu item to click ('New Workout', 'New Pain Score', or 'New Sleep Score')
 */
export async function clickFabMenuItem(page: Page, itemName: string) {
  // Click the FAB button to open the menu
  await page.getByRole('button', { name: 'Add new item' }).click();

  // Wait a moment for the menu animation
  await page.waitForTimeout(100);

  // Click the specified menu item
  await page.getByRole('link', { name: itemName }).click();
}
