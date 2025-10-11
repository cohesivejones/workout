import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeightToWorkoutExercises1709337621000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE workout_exercises
            ADD COLUMN "weight" FLOAT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE workout_exercises
            DROP COLUMN "weight"
        `);
  }
}
