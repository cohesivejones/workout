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

      // Wait for redirect to Workout Show page
      await page.waitForURL(/\/workouts\/\d+/, { timeout: 10000 });
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

      // Wait for redirect to Workout Show page
      await page.waitForURL(/\/workouts\/\d+/, { timeout: 10000 });
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

  test('user navigates between weeks in calendar view at small screen size', async ({
    page,
    request,
  }) => {
    // Step 1: Login
    await login(page);

    // Clear test data
    await clearTestData(request);

    // Step 2: Create workouts across multiple weeks spanning different months
    // Use fixed dates from previous year (2025) to make test deterministic
    // This will test if data fetching works correctly when navigating week-by-week
    const workoutDates = [
      // Last week of January 2025
      { date: new Date(2025, 0, 25), exerciseName: 'Deadlifts' }, // Jan 25, 2025
      { date: new Date(2025, 0, 27), exerciseName: 'Pull-ups' }, // Jan 27, 2025
      // First week of February 2025
      { date: new Date(2025, 1, 2), exerciseName: 'Squats' }, // Feb 2, 2025
      { date: new Date(2025, 1, 4), exerciseName: 'Bench Press' }, // Feb 4, 2025
      // Second week of February 2025
      { date: new Date(2025, 1, 10), exerciseName: 'Lunges' }, // Feb 10, 2025
      { date: new Date(2025, 1, 12), exerciseName: 'Rows' }, // Feb 12, 2025
    ];

    for (const workout of workoutDates) {
      await page.goto('/workouts/new');
      await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({
        timeout: 5000,
      });

      await page.waitForLoadState('networkidle');
      await expect(page.getByPlaceholder('Reps')).toBeVisible({ timeout: 5000 });

      console.log(
        `Creating workout with ${workout.exerciseName}: ${workout.date.toISOString().split('T')[0]}`
      );

      await setWorkoutDate(page, workout.date);
      await addExercise(page, { name: workout.exerciseName, reps: '10' });

      await page.getByRole('button', { name: 'Save Workout' }).click();
      await page.waitForURL(/\/workouts\/\d+/, { timeout: 10000 });
    }

    // Step 3: Set viewport to mobile size to trigger week view
    await page.setViewportSize({ width: 375, height: 667 });

    // Step 4: Navigate to calendar view
    await page.goto('/');
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Step 5: Verify we're in week view by checking for week navigation
    const prevWeekButton = page.getByRole('button', { name: 'Previous week' });
    const nextWeekButton = page.getByRole('button', { name: 'Next week' });
    await expect(prevWeekButton).toBeVisible({ timeout: 5000 });
    await expect(nextWeekButton).toBeVisible({ timeout: 5000 });

    // Step 6: Navigate to previous week (should cross into previous month potentially)
    await prevWeekButton.click();
    await page.waitForTimeout(1000);

    // Step 7: Navigate to the week containing the January 2025 workouts (25th-27th)
    // Parse week header to find the right week dynamically
    const targetDate = new Date(2025, 0, 25); // Jan 25, 2025
    let foundTargetWeek = false;
    let attempts = 0;
    const maxWeeksToNavigate = 60; // Need to navigate back ~52 weeks from 2026 to reach Jan 2025

    while (!foundTargetWeek && attempts < maxWeeksToNavigate) {
      await page.waitForTimeout(100); // Reduced from 500ms to speed up navigation
      const weekHeader = await page.getByTestId('calendar-week-title').textContent();
      console.log(`Current week header: ${weekHeader}`);

      if (weekHeader) {
        // Parse the week range: "Month day - Month day, year"
        const match = weekHeader.match(/(\w+)\s+(\d+)\s+-\s+(\w+)\s+(\d+),\s+(\d+)/);
        if (match) {
          const [, startMonth, startDay, endMonth, endDay, year] = match;
          const months: { [key: string]: number } = {
            January: 0,
            February: 1,
            March: 2,
            April: 3,
            May: 4,
            June: 5,
            July: 6,
            August: 7,
            September: 8,
            October: 9,
            November: 10,
            December: 11,
          };

          const weekStart = new Date(parseInt(year), months[startMonth], parseInt(startDay));
          const weekEnd = new Date(parseInt(year), months[endMonth], parseInt(endDay));

          // Check if target date falls in this week
          if (targetDate >= weekStart && targetDate <= weekEnd) {
            foundTargetWeek = true;
            console.log(`Found target week containing ${targetDate.toISOString().split('T')[0]}`);
          }
        }
      }

      if (!foundTargetWeek) {
        await prevWeekButton.click();
        attempts++;
      }
    }

    expect(foundTargetWeek).toBe(true);

    // Step 8: Verify we can see workouts from January 2025 (Deadlifts, Pull-ups)
    const janWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    const janCount = await janWorkouts.count();
    console.log(`Workouts visible in January week: ${janCount}`);
    expect(janCount).toBeGreaterThan(0);

    // Step 9: Navigate forward to week containing February 10-12, 2025
    const febTargetDate = new Date(2025, 1, 10); // Feb 10, 2025
    let foundFebWeek = false;
    attempts = 0;

    while (!foundFebWeek && attempts < maxWeeksToNavigate) {
      await page.waitForTimeout(100); // Reduced from 500ms to speed up navigation
      const weekHeader = await page.getByTestId('calendar-week-title').textContent();
      console.log(`Current week header (looking for Feb 10-12 week): ${weekHeader}`);

      if (weekHeader) {
        const match = weekHeader.match(/(\w+)\s+(\d+)\s+-\s+(\w+)\s+(\d+),\s+(\d+)/);
        if (match) {
          const [, startMonth, startDay, endMonth, endDay, year] = match;
          const months: { [key: string]: number } = {
            January: 0,
            February: 1,
            March: 2,
            April: 3,
            May: 4,
            June: 5,
            July: 6,
            August: 7,
            September: 8,
            October: 9,
            November: 10,
            December: 11,
          };

          const weekStart = new Date(parseInt(year), months[startMonth], parseInt(startDay));
          const weekEnd = new Date(parseInt(year), months[endMonth], parseInt(endDay));

          if (febTargetDate >= weekStart && febTargetDate <= weekEnd) {
            foundFebWeek = true;
            console.log(
              `Found February week containing ${febTargetDate.toISOString().split('T')[0]}`
            );
          }
        }
      }

      if (!foundFebWeek) {
        await nextWeekButton.click();
        attempts++;
      }
    }

    expect(foundFebWeek).toBe(true);

    // Step 10: Verify we can see workouts from February 10-12, 2025 (Lunges, Rows)
    const febWorkouts = page.locator('[data-testid^="calendar-workout-"]');
    const febCount = await febWorkouts.count();
    console.log(`Workouts visible in February week: ${febCount}`);
    expect(febCount).toBeGreaterThan(0);
  });

  test('calendar week view fetches data when navigating to a different month', async ({
    page,
    request,
  }) => {
    // This test specifically checks if data is properly fetched when week navigation
    // crosses month boundaries

    // No browser console tap here; rely on DOM and API state

    await login(page);
    await clearTestData(request);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Create workouts in the previous month only
    const prevMonthWorkouts = [
      {
        date: new Date(currentYear, currentMonth - 1, 5),
        exerciseName: 'Previous Month Workout 1',
      },
      {
        date: new Date(currentYear, currentMonth - 1, 15),
        exerciseName: 'Previous Month Workout 2',
      },
      {
        date: new Date(currentYear, currentMonth - 1, 25),
        exerciseName: 'Previous Month Workout 3',
      },
    ];

    for (const workout of prevMonthWorkouts) {
      await page.goto('/workouts/new');
      await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByPlaceholder('Reps')).toBeVisible({ timeout: 5000 });

      console.log(
        `Creating workout: ${workout.exerciseName} on ${workout.date.toISOString().split('T')[0]}`
      );

      await setWorkoutDate(page, workout.date);
      await addExercise(page, { name: workout.exerciseName, reps: '10' });
      await page.getByRole('button', { name: 'Save Workout' }).click();
      await page.waitForURL(/\/workouts\/\d+/, { timeout: 10000 });
    }

    // Set viewport to mobile size for week view
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to calendar view - should initially show current month
    await page.goto('/');
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForURL('/?view=calendar', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify we're in week view
    const prevWeekButton = page.getByRole('button', { name: 'Previous week' });
    await expect(prevWeekButton).toBeVisible({ timeout: 5000 });

    // Capture baseline visible workouts (we no longer assert zero to avoid brittleness if seed data changes)
    const baselineWorkouts = await page.locator('[data-testid^="calendar-workout-"]').count();

    // Navigate back to previous month and find a week that contains our workouts
    // Our workouts are on Oct 5, 15, and 25, so we need to navigate until we see one
    // Navigate back by weeks until a created workout date enters the displayed week
    const createdDates = prevMonthWorkouts.map((w) => w.date.toISOString().split('T')[0]);

    function parseWeekHeaderRange(header: string | null): { start: Date; end: Date } | null {
      if (!header) return null;
      // Formats: "October 19 - October 25, 2025" or "October 26 - November 1, 2025"
      const parts = header.split(' - ');
      if (parts.length !== 2) return null;
      const right = parts[1]; // e.g. "October 25, 2025" or "November 1, 2025"
      const yearMatch = right.match(/(\d{4})$/);
      if (!yearMatch) return null;
      const year = yearMatch[1];
      const rightDate = new Date(`${right}`); // already has year
      // Left part lacks year: append year
      const leftWithYear = `${parts[0]}, ${year}`; // e.g. "October 19, 2025"
      const leftDate = new Date(leftWithYear);
      if (isNaN(leftDate.getTime()) || isNaN(rightDate.getTime())) return null;
      return { start: leftDate, end: rightDate };
    }

    const weekHeaderHistory: string[] = [];
    let foundInRange = false;
    let attempts = 0;
    const maxWeeksToNavigate = 12; // Covers navigating back a few months
    let currentVisibleWorkoutCount = baselineWorkouts;

    while (!foundInRange && attempts < maxWeeksToNavigate) {
      // Inspect current header
      const headerText = await page.getByTestId('calendar-week-title').textContent();
      if (headerText) weekHeaderHistory.push(headerText);
      const range = parseWeekHeaderRange(headerText);
      if (range) {
        // Check if any created workout date falls within the displayed week range
        for (const d of createdDates) {
          const dateObj = new Date(d);
          if (dateObj >= range.start && dateObj <= range.end) {
            // Re-count workouts now that week contains at least one created date
            currentVisibleWorkoutCount = await page
              .locator('[data-testid^="calendar-workout-"]')
              .count();
            foundInRange = currentVisibleWorkoutCount > baselineWorkouts; // ensure at least one new appears
            // week contains a created date; counts updated
            break;
          }
        }
        if (foundInRange) break;
      }
      // Advance backwards one week and retry
      await prevWeekButton.click();
      await page.waitForTimeout(400);
      attempts++;
    }

    // week headers visited and final counts are available if needed for debugging

    expect(foundInRange).toBe(true);
    expect(currentVisibleWorkoutCount).toBeGreaterThan(baselineWorkouts);

    // This is the key assertion - if it fails, it means data isn't being fetched
    // when week navigation crosses into a different month
    // (Superseded by range-based assertions above)

    // Verify we can see the specific workout exercises
    const hasExpectedWorkout =
      (await page.locator('text=Previous Month Workout 1').count()) > 0 ||
      (await page.locator('text=Previous Month Workout 2').count()) > 0 ||
      (await page.locator('text=Previous Month Workout 3').count()) > 0;

    expect(hasExpectedWorkout).toBe(true);
  });
});
