import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWeightEntriesTable1746090000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "weight_entries" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "date" date NOT NULL,
                "weight" decimal(10,2) NOT NULL,
                CONSTRAINT "PK_weight_entries" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_weight_entries_userId_date" UNIQUE ("userId", "date")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "weight_entries"`);
  }
}
