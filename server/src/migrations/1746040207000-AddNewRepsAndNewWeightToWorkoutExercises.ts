import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewRepsAndNewWeightToWorkoutExercises1746040207000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      ADD COLUMN "new_reps" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN "new_weight" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      DROP COLUMN "new_reps",
      DROP COLUMN "new_weight"
    `);
  }
}
