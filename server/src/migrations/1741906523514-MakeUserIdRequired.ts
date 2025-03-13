import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUserIdRequired1741906523514 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE workouts ALTER COLUMN "userId" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE workouts ALTER COLUMN "userId" DROP NOT NULL;
    `);
  }
}
