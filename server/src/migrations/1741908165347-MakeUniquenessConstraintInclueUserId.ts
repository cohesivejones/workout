import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUniquenessConstraintInclueUserId1741908165347 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
            ALTER TABLE workouts
            DROP CONSTRAINT "UQ_workouts_date",
            ADD CONSTRAINT workouts_date_user_id_key UNIQUE (date, "userId");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
            ALTER TABLE workouts
            DROP CONSTRAINT workouts_date_user_id_key,
            ADD CONSTRAINT "UQ_workouts_date" UNIQUE (date);
        `);
  }
}
