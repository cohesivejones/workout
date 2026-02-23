import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { addExercise, setWorkoutDate } from '../helpers/workout';
import { clickFabMenuItem } from '../helpers/navigation';

test.describe('Exercise Progression Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('complete user journey - tracks exercise progression over time with charts and PR indicators', async ({
    page,
    request,
  }) => {
    // ============================================
    // SETUP: Login and clear existing data
    // ============================================
    await login(page);
    await clearTestData(request);

    // ============================================
    // STEP 1: Create historical workout data to build progression
    // Create 4 workouts over 3 weeks showing progressive overload
    // ============================================
    const workouts = [
      { daysAgo: 21, name: 'Bench Press', reps: '8', weight: '135' },
      { daysAgo: 14, name: 'Bench Press', reps: '10', weight: '135' }, // Rep PR
      { daysAgo: 7, name: 'Bench Press', reps: '10', weight: '145' }, // Weight PR
      { daysAgo: 0, name: 'Bench Press', reps: '12', weight: '145' }, // Rep PR
    ];

    for (const workout of workouts) {
      await page.goto('/');
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForURL('/?view=list', { timeout: 5000 });

      await clickFabMenuItem(page, 'New Workout');
      await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({
        timeout: 5000,
      });

      const workoutDate = new Date();
      workoutDate.setDate(workoutDate.getDate() - workout.daysAgo);
      await setWorkoutDate(page, workoutDate);

      await page.waitForLoadState('networkidle');
      await addExercise(page, {
        name: workout.name,
        reps: workout.reps,
        weight: workout.weight,
        time: '',
      });

      await page.getByRole('button', { name: 'Save Workout' }).click();
      await page.waitForURL(/\/workouts\/\d+/, { timeout: 10000 });
      await expect(page.locator('h2:has-text("Workout Details")')).toBeVisible({ timeout: 5000 });
    }

    // ============================================
    // STEP 2: Verify PR badge on the most recent workout (already on workout show page)
    // ============================================
    // After creating the last workout, we're already on the workout show page
    // Verify NEW REPS badge is present on the most recent workout
    await expect(page.locator('text=NEW REPS')).toBeVisible({ timeout: 5000 });

    // ============================================
    // STEP 3: Verify exercise name is clickable link and navigate to progression page
    // ============================================
    const exerciseLink = page.getByRole('link', { name: /Bench Press/i });
    await expect(exerciseLink).toBeVisible({ timeout: 5000 });
    await exerciseLink.click();

    await page.waitForURL(/\/exercises\/\d+\/progression/, { timeout: 5000 });

    // ============================================
    // STEP 4: Verify progression page structure and content
    // ============================================

    // Verify exercise name heading
    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible({
      timeout: 5000,
    });

    // Verify both chart sections are present
    await expect(page.getByRole('heading', { name: /Weight Progression/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rep Progression/i })).toBeVisible();

    // Verify educational content section
    await expect(
      page.getByRole('heading', { name: /Understanding Progressive Overload/i })
    ).toBeVisible();

    // ============================================
    // STEP 5: Test back navigation
    // ============================================
    const backButton = page.getByRole('link', { name: /Back/i });
    await expect(backButton).toBeVisible();
    await backButton.click();

    await page.waitForURL('/', { timeout: 5000 });

    // ============================================
    // STEP 6: Edge case - Create new exercise with single workout
    // Verify progression page works with minimal history
    // ============================================
    await page.getByRole('button', { name: 'List' }).click();
    await page.waitForURL('/?view=list', { timeout: 5000 });

    await clickFabMenuItem(page, 'New Workout');
    await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({
      timeout: 5000,
    });

    await page.waitForLoadState('networkidle');
    await addExercise(page, { name: 'New Squat Exercise', reps: '5', weight: '225', time: '' });

    await page.getByRole('button', { name: 'Save Workout' }).click();
    await page.waitForURL(/\/workouts\/\d+/, { timeout: 10000 });

    // Click on the new exercise link
    const newExerciseLink = page.getByRole('link', { name: /New Squat Exercise/i });
    await expect(newExerciseLink).toBeVisible({ timeout: 5000 });
    await newExerciseLink.click();

    await page.waitForURL(/\/exercises\/\d+\/progression/, { timeout: 5000 });

    // Verify progression page works with single data point
    await expect(page.getByRole('heading', { name: 'New Squat Exercise' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: /Weight Progression/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rep Progression/i })).toBeVisible();
  });
});
