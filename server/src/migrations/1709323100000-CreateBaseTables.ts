import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBaseTables1709323100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create exercises table
    await queryRunner.query(`
      CREATE TABLE "exercises" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        CONSTRAINT "UQ_exercises_name" UNIQUE ("name"),
        CONSTRAINT "PK_exercises" PRIMARY KEY ("id")
      )
    `);

    // Create workouts table
    await queryRunner.query(`
      CREATE TABLE "workouts" (
        "id" SERIAL NOT NULL,
        "date" date NOT NULL,
        CONSTRAINT "UQ_workouts_date" UNIQUE ("date"),
        CONSTRAINT "PK_workouts" PRIMARY KEY ("id")
      )
    `);

    // Create workout_exercises table
    await queryRunner.query(`
      CREATE TABLE "workout_exercises" (
        "workout_id" integer NOT NULL,
        "exercise_id" integer NOT NULL,
        "reps" integer NOT NULL,
        CONSTRAINT "PK_workout_exercises" PRIMARY KEY ("workout_id", "exercise_id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "workout_exercises"
      ADD CONSTRAINT "FK_workout_exercises_workout"
      FOREIGN KEY ("workout_id") REFERENCES "workouts"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "workout_exercises"
      ADD CONSTRAINT "FK_workout_exercises_exercise"
      FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "workout_exercises" DROP CONSTRAINT "FK_workout_exercises_exercise"`);
    await queryRunner.query(`ALTER TABLE "workout_exercises" DROP CONSTRAINT "FK_workout_exercises_workout"`);
    await queryRunner.query(`DROP TABLE "workout_exercises"`);
    await queryRunner.query(`DROP TABLE "workouts"`);
    await queryRunner.query(`DROP TABLE "exercises"`);
  }
}
