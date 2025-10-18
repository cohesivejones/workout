import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { addExercise } from '../helpers/workout';
import { clickFabMenuItem } from '../helpers/navigation';

test.describe('Create Workout with Multiple Exercises', () => {
  // Clear storage before each test to ensure clean state
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should create a workout with 6 exercises and verify in list and calendar views', async ({
    page,
    request,
  }) => {
    // Step 1: Login using helper
    await login(page);

    // Clear test data after login (when backend is running)
    await clearTestData(request);

    // Step 2: Switch to List view to access "New Workout" button
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Step 3: Navigate to New Workout page using FAB
    await clickFabMenuItem(page, 'New Workout');
    await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({ timeout: 5000 });

    // Step 4: Add 6 exercises with different types
    const exercises = [
      // Weight exercises
      { name: 'Bench Press', reps: '10', weight: '135', time: '' },
      { name: 'Squat', reps: '8', weight: '185', time: '' },
      // Isometric/time exercises
      { name: 'Plank', reps: '1', weight: '', time: '2' },
      { name: 'Wall Sit', reps: '1', weight: '', time: '1.5' },
      // Bodyweight exercises
      { name: 'Push-ups', reps: '20', weight: '', time: '' },
      { name: 'Pull-ups', reps: '12', weight: '', time: '' },
    ];

    // Wait for the form to be fully loaded
    await page.waitForLoadState('networkidle');

    // Add all exercises using the helper
    for (const exercise of exercises) {
      await addExercise(page, exercise);
    }

    // Verify all 6 exercises are in the current exercises list
    await expect(page.locator('text=Bench Press - 10 reps - 135 lbs')).toBeVisible();
    await expect(page.locator('text=Squat - 8 reps - 185 lbs')).toBeVisible();
    await expect(page.locator('text=Plank - 1 reps - 2 min')).toBeVisible();
    await expect(page.locator('text=Wall Sit - 1 reps - 1.5 min')).toBeVisible();
    await expect(page.locator('text=Push-ups - 20 reps')).toBeVisible();
    await expect(page.locator('text=Pull-ups - 12 reps')).toBeVisible();

    // Step 5: Submit the workout
    await page.getByRole('button', { name: 'Save Workout' }).click();

    // Wait for redirect to Timeline page
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h2:has-text("Activity Timeline")')).toBeVisible({ timeout: 5000 });

    // Step 6: Verify in List View (should already be in list view after redirect)
    // The app redirects to Timeline root which defaults to calendar, so switch to list
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Verify workout card appears in list view
    await expect(page.locator('text=Workout').first()).toBeVisible({ timeout: 5000 });

    // Verify all exercises are visible in the list view
    // The ListView shows exercises in a compact format
    await expect(page.locator('text=Bench Press')).toBeVisible();
    await expect(page.locator('text=Squat')).toBeVisible();
    await expect(page.locator('text=Plank')).toBeVisible();
    await expect(page.locator('text=Wall Sit')).toBeVisible();
    await expect(page.locator('text=Push-ups')).toBeVisible();
    await expect(page.locator('text=Pull-ups')).toBeVisible();

    // Verify exercise details are shown with reps/weight/time
    await expect(page.locator('text=10 reps')).toBeVisible();
    await expect(page.locator('text=135 lbs')).toBeVisible();
    await expect(page.locator('text=2 min')).toBeVisible();

    // Step 7: Verify in Calendar View
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });

    // Get today's date number
    const todayDate = new Date().getDate();

    // Find today's date cell in the calendar
    // The calendar uses a class for today's date
    const todayCell = page.locator('.today, [class*="today"]').first();
    await expect(todayCell).toBeVisible({ timeout: 5000 });

    // Verify the workout indicator is present on today's date
    // The calendar shows a workout indicator (could be a dot, number, or other visual)
    const workoutIndicator = page.locator(`text=/.*${todayDate}.*/`).first();
    await expect(workoutIndicator).toBeVisible();

    // Click on the workout link to navigate to workout detail page
    // Use data-testid to reliably find the workout link
    const workoutLink = page.locator('[data-testid^="calendar-workout-"]').first();
    await expect(workoutLink).toBeVisible({ timeout: 5000 });
    await workoutLink.click();

    // Wait for navigation to workout detail page
    await page.waitForURL(/\/workouts\/\d+/, { timeout: 5000 });

    // Verify we're on the workout detail page
    await expect(page.locator('h2:has-text("Workout Details")')).toBeVisible({ timeout: 5000 });

    // Verify all 6 exercises with their complete details are shown on the detail page
    // Weight exercises
    await expect(page.locator('text=Bench Press').first()).toBeVisible();
    await expect(page.locator('text=10 reps').first()).toBeVisible();
    await expect(page.locator('text=135 lbs').first()).toBeVisible();

    await expect(page.locator('text=Squat').first()).toBeVisible();
    await expect(page.locator('text=8 reps').first()).toBeVisible();
    await expect(page.locator('text=185 lbs').first()).toBeVisible();

    // Isometric/time exercises
    await expect(page.locator('text=Plank').first()).toBeVisible();
    await expect(page.locator('text=1 reps').first()).toBeVisible();
    await expect(page.locator('text=2 min').first()).toBeVisible();

    await expect(page.locator('text=Wall Sit').first()).toBeVisible();
    await expect(page.locator('text=1.5 min').first()).toBeVisible();

    // Bodyweight exercises
    await expect(page.locator('text=Push-ups').first()).toBeVisible();
    await expect(page.locator('text=20 reps').first()).toBeVisible();

    await expect(page.locator('text=Pull-ups').first()).toBeVisible();
    await expect(page.locator('text=12 reps').first()).toBeVisible();

    // Step 8: Create a second workout with improved metrics on a future date
    // Navigate back to timeline
    await page.goto('/');
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Navigate to New Workout page using FAB
    await clickFabMenuItem(page, 'New Workout');
    await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({ timeout: 5000 });

    // Set date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    await page.fill('input[type="date"]', tomorrowDateStr);

    // Wait for the form to be fully loaded
    await page.waitForLoadState('networkidle');

    // Add exercises with improved metrics
    const improvedExercises = [
      // Improved reps
      { name: 'Bench Press', reps: '12', weight: '135', time: '', expectedBadge: 'NEW REPS' },
      // Improved weight
      { name: 'Squat', reps: '8', weight: '200', time: '', expectedBadge: 'NEW WEIGHT' },
      // Improved time
      { name: 'Plank', reps: '1', weight: '', time: '2.5', expectedBadge: 'NEW TIME' },
      // No improvement (same as before)
      { name: 'Push-ups', reps: '20', weight: '', time: '', expectedBadge: null },
    ];

    // Add all exercises using the helper
    for (const exercise of improvedExercises) {
      await addExercise(page, exercise);
    }

    // Submit the second workout
    await page.getByRole('button', { name: 'Save Workout' }).click();

    // Wait for redirect to Timeline page
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h2:has-text("Activity Timeline")')).toBeVisible({ timeout: 5000 });

    // Step 9: Verify NEW badges in List View
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Find the second workout by its date using data-testid
    const tomorrowWorkout = page.locator(`[data-testid="workout-card-${tomorrowDateStr}"]`);
    await expect(tomorrowWorkout).toBeVisible({ timeout: 5000 });

    // Verify NEW REPS badge appears for Bench Press
    await expect(tomorrowWorkout.locator('text=NEW REPS')).toBeVisible({ timeout: 5000 });

    // Verify NEW WEIGHT badge appears for Squat
    await expect(tomorrowWorkout.locator('text=NEW WEIGHT')).toBeVisible({ timeout: 5000 });

    // Verify NEW TIME badge appears for Plank
    await expect(tomorrowWorkout.locator('text=NEW TIME')).toBeVisible({ timeout: 5000 });

    // Verify Push-ups doesn't have a badge (no improvement)
    const pushUpsExercise = tomorrowWorkout.locator('text=Push-ups').locator('..');
    await expect(pushUpsExercise.locator('text=NEW')).not.toBeVisible();

    // Step 10: Verify NEW badges in Calendar View
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });

    // Click on tomorrow's workout
    const tomorrowWorkoutLink = page.locator('[data-testid^="calendar-workout-"]').last();
    await expect(tomorrowWorkoutLink).toBeVisible({ timeout: 5000 });
    await tomorrowWorkoutLink.click();

    // Wait for navigation to workout detail page
    await page.waitForURL(/\/workouts\/\d+/, { timeout: 5000 });

    // Verify we're on the workout detail page
    await expect(page.locator('h2:has-text("Workout Details")')).toBeVisible({ timeout: 5000 });

    // Verify NEW badges appear on the detail page
    await expect(page.locator('text=NEW REPS')).toBeVisible();
    await expect(page.locator('text=NEW WEIGHT')).toBeVisible();
    await expect(page.locator('text=NEW TIME')).toBeVisible();

    // Verify the improved values are displayed
    await expect(page.locator('text=Bench Press')).toBeVisible();
    await expect(page.locator('text=12 reps')).toBeVisible();

    await expect(page.locator('text=Squat')).toBeVisible();
    await expect(page.locator('text=200 lbs')).toBeVisible();

    await expect(page.locator('text=Plank')).toBeVisible();
    await expect(page.locator('text=2.5 min')).toBeVisible();
  });
});
