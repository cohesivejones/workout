import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWithInstructorToWorkout1709323200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE workouts
            ADD COLUMN "withInstructor" BOOLEAN NOT NULL DEFAULT FALSE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE workouts
            DROP COLUMN "withInstructor"
        `);
  }
}
