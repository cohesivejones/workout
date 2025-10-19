import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { addExercise } from '../helpers/workout';
import { clickFabMenuItem } from '../helpers/navigation';

test.describe('Create and Edit Workout', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should create a workout with 6+ exercises, then edit it with modifications', async ({
    page,
    request,
  }) => {
    // ===== PHASE 1: CREATE INITIAL WORKOUT =====

    // Step 1: Login
    await login(page);
    await clearTestData(request);

    // Step 2: Navigate to New Workout page using FAB
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });
    await clickFabMenuItem(page, 'New Workout');
    await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({ timeout: 5000 });

    // Step 3: Add 6 exercises with variety
    const initialExercises = [
      { name: 'Bench Press', reps: '10', weight: '135', time: '' },
      { name: 'Squat', reps: '8', weight: '185', time: '' },
      { name: 'Deadlift', reps: '5', weight: '225', time: '' },
      { name: 'Plank', reps: '1', weight: '', time: '2' },
      { name: 'Wall Sit', reps: '1', weight: '', time: '1.5' },
      { name: 'Push-ups', reps: '20', weight: '', time: '' },
    ];

    await page.waitForLoadState('networkidle');

    for (const exercise of initialExercises) {
      await addExercise(page, exercise);
    }

    // Verify all 6 exercises are added
    await expect(page.locator('text=Bench Press - 10 reps - 135 lbs')).toBeVisible();
    await expect(page.locator('text=Squat - 8 reps - 185 lbs')).toBeVisible();
    await expect(page.locator('text=Deadlift - 5 reps - 225 lbs')).toBeVisible();
    await expect(page.locator('text=Plank - 1 reps - 2 min')).toBeVisible();
    await expect(page.locator('text=Wall Sit - 1 reps - 1.5 min')).toBeVisible();
    await expect(page.locator('text=Push-ups - 20 reps')).toBeVisible();

    // Step 4: Save the workout
    await page.getByRole('button', { name: 'Save Workout' }).click();
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h2:has-text("Activity Timeline")')).toBeVisible({ timeout: 5000 });

    // Step 5: Navigate to edit page directly from List view
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    // Get today's date for finding the workout
    const today = new Date().toISOString().split('T')[0];
    const workoutCard = page.locator(`[data-testid="workout-card-${today}"]`);
    await expect(workoutCard).toBeVisible({ timeout: 5000 });

    // ===== PHASE 2: EDIT THE WORKOUT =====

    // Step 6: Click Edit button from List view
    const editLink = workoutCard.locator('a[title="Edit workout"]');
    await expect(editLink).toBeVisible({ timeout: 5000 });
    await editLink.click();
    await page.waitForURL(/\/workouts\/\d+\/edit/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Edit Workout' })).toBeVisible({
      timeout: 5000,
    });

    // Step 7: Toggle "With Instructor" checkbox
    const instructorCheckbox = page.locator('input[id="with-instructor"]');
    await expect(instructorCheckbox).not.toBeChecked();
    await instructorCheckbox.check();
    await expect(instructorCheckbox).toBeChecked();

    // Step 8: Delete Wall Sit exercise
    // Find the Wall Sit exercise in the list and click its remove button
    const wallSitExercise = page.locator('li:has-text("Wall Sit - 1 reps - 1.5 min")');
    await expect(wallSitExercise).toBeVisible();
    const removeButton = wallSitExercise.locator('button[title="Remove exercise"]');
    await removeButton.click();

    // Verify Wall Sit is removed
    await expect(page.locator('text=Wall Sit - 1 reps - 1.5 min')).not.toBeVisible();

    // Step 9: Modify existing exercises
    // We need to remove and re-add exercises with new values

    // Modify Bench Press: 10 reps → 12 reps (keep weight same)
    const benchPressExercise = page.locator('li:has-text("Bench Press - 10 reps - 135 lbs")');
    await expect(benchPressExercise).toBeVisible();
    await benchPressExercise.locator('button[title="Remove exercise"]').click();
    await expect(page.locator('text=Bench Press - 10 reps - 135 lbs')).not.toBeVisible();
    await addExercise(page, { name: 'Bench Press', reps: '12', weight: '135', time: '' });

    // Modify Squat: 185 lbs → 200 lbs (keep reps same)
    const squatExercise = page.locator('li:has-text("Squat - 8 reps - 185 lbs")');
    await expect(squatExercise).toBeVisible();
    await squatExercise.locator('button[title="Remove exercise"]').click();
    await expect(page.locator('text=Squat - 8 reps - 185 lbs')).not.toBeVisible();
    await addExercise(page, { name: 'Squat', reps: '8', weight: '200', time: '' });

    // Modify Deadlift: 5 reps → 6 reps, 225 lbs → 245 lbs
    const deadliftExercise = page.locator('li:has-text("Deadlift - 5 reps - 225 lbs")');
    await expect(deadliftExercise).toBeVisible();
    await deadliftExercise.locator('button[title="Remove exercise"]').click();
    await expect(page.locator('text=Deadlift - 5 reps - 225 lbs')).not.toBeVisible();
    await addExercise(page, { name: 'Deadlift', reps: '6', weight: '245', time: '' });

    // Modify Plank: 2 min → 2.5 min
    const plankExercise = page.locator('li:has-text("Plank - 1 reps - 2 min")');
    await expect(plankExercise).toBeVisible();
    await plankExercise.locator('button[title="Remove exercise"]').click();
    await expect(page.locator('text=Plank - 1 reps - 2 min')).not.toBeVisible();
    await addExercise(page, { name: 'Plank', reps: '1', weight: '', time: '2.5' });

    // Step 10: Add 2 new exercises
    await addExercise(page, { name: 'Dumbbell Rows', reps: '12', weight: '50', time: '' });
    await addExercise(page, { name: 'Lunges', reps: '15', weight: '', time: '' });

    // Step 11: Verify we have 7 exercises total (6 - 1 deleted + 2 new)
    const exerciseList = page.locator('[data-testid="exercise-list"] li');
    await expect(exerciseList).toHaveCount(7);

    // Verify all modified and new exercises are present
    await expect(page.locator('text=Bench Press - 12 reps - 135 lbs')).toBeVisible();
    await expect(page.locator('text=Squat - 8 reps - 200 lbs')).toBeVisible();
    await expect(page.locator('text=Deadlift - 6 reps - 245 lbs')).toBeVisible();
    await expect(page.locator('text=Plank - 1 reps - 2.5 min')).toBeVisible();
    await expect(page.locator('text=Push-ups - 20 reps')).toBeVisible();
    await expect(page.locator('text=Dumbbell Rows - 12 reps - 50 lbs')).toBeVisible();
    await expect(page.locator('text=Lunges - 15 reps')).toBeVisible();

    // Verify deleted exercise is NOT present
    await expect(page.locator('text=Wall Sit')).not.toBeVisible();

    // Step 12: Save the updated workout
    await page.getByRole('button', { name: 'Update Workout' }).click();
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h2:has-text("Activity Timeline")')).toBeVisible({ timeout: 5000 });

    // ===== PHASE 3: VERIFY UPDATED WORKOUT =====

    // Step 13: Verify changes in List view
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    const updatedWorkoutCard = page.locator(`[data-testid="workout-card-${today}"]`);
    await expect(updatedWorkoutCard).toBeVisible({ timeout: 5000 });

    // Verify "With Instructor" indicator is shown in list view
    await expect(updatedWorkoutCard.locator('text=With Instructor')).toBeVisible();

    // Verify exercises are shown in list view with specific details
    await expect(updatedWorkoutCard.locator('text=Bench Press')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=12 reps - 135 lbs')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=Squat')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=8 reps - 200 lbs')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=Dumbbell Rows')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=12 reps - 50 lbs')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=Lunges')).toBeVisible();
    await expect(updatedWorkoutCard.locator('text=15 reps')).toBeVisible();

    // Step 14: Navigate to workout detail page via Calendar view
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });

    // Find today's workout in calendar and click it
    const calendarWorkoutLink = page.locator('[data-testid^="calendar-workout-"]').first();
    await expect(calendarWorkoutLink).toBeVisible({ timeout: 5000 });
    await calendarWorkoutLink.click();

    // Wait for navigation to workout detail page
    await page.waitForURL(/\/workouts\/\d+/, { timeout: 5000 });
    await expect(page.locator('h2:has-text("Workout Details")')).toBeVisible({ timeout: 5000 });

    // Step 15: Verify all changes persisted on detail page

    // Verify "With Instructor" is shown
    await expect(page.locator('text=With Instructor')).toBeVisible();

    // Verify modified exercises with new values
    await expect(page.locator('text=Bench Press').first()).toBeVisible();
    await expect(page.locator('text=12 reps').first()).toBeVisible();
    await expect(page.locator('text=135 lbs').first()).toBeVisible();

    await expect(page.locator('text=Squat').first()).toBeVisible();
    await expect(page.locator('text=8 reps').first()).toBeVisible();
    await expect(page.locator('text=200 lbs').first()).toBeVisible();

    await expect(page.locator('text=Deadlift').first()).toBeVisible();
    await expect(page.locator('text=6 reps').first()).toBeVisible();
    await expect(page.locator('text=245 lbs').first()).toBeVisible();

    await expect(page.locator('text=Plank').first()).toBeVisible();
    await expect(page.locator('text=2.5 min').first()).toBeVisible();

    // Verify unchanged exercise
    await expect(page.locator('text=Push-ups').first()).toBeVisible();
    await expect(page.locator('text=20 reps').first()).toBeVisible();

    // Verify new exercises
    await expect(page.locator('text=Dumbbell Rows').first()).toBeVisible();
    await expect(page.locator('text=50 lbs').first()).toBeVisible();

    await expect(page.locator('text=Lunges').first()).toBeVisible();
    await expect(page.locator('text=15 reps').first()).toBeVisible();

    // Verify deleted exercise is NOT present
    await expect(page.locator('text=Wall Sit')).not.toBeVisible();
  });
});
