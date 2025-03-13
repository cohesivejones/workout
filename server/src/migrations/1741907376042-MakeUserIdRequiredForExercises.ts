import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUserIdRequiredForExercises1741907376042
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE exercises ALTER COLUMN "userId" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE exercises ALTER COLUMN "userId" DROP NOT NULL;
    `);
  }
}
