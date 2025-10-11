import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCascadeDeleteConstraint1746040210000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old constraints that don't have CASCADE
    // Using IF EXISTS makes this idempotent - won't fail if already dropped
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      DROP CONSTRAINT IF EXISTS "FK_workout_exercises_workout"
    `);

    await queryRunner.query(`
      ALTER TABLE workout_exercises
      DROP CONSTRAINT IF EXISTS "FK_workout_exercises_exercise"
    `);

    // Check if the CASCADE constraint already exists before trying to create it
    // This prevents errors if the migration runs multiple times
    const workoutConstraintExists = await queryRunner.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'workout_exercises_workout_id_fkey' 
      AND confdeltype = 'c'
    `);

    // Only create the workout constraint if it doesn't exist with CASCADE
    if (!workoutConstraintExists || workoutConstraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS "workout_exercises_workout_id_fkey"
      `);

      await queryRunner.query(`
        ALTER TABLE workout_exercises
        ADD CONSTRAINT "workout_exercises_workout_id_fkey"
        FOREIGN KEY ("workout_id")
        REFERENCES workouts(id)
        ON DELETE CASCADE
      `);
    }

    // Check if the exercise CASCADE constraint exists
    const exerciseConstraintExists = await queryRunner.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'workout_exercises_exercise_id_fkey' 
      AND confdeltype = 'c'
    `);

    // Only create the exercise constraint if it doesn't exist with CASCADE
    if (!exerciseConstraintExists || exerciseConstraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE workout_exercises
        DROP CONSTRAINT IF EXISTS "workout_exercises_exercise_id_fkey"
      `);

      await queryRunner.query(`
        ALTER TABLE workout_exercises
        ADD CONSTRAINT "workout_exercises_exercise_id_fkey"
        FOREIGN KEY ("exercise_id")
        REFERENCES exercises(id)
        ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to non-CASCADE constraints if needed
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      DROP CONSTRAINT IF EXISTS "workout_exercises_workout_id_fkey"
    `);

    await queryRunner.query(`
      ALTER TABLE workout_exercises
      ADD CONSTRAINT "workout_exercises_workout_id_fkey"
      FOREIGN KEY ("workout_id")
      REFERENCES workouts(id)
    `);

    await queryRunner.query(`
      ALTER TABLE workout_exercises
      DROP CONSTRAINT IF EXISTS "workout_exercises_exercise_id_fkey"
    `);

    await queryRunner.query(`
      ALTER TABLE workout_exercises
      ADD CONSTRAINT "workout_exercises_exercise_id_fkey"
      FOREIGN KEY ("exercise_id")
      REFERENCES exercises(id)
    `);
  }
}
