import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { clearTestData } from '../helpers/testData';
import { addExercise, setWorkoutDate } from '../helpers/workout';
import { clickFabMenuItem } from '../helpers/navigation';

/**
 * Dashboard Alphabetical Navigation E2E Test
 *
 * This test creates workout data with progressive training (increasing reps and weight)
 * and verifies that the alphabetical navigation feature works correctly.
 */
test.describe('Dashboard Alphabetical Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('user can navigate exercise dashboard', async ({ page, request }) => {
    // ===== PHASE 1: LOGIN AND CLEAR DATA =====
    await login(page);
    await clearTestData(request);

    // ===== PHASE 2: CREATE 6 WORKOUTS WITH PROGRESSIVE TRAINING =====
    // We'll create workouts over the past month with increasing weight/reps
    // Using exercises that cover different letters: Bench Press (B), Deadlift (D), Squats (S)

    const today = new Date();
    const workoutDates: Date[] = [];

    // Generate 6 workout dates spread over past 30 days
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 5); // Every ~5 days
      workoutDates.push(date);
    }

    // Progressive training pattern - 6 workouts
    const progressionPlan = [
      { reps: '8', benchWeight: '135', squatWeight: '185', deadliftWeight: '225' }, // Workout 1
      { reps: '10', benchWeight: '135', squatWeight: '185', deadliftWeight: '225' }, // Workout 2
      { reps: '8', benchWeight: '145', squatWeight: '205', deadliftWeight: '245' }, // Workout 3
      { reps: '10', benchWeight: '145', squatWeight: '205', deadliftWeight: '245' }, // Workout 4
      { reps: '8', benchWeight: '155', squatWeight: '225', deadliftWeight: '275' }, // Workout 5
      { reps: '10', benchWeight: '155', squatWeight: '225', deadliftWeight: '275' }, // Workout 6
    ];

    for (let i = 0; i < 6; i++) {
      // Navigate to List view
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForURL('/?view=list', { timeout: 5000 });

      // Click FAB to create new workout
      await clickFabMenuItem(page, 'New Workout');
      await page.waitForLoadState('networkidle');

      // Set the workout date
      await setWorkoutDate(page, workoutDates[i]);

      // Add exercises with progressive weights
      const plan = progressionPlan[i];

      await addExercise(page, {
        name: 'Bench Press',
        reps: plan.reps,
        weight: plan.benchWeight,
      });

      await addExercise(page, {
        name: 'Squats',
        reps: plan.reps,
        weight: plan.squatWeight,
      });

      await addExercise(page, {
        name: 'Deadlift',
        reps: plan.reps,
        weight: plan.deadliftWeight,
      });

      // Save the workout
      await page.getByRole('button', { name: 'Save Workout' }).click();
      await page.waitForURL('/', { timeout: 5000 });
    }

    // ===== PHASE 3: NAVIGATE TO DASHBOARD =====
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for charts to render
    await page.waitForTimeout(1000);

    // ===== PHASE 4: VERIFY ALPHABETICAL NAVIGATION =====

    // Check that alphabet navigation is visible
    const alphabetNav = page.getByRole('navigation', { name: 'Jump to exercise by letter' });
    await expect(alphabetNav).toBeVisible();

    // Verify we have exercises displayed
    const exerciseHeadings = page.locator('h4');
    const exerciseCount = await exerciseHeadings.count();
    expect(exerciseCount).toBeGreaterThanOrEqual(3); // We should have at least Bench Press, Deadlift, Squats

    // Verify exercises are in alphabetical order
    const exerciseNames = await exerciseHeadings.allTextContents();
    const sortedNames = [...exerciseNames].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(exerciseNames).toEqual(sortedNames);

    // ===== PHASE 5: TEST ALPHABET NAVIGATION FOR EACH LETTER =====

    // Test "B" for Bench Press
    const letterB = page.getByRole('button', { name: 'Jump to exercises starting with B' });
    await expect(letterB).toBeVisible();
    await letterB.click();
    await page.waitForTimeout(500); // Wait for smooth scroll

    // Verify Bench Press section is in viewport
    const benchPressHeading = page.getByRole('heading', { name: 'Bench Press', level: 4 });
    await expect(benchPressHeading).toBeInViewport();

    // Verify the chart is visible for Bench Press
    const benchPressSection = page.locator('#letter-B').locator('..').locator('..');
    const benchPressChart = benchPressSection.locator('canvas, svg').first();
    await expect(benchPressChart).toBeVisible();

    // Test "D" for Deadlift
    const letterD = page.getByRole('button', { name: 'Jump to exercises starting with D' });
    await expect(letterD).toBeVisible();
    await letterD.click();
    await page.waitForTimeout(500);

    const deadliftHeading = page.getByRole('heading', { name: 'Deadlift', level: 4 });
    await expect(deadliftHeading).toBeInViewport();

    // Verify Deadlift chart is visible
    const deadliftSection = page.locator('#letter-D').locator('..').locator('..');
    const deadliftChart = deadliftSection.locator('canvas, svg').first();
    await expect(deadliftChart).toBeVisible();

    // Test "S" for Squats
    const letterS = page.getByRole('button', { name: 'Jump to exercises starting with S' });
    await expect(letterS).toBeVisible();
    await letterS.click();
    await page.waitForTimeout(500);

    const squatsHeading = page.getByRole('heading', { name: 'Squats', level: 4 });
    await expect(squatsHeading).toBeInViewport();

    // Verify Squats chart is visible
    const squatsSection = page.locator('#letter-S').locator('..').locator('..');
    const squatsChart = squatsSection.locator('canvas, svg').first();
    await expect(squatsChart).toBeVisible();

    // ===== PHASE 6: VERIFY LETTER GROUPING =====

    // Verify letter headings exist for B, D, S
    await expect(page.getByRole('heading', { name: 'B', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'D', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'S', level: 3 })).toBeVisible();

    // ===== PHASE 7: TEST MOBILE VIEWPORT =====

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Alphabet nav should still be visible on mobile
    await expect(alphabetNav).toBeVisible();

    // Should be able to navigate on mobile
    await letterB.scrollIntoViewIfNeeded();
    await letterB.click();
    await page.waitForTimeout(500);

    // Verify Bench Press is still accessible
    await expect(benchPressHeading).toBeVisible();

    // ===== PHASE 8: TEST STICKY BEHAVIOR =====

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Get initial position of alphabet nav
    const initialBox = await alphabetNav.boundingBox();
    expect(initialBox).not.toBeNull();

    // Scroll down the page
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    // Alphabet nav should still be visible (sticky)
    await expect(alphabetNav).toBeVisible();

    // Verify sticky behavior - position should be relatively stable
    const scrolledBox = await alphabetNav.boundingBox();
    expect(scrolledBox).not.toBeNull();

    if (scrolledBox && initialBox) {
      // Y position should be relatively stable for sticky behavior
      expect(Math.abs(scrolledBox.y - initialBox.y)).toBeLessThan(150);
    }
  });
});
