import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToWorkouts1741864911332 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE workouts
            ADD COLUMN "userId" integer;
            ALTER TABLE workouts
            ADD CONSTRAINT "fk_userId_workouts" FOREIGN KEY ("userId") 
            REFERENCES users (id);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE workouts
            DROP COLUMN "userId";
        `);
  }
}
