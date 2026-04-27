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

  test('should scan a nutrition label and populate form fields', async ({ page, request }) => {
    await login(page);
    await clearTestData(request);

    await page.goto('/nutrition');
    await page.getByRole('button', { name: /add meal/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Meal' })).toBeVisible({ timeout: 5000 });

    // Set the image file directly on the hidden input — this triggers the onChange handler
    // without opening the native file picker
    await page.locator('input[type="file"]').setInputFiles(labelImage);

    // Wait for scanning to finish — calories field will be populated once OCR completes
    await expect(page.locator('input[name="calories"]')).not.toHaveValue('', { timeout: 30000 });

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
