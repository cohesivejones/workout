import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const labelImage = path.resolve(__dirname, '../../server/src/test/assets/ocr-test-image.jpg');

test.describe('Create Meal', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('user can log the same meal multiple times at once with a multiplier', async ({
    page,
    request,
  }) => {
    await login(page);
    await clearTestData(request);

    await page.goto('/nutrition');
    await page.getByRole('button', { name: /add meal/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Meal' })).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Description:').fill('Cheese Burger');
    await page.getByLabel('Calories:').fill('300');
    await page.getByLabel('Protein (g):').fill('20');
    await page.getByLabel('Carbs (g):').fill('30');
    await page.getByLabel('Fat (g):').fill('15');
    await page.getByRole('button', { name: '2×' }).click();
    await page.getByRole('button', { name: 'Save Meal' }).click();

    // 2x creates two separate meal entries, not one doubled entry
    await expect(page.getByRole('heading', { name: 'Cheese Burger' })).toHaveCount(2);
  });

  test('should scan a nutrition label and populate form fields', async ({ page, request }) => {
    await login(page);
    await clearTestData(request);

    // The scan endpoint calls OpenAI vision in production. Stub it at the
    // network layer so the test is deterministic and doesn't depend on an
    // external API or key — this test verifies the form wiring, not the model.
    await page.route('**/api/nutrition-label/scan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ calories: 484, protein: 42, carbs: 50.2, fat: 10.7 }),
      });
    });

    await page.goto('/nutrition');
    await page.getByRole('button', { name: /add meal/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Meal' })).toBeVisible({ timeout: 5000 });

    // Set the image file directly on the hidden input — this triggers the onChange handler
    // without opening the native file picker
    await page.locator('input[type="file"]').setInputFiles(labelImage);

    // Wait for scanning to finish — calories field is populated once the scan returns
    await expect(page.locator('input[name="calories"]')).not.toHaveValue('', { timeout: 10000 });

    const caloriesValue = await page.locator('input[name="calories"]').inputValue();
    expect(parseFloat(caloriesValue)).toBe(484);

    const proteinValue = await page.locator('input[name="protein"]').inputValue();
    expect(parseFloat(proteinValue)).toBe(42);

    const fatValue = await page.locator('input[name="fat"]').inputValue();
    expect(parseFloat(fatValue)).toBe(10.7);

    const carbsValue = await page.locator('input[name="carbs"]').inputValue();
    expect(parseFloat(carbsValue)).toBe(50.2);
  });
});
