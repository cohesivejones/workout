import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimeToWorkoutExercises1746040209000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      ADD COLUMN "time_minutes" FLOAT NULL,
      ADD COLUMN "new_time" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      DROP COLUMN "time_minutes",
      DROP COLUMN "new_time"
    `);
  }
}
