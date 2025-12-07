import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordToUsers1741910200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN "password" varchar(255)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "password"
        `);
  }
}
