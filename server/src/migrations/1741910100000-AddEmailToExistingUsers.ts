import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailToExistingUsers1741910100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE users SET email = 'chloe.m.summers@gmail.com' WHERE id = 1;
          UPDATE users SET email = 'nate@drnatejones.com' WHERE id = 2;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE users SET email = NULL`);
  }
}
