import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeAllExercisesNates1741907330714 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`UPDATE exercises SET "userId" = 2`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`UPDATE exercises SET "userId" = NULL`);
  }
}
