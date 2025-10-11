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
    await page.fill('input[placeholder="Time (min)"]', exercise.time);
  }

  // Click Add Exercise button
  await page.getByRole('button', { name: 'Add Exercise' }).click();

  // Wait for exercise to be added to the list
  await expect(page.locator(`text=${exercise.name} - ${exercise.reps} reps`)).toBeVisible({
    timeout: 3000,
  });
}
