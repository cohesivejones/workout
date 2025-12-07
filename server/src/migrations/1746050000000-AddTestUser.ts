import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class AddTestUser1746050000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generate a hashed password for "Secure123!"
    const saltRounds = 10;
    const testPassword = await bcrypt.hash('Secure123!', saltRounds);

    // Check if test user already exists
    const existingUser = await queryRunner.query(`SELECT id FROM "users" WHERE "email" = $1`, [
      'test@foo.com',
    ]);

    // Only insert if user doesn't exist
    if (existingUser.length === 0) {
      await queryRunner.query(
        `
            INSERT INTO "users" ("name", "email", "password") 
            VALUES ($1, $2, $3)
        `,
        ['Test User', 'test@foo.com', testPassword]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove test user
    await queryRunner.query(`
            DELETE FROM "users" WHERE "email" = 'test@foo.com'
        `);
  }
}
