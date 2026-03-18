import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';

test.describe('Nutrition Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should show empty state and create first meal', async ({ page, request }) => {
    // Step 1: Login
    await login(page);
    await clearTestData(request);

    // Step 2: Navigate to nutrition page
    await page.goto('/nutrition');
    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible({ timeout: 5000 });

    // Step 3: Verify empty state
    await expect(page.getByText(/no meals logged/i)).toBeVisible({ timeout: 5000 });

    // Step 4: Click "Add Meal" button
    await page.getByRole('button', { name: /add meal/i }).click();

    // Step 5: Fill in meal form
    await expect(page.getByRole('heading', { name: 'Add Meal' })).toBeVisible({ timeout: 5000 });

    // Fill in meal details
    const mealDescription = 'Chicken and Rice';
    const calories = '650';
    const protein = '45';
    const carbs = '70';
    const fat = '15';

    await page.fill('input[name="description"]', mealDescription);
    await page.fill('input[name="calories"]', calories);
    await page.fill('input[name="protein"]', protein);
    await page.fill('input[name="carbs"]', carbs);
    await page.fill('input[name="fat"]', fat);

    // Step 6: Submit the form
    await page.getByRole('button', { name: 'Save Meal' }).click();

    // Step 7: Verify redirect back to nutrition page
    await page.waitForURL('/nutrition', { timeout: 10000 });

    // Step 8: Verify meal appears in list
    await expect(page.getByText(mealDescription)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`${calories} cal`)).toBeVisible();

    // Step 9: Verify daily summary
    await expect(page.getByText(/daily total/i)).toBeVisible();
    await expect(page.getByText(new RegExp(`${calories}.*cal`, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(`${protein}.*g.*protein`, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(`${carbs}.*g.*carbs`, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(`${fat}.*g.*fat`, 'i'))).toBeVisible();
  });

  test('should add multiple meals and show correct totals', async ({ page, request }) => {
    // Step 1: Login
    await login(page);
    await clearTestData(request);

    // Step 2: Navigate to nutrition page and add first meal
    await page.goto('/nutrition');
    await page.getByRole('button', { name: /add meal/i }).click();

    // Add breakfast
    await page.fill('input[name="description"]', 'Breakfast - Oats and Banana');
    await page.fill('input[name="calories"]', '400');
    await page.fill('input[name="protein"]', '15');
    await page.fill('input[name="carbs"]', '65');
    await page.fill('input[name="fat"]', '10');
    await page.getByRole('button', { name: 'Save Meal' }).click();

    await page.waitForURL('/nutrition', { timeout: 10000 });

    // Add lunch
    await page.getByRole('button', { name: /add meal/i }).click();
    await page.fill('input[name="description"]', 'Lunch - Chicken Salad');
    await page.fill('input[name="calories"]', '550');
    await page.fill('input[name="protein"]', '40');
    await page.fill('input[name="carbs"]', '35');
    await page.fill('input[name="fat"]', '25');
    await page.getByRole('button', { name: 'Save Meal' }).click();

    await page.waitForURL('/nutrition', { timeout: 10000 });

    // Step 3: Verify both meals are displayed
    await expect(page.getByText('Breakfast - Oats and Banana').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('Lunch - Chicken Salad').first()).toBeVisible();

    // Step 4: Verify daily totals are correct (400 + 550 = 950 cal, etc.)
    await expect(page.getByText(/daily total/i)).toBeVisible();
    // Check the totals section for the values
    const totalsSection = page.locator('.summarySection, [class*="summarySection"]');
    await expect(totalsSection.getByText('950')).toBeVisible(); // calories
    await expect(totalsSection.getByText('55.0g')).toBeVisible(); // protein: 15 + 40
    await expect(totalsSection.getByText('100.0g')).toBeVisible(); // carbs: 65 + 35
    await expect(totalsSection.getByText('35.0g')).toBeVisible(); // fat: 10 + 25
  });

  test('should edit and delete meals', async ({ page, request }) => {
    // Step 1: Login and create a meal
    await login(page);
    await clearTestData(request);

    await page.goto('/nutrition');
    await page.getByRole('button', { name: /add meal/i }).click();

    await page.fill('input[name="description"]', 'Dinner - Pasta');
    await page.fill('input[name="calories"]', '700');
    await page.fill('input[name="protein"]', '30');
    await page.fill('input[name="carbs"]', '90');
    await page.fill('input[name="fat"]', '20');
    await page.getByRole('button', { name: 'Save Meal' }).click();

    await page.waitForURL('/nutrition', { timeout: 10000 });

    // Step 2: Edit the meal
    // Find the meal card containing "Dinner - Pasta" and click its Edit button
    const mealCard = page.locator('[class*="mealCard"]', { hasText: 'Dinner - Pasta' }).first();
    await mealCard.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Meal' })).toBeVisible({ timeout: 5000 });

    // Update calories
    await page.fill('input[name="calories"]', '750');
    await page.getByRole('button', { name: 'Update Meal' }).click();

    await page.waitForURL('/nutrition', { timeout: 10000 });

    // Verify updated calories
    await expect(page.getByText('750 cal')).toBeVisible({ timeout: 5000 });

    // Step 3: Delete the meal
    const mealCardForDelete = page
      .locator('[class*="mealCard"]', { hasText: 'Dinner - Pasta' })
      .first();

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());
    await mealCardForDelete.getByRole('button', { name: 'Delete' }).click();

    // Verify meal is removed
    await expect(page.getByText('Dinner - Pasta')).not.toBeVisible({ timeout: 5000 });

    // Verify empty state returns
    await expect(page.getByText(/no meals logged/i)).toBeVisible();
  });
});
