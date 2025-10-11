import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToWorkoutExercises1709323785000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, drop the existing foreign key constraint
    await queryRunner.query(`
            ALTER TABLE workout_exercises
            DROP CONSTRAINT IF EXISTS "workout_exercises_workout_id_fkey"
        `);

    // Add the foreign key constraint with ON DELETE CASCADE
    await queryRunner.query(`
            ALTER TABLE workout_exercises
            ADD CONSTRAINT "workout_exercises_workout_id_fkey"
            FOREIGN KEY ("workout_id")
            REFERENCES workouts(id)
            ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to the original constraint without cascade
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
  }
}
