import { APIRequestContext } from '@playwright/test';

/**
 * Clear all test data for the test user via the test-only API endpoint
 * This includes workouts, pain scores, sleep scores, and related data
 */
export async function clearTestData(request: APIRequestContext): Promise<void> {
  try {
    await request.delete('http://localhost:5001/api/test/clear-test-data');
  } catch (error) {
    console.warn('Failed to clear test data:', error);
  }
}
