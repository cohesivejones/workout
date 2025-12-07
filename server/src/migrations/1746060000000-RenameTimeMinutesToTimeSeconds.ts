import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTimeMinutesToTimeSeconds1746060000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      RENAME COLUMN "time_minutes" TO "time_seconds"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workout_exercises
      RENAME COLUMN "time_seconds" TO "time_minutes"
    `);
  }
}
