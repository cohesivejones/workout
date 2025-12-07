import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToExercises1741907253544 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE exercises
            ADD COLUMN "userId" integer;
            ALTER TABLE exercises
            ADD CONSTRAINT "fk_userId_exercises" FOREIGN KEY ("userId") 
            REFERENCES users (id);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE exercises
            DROP COLUMN "userId";
        `);
  }
}
