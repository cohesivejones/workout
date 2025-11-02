import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { addExercise } from '../helpers/workout';

test.describe('Timeline Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('user paginates data in list view', async ({ page, request }) => {
    // Step 1: Login
    await login(page);

    // Clear test data
    await clearTestData(request);

    // Step 2: Create workouts spanning 9+ months
    // Initial window is 90 days back to 90 days forward (6 months total)
    // We need workouts older than 90 days to test pagination
    const workoutDates = [
      // Recent workouts (within 90 days back)
      { daysAgo: 10 },
      { daysAgo: 45 },
      { daysAgo: 80 },
      // Older workouts (beyond 90 days back - outside initial window)
      { daysAgo: 120 },
      { daysAgo: 150 },
      { daysAgo: 180 },
    ];

    for (const workout of workoutDates) {
      // Navigate to new workout page
      await page.goto('/');
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForURL('/?view=list', { timeout: 5000 });

      // Click FAB button
      const fabButton = page.getByRole('button', { name: 'Add new item' });
      await fabButton.click();

      // Click New Workout in FAB menu
      await page.getByRole('link', { name: /New Workout/i }).click();
      await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({
        timeout: 5000,
      });

      // Wait for the form to be fully loaded
      await page.waitForLoadState('networkidle');
      await expect(page.getByPlaceholder('Reps')).toBeVisible({ timeout: 5000 });

      // Calculate the date
      const workoutDate = new Date();
      workoutDate.setDate(workoutDate.getDate() - workout.daysAgo);
      const year = workoutDate.getFullYear();
      const month = String(workoutDate.getMonth() + 1).padStart(2, '0');
      const day = String(workoutDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      console.log(`Creating workout ${workout.daysAgo} days ago: ${dateStr}`);

      // Set the date
      const dateInput = page.locator('#workout-date');
      await dateInput.clear();
      await dateInput.fill(dateStr);
      await dateInput.press('Tab');
      await page.waitForTimeout(500);

      // Add a simple exercise using the helper
      await addExercise(page, { name: 'Squats', reps: '10' });

      // Save workout
      await page.getByRole('button', { name: 'Save Workout' }).click();

      // Wait for redirect
      await page.waitForURL('/', { timeout: 10000 });
    }

    // Step 3: Navigate to timeline list view
    await page.goto('/');
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Step 4: Verify only recent 3 months of workouts are visible initially
    // Count workout cards - should be 3 (recent workouts only)
    const initialWorkoutCards = page.locator('[data-testid^="workout-card-"]');
    await expect(initialWorkoutCards).toHaveCount(3, { timeout: 5000 });

    // Verify that we have exactly 3 Squats exercises visible (one per workout)
    const initialSquatsExercises = page.locator('text=Squats');
    await expect(initialSquatsExercises).toHaveCount(3);

    // Step 5: Verify Load More button is present
    const loadMoreButton = page.getByRole('button', { name: /load more/i });
    await expect(loadMoreButton).toBeVisible({ timeout: 5000 });

    // Step 6: Click Load More button
    await loadMoreButton.click();

    // Wait for loading to complete (Loading... text disappears)
    await expect(page.getByRole('button', { name: /loading/i })).not.toBeVisible();

    // Step 7: Verify all 6 workouts are now visible
    const allWorkoutCards = page.locator('[data-testid^="workout-card-"]');
    await expect(allWorkoutCards).toHaveCount(6, { timeout: 5000 });

    // Verify that we now have 6 Squats exercises visible (one per workout)
    const allSquatsExercises = page.locator('text=Squats');
    await expect(allSquatsExercises).toHaveCount(6);

    // Step 8: Verify Load More button disappears (no more data)
    await expect(loadMoreButton).not.toBeVisible();
  });
});
