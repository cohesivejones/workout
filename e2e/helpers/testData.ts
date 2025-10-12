import { APIRequestContext } from '@playwright/test';

/**
 * Clear all test data for the test user via the test-only API endpoint
 * This includes workouts, pain scores, sleep scores, and related data
 *
 * Note: This should be called AFTER servers are started (e.g., after login)
 * not in beforeEach, since the backend may not be running yet.
 */
export async function clearTestData(request: APIRequestContext): Promise<void> {
  try {
    const response = await request.delete('http://localhost:5001/api/test/clear-test-data');
    if (!response.ok()) {
      console.warn('Failed to clear test data:', response.status(), await response.text());
    }
  } catch (error) {
    console.warn('Failed to clear test data:', error);
  }
}
