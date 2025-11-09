import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { addExercise, setWorkoutDate } from '../helpers/workout';

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

    // Step 2: Create workouts spanning multiple months
    // With month-based pagination, offset=0 shows most recent month, offset=1 shows previous month, etc.
    // Create workouts using specific dates to ensure they're in the correct months
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Choose days in current month that are <= today to avoid future dates
    const currentMonthDays = [
      Math.min(2, currentDay),
      Math.min(5, currentDay),
      Math.min(7, currentDay),
    ].filter((day, index, arr) => arr.indexOf(day) === index && day > 0); // Remove duplicates and ensure positive

    const workoutDates = [
      // Current month workouts (up to 3 workouts on safe days)
      ...currentMonthDays.map((day) => new Date(currentYear, currentMonth, day)),
      // Previous month workouts (2 workouts on days 10, 20)
      new Date(currentYear, currentMonth - 1, 10),
      new Date(currentYear, currentMonth - 1, 20),
      // 2 months ago (1 workout on day 15)
      new Date(currentYear, currentMonth - 2, 15),
    ];

    for (const workoutDate of workoutDates) {
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

      // Set the workout date
      console.log(`Creating workout for date: ${workoutDate.toISOString().split('T')[0]}`);

      await setWorkoutDate(page, workoutDate);

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

    // Step 4: Verify only current month's workouts are visible initially (offset=0)
    // Count workout cards for current month specifically (ignore any unexpected other-month items)
    const currentMonthWorkoutCount = currentMonthDays.length;
    const currentMonthPrefix = `workout-card-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const initialCurrentMonthWorkoutCards = page.locator(`[data-testid^="${currentMonthPrefix}"]`);
    await expect(initialCurrentMonthWorkoutCards).toHaveCount(currentMonthWorkoutCount, {
      timeout: 5000,
    });

    // Verify that we have the correct number of Squats exercises visible (one per workout)
    const initialSquatsExercises = page.locator('text=Squats');
    await expect(initialSquatsExercises).toHaveCount(currentMonthWorkoutCount);

    // Step 5: Verify Load Previous Month button is present
    const loadMoreButton = page.getByRole('button', { name: /load (more|previous month)/i });
    await expect(loadMoreButton).toBeVisible({ timeout: 5000 });

    // Step 6: Click Load Previous Month button to get previous month's data
    await loadMoreButton.click();

    // Wait for loading to complete (Loading... text disappears)
    await expect(page.getByRole('button', { name: /loading/i })).not.toBeVisible();

    // Step 7: Verify current month + previous month workouts are now visible
    const expectedAfterFirstLoad = currentMonthWorkoutCount + 2; // +2 from previous month
    const afterFirstLoadCards = page.locator('[data-testid^="workout-card-"]');
    await expect(afterFirstLoadCards).toHaveCount(expectedAfterFirstLoad, { timeout: 5000 });

    // Verify that we now have the expected number of Squats exercises visible
    const afterFirstLoadSquats = page.locator('text=Squats');
    await expect(afterFirstLoadSquats).toHaveCount(expectedAfterFirstLoad);

    // Step 8: Click Load Previous Month again to get 2 months ago data
    await loadMoreButton.click();
    await expect(page.getByRole('button', { name: /loading/i })).not.toBeVisible();

    // Step 9: Verify all workouts are now visible
    const totalWorkouts = workoutDates.length;
    const allWorkoutCards = page.locator('[data-testid^="workout-card-"]');
    await expect(allWorkoutCards).toHaveCount(totalWorkouts, { timeout: 5000 });

    // Verify that we now have all Squats exercises visible (one per workout)
    const allSquatsExercises = page.locator('text=Squats');
    await expect(allSquatsExercises).toHaveCount(totalWorkouts);

    // Step 10: Load Previous Month button should disappear when there are no more months
    await expect(loadMoreButton).not.toBeVisible();
  });

  test('user navigates between months in calendar view', async ({ page, request }) => {
    // Step 1: Login
    await login(page);

    // Clear test data
    await clearTestData(request);

    // Step 2: Create workouts in different months
    // Current month, 1 month ago, and 2 months ago
    const today = new Date();
    const workoutDates = [
      // Current month - use Squats (use day 15 to ensure it's in current month)
      { monthsAgo: 0, dayOfMonth: 15, exerciseName: 'Squats' },
      // 1 month ago - use Planks
      { monthsAgo: 1, dayOfMonth: 15, exerciseName: 'Planks' },
      // 2 months ago - use Bench Press
      { monthsAgo: 2, dayOfMonth: 15, exerciseName: 'Bench Press' },
    ];

    for (const workout of workoutDates) {
      // Navigate to new workout page
      await page.goto('/');
      await page.getByRole('button', { name: 'Calendar' }).click();
      await page.waitForURL('/?view=calendar', { timeout: 5000 });

      // Click FAB button (if it exists in calendar view, otherwise navigate directly)
      await page.goto('/workouts/new');
      await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({
        timeout: 5000,
      });

      // Wait for the form to be fully loaded
      await page.waitForLoadState('networkidle');
      await expect(page.getByPlaceholder('Reps')).toBeVisible({ timeout: 5000 });

      // Calculate and set the date - set to specific day of the target month
      const workoutDate = new Date(today);
      workoutDate.setMonth(workoutDate.getMonth() - workout.monthsAgo);
      workoutDate.setDate(workout.dayOfMonth);
      console.log(
        `Creating workout with ${workout.exerciseName}: ${workoutDate.toISOString().split('T')[0]}`
      );

      await setWorkoutDate(page, workoutDate);

      // Add a simple exercise using the helper
      await addExercise(page, { name: workout.exerciseName, reps: '10' });

      // Save workout
      await page.getByRole('button', { name: 'Save Workout' }).click();

      // Wait for redirect
      await page.waitForURL('/', { timeout: 10000 });
    }

    // Step 3: Navigate to calendar view
    await page.goto('/');
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });

    // Wait for calendar to load
    await page.waitForTimeout(1000);

    // Step 4: Verify only current month's workout is visible (Squats)
    // Count calendar workout links - should be 1 (current month only)
    const currentMonthWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    await expect(currentMonthWorkouts).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('text=Squats').first()).toBeVisible();
    await expect(page.locator('text=Planks')).not.toBeVisible();
    await expect(page.locator('text=Bench Press')).not.toBeVisible();

    // Step 5: Navigate to previous month
    const prevMonthButton = page.getByRole('button', { name: 'Previous month' });
    await prevMonthButton.click();
    await page.waitForTimeout(1000); // Wait for data to load

    // Step 6: Verify only last month's workout is visible (Planks)
    const lastMonthWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    await expect(lastMonthWorkouts).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('text=Planks').first()).toBeVisible();
    await expect(page.locator('text=Squats')).not.toBeVisible();
    await expect(page.locator('text=Bench Press')).not.toBeVisible();

    // Step 7: Navigate to previous month again
    await prevMonthButton.click();
    await page.waitForTimeout(1000); // Wait for data to load

    // Step 8: Verify only two months ago workout is visible (Bench Press)
    const twoMonthsAgoWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    await expect(twoMonthsAgoWorkouts).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('text=Bench Press').first()).toBeVisible();
    await expect(page.locator('text=Squats')).not.toBeVisible();
    await expect(page.locator('text=Planks')).not.toBeVisible();

    // Step 9: Navigate forward one month
    const nextMonthButton = page.getByRole('button', { name: 'Next month' });
    await nextMonthButton.click();
    await page.waitForTimeout(1000); // Wait for data to load

    // Step 10: Verify we're back to last month's workout (Planks)
    const backToLastMonthWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    await expect(backToLastMonthWorkouts).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('text=Planks').first()).toBeVisible();
    await expect(page.locator('text=Squats')).not.toBeVisible();
    await expect(page.locator('text=Bench Press')).not.toBeVisible();

    // Step 11: Use "Today" button to return to current month
    const todayButton = page.getByRole('button', { name: 'Go to today' });
    await todayButton.click();
    await page.waitForTimeout(1000); // Wait for data to load

    // Step 12: Verify we're back to current month (Squats)
    const backToCurrentMonthWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    await expect(backToCurrentMonthWorkouts).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('text=Squats').first()).toBeVisible();
    await expect(page.locator('text=Planks')).not.toBeVisible();
    await expect(page.locator('text=Bench Press')).not.toBeVisible();
  });
});
