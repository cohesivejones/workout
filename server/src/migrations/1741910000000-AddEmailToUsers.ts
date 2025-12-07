import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailToUsers1741910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN "email" varchar(255) NULL;
            CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") WHERE "email" IS NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "IDX_users_email";
            ALTER TABLE "users" DROP COLUMN "email";
        `);
  }
}
