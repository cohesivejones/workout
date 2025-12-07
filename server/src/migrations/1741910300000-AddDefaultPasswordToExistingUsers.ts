import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class AddDefaultPasswordToExistingUsers1741910300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generate a hashed password for "changeme"
    const saltRounds = 10;
    const defaultPassword = await bcrypt.hash('changeme', saltRounds);

    // Update all existing users with the default password
    await queryRunner.query(
      `
            UPDATE "users" SET "password" = $1 WHERE "password" IS NULL
        `,
      [defaultPassword]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set passwords back to NULL
    await queryRunner.query(`
            UPDATE "users" SET "password" = NULL
        `);
  }
}
