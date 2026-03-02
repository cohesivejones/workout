import dataSource from '../../data-source';

/**
 * Cleans up all data associated with a specific user
 * @param userId - The user ID to clean up data for
 * @param options - Optional configuration for which tables to clean
 */
export async function cleanupUserData(
  userId: number,
  options?: {
    workouts?: boolean;
    exercises?: boolean;
    painScores?: boolean;
    sleepScores?: boolean;
  }
): Promise<void> {
  const {
    workouts = true,
    exercises = true,
    painScores = true,
    sleepScores = true,
  } = options || {};

  // Always clean workout_exercises first due to foreign key constraints
  if (workouts) {
    await dataSource.query(
      'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
      [userId]
    );
    await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [userId]);
  }

  if (exercises) {
    await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [userId]);
  }

  if (painScores) {
    await dataSource.query('DELETE FROM pain_scores WHERE "userId" = $1', [userId]);
  }

  if (sleepScores) {
    await dataSource.query('DELETE FROM sleep_scores WHERE "userId" = $1', [userId]);
  }
}

/**
 * Cleans up all test data from specified tables
 * Useful for beforeEach hooks that need a clean slate
 */
export async function cleanupAllTables(tables: string[]): Promise<void> {
  for (const table of tables) {
    await dataSource.query(`DELETE FROM ${table}`);
  }
}
