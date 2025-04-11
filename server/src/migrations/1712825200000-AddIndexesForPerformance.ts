import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesForPerformance1712825200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index on workouts.date for faster sorting
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workouts_date" ON "workouts" ("date" DESC)`);
    
    // Add index on workout_exercises for faster joins
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workout_exercises_exercise_id" ON "workout_exercises" ("exercise_id")`);
    
    // Add index on workout_id for faster joins
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workout_exercises_workout_id" ON "workout_exercises" ("workout_id")`);
    
    // Add composite index for the specific query pattern
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workout_exercises_exercise_workout" ON "workout_exercises" ("exercise_id", "workout_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workouts_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workout_exercises_exercise_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workout_exercises_workout_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workout_exercises_exercise_workout"`);
  }
}
