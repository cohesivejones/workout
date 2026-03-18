import { Page, expect } from '@playwright/test';

/**
 * Exercise data structure for adding exercises to a workout
 */
export interface Exercise {
  name: string;
  reps: string;
  weight?: string;
  time?: string;
}

/**
 * Set the workout date in the workout form
 * @param page - Playwright page object
 * @param date - Date object or date string in YYYY-MM-DD format
 */
export async function setWorkoutDate(page: Page, date: Date | string): Promise<void> {
  let dateStr: string;

  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else {
    dateStr = date;
  }

  const dateInput = page.locator('#workout-date');
  await dateInput.clear();
  await dateInput.fill(dateStr);
  await dateInput.press('Tab');
  await page.waitForTimeout(500);
}

/**
 * Add an exercise to a workout form
 * This helper handles the complete flow of adding an exercise:
 * - Selecting/creating the exercise name
 * - Filling in reps, weight, and time
 * - Clicking the Add Exercise button
 * - Waiting for confirmation that the exercise was added
 */
export async function addExercise(page: Page, exercise: Exercise): Promise<void> {
  // Click on the CreatableSelect control to focus it
  await page.locator('.reactSelect__control').click();

  // Type the exercise name
  await page.keyboard.type(exercise.name);

  // Press Enter to create/select the exercise
  await page.keyboard.press('Enter');

  // Wait a moment for the selection to register
  await page.waitForTimeout(500);

  // Fill in reps
  await page.fill('input[placeholder="Reps"]', exercise.reps);

  // Fill in weight if provided
  if (exercise.weight) {
    await page.fill('input[placeholder="Weight (lbs)"]', exercise.weight);
  }

  // Fill in time if provided
  if (exercise.time) {
    await page.fill('input[placeholder="Time (sec)"]', exercise.time);
  }

  // Click Add Exercise button
  const addButton = page.getByRole('button', { name: 'Add Exercise' });
  await addButton.click();

  // Convert exercise name to kebab-case for test ID (same logic as toKebabCase)
  const kebabCaseName = exercise.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Find the exercise element
  const addedExercise = page.getByTestId(`added-exercise-${kebabCaseName}`);

  // Scroll the element into view if needed (handles exercises below fold)
  await addedExercise.scrollIntoViewIfNeeded({ timeout: 5000 });

  // Wait for exercise to be visible
  await expect(addedExercise).toBeVisible({ timeout: 5000 });

  // Verify the exercise contains expected text
  await expect(addedExercise).toContainText(exercise.name);
  await expect(addedExercise).toContainText(`${exercise.reps} reps`);

  if (exercise.weight) {
    // Convert lbs to kg for display (same logic as formatWeightWithKg)
    const lbs = Number(exercise.weight);
    const kg = Number((lbs * 0.453592).toFixed(1));
    await expect(addedExercise).toContainText(`${exercise.weight} lbs (${kg} kg)`);
  }

  if (exercise.time) {
    await expect(addedExercise).toContainText(`${exercise.time} sec`);
  }
}

/**
 * Assert that an exercise was added to the workout form
 * This verifies the exercise appears in the list with correct details
 */
export async function assertExerciseAdded(page: Page, exercise: Exercise): Promise<void> {
  // Convert exercise name to kebab-case for test ID
  const kebabCaseName = exercise.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Find the exercise using test ID
  const addedExercise = page.getByTestId(`added-exercise-${kebabCaseName}`);
  await expect(addedExercise).toBeVisible();

  // Verify the exercise contains expected text
  await expect(addedExercise).toContainText(exercise.name);
  await expect(addedExercise).toContainText(`${exercise.reps} reps`);

  if (exercise.weight) {
    // Convert lbs to kg for display (same logic as formatWeightWithKg)
    const lbs = Number(exercise.weight);
    const kg = Number((lbs * 0.453592).toFixed(1));
    await expect(addedExercise).toContainText(`${exercise.weight} lbs (${kg} kg)`);
  }

  if (exercise.time) {
    await expect(addedExercise).toContainText(`${exercise.time} sec`);
  }
}
