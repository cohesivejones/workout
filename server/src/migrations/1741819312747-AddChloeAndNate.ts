import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChloeAndNate1741819312747 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO users (name) VALUES ('Chloe');
        INSERT INTO users (name) VALUES ('Nate');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users;`);
  }
}
