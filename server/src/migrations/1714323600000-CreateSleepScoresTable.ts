import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSleepScoresTable1714323600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "sleep_scores" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "date" date NOT NULL,
                "score" integer NOT NULL,
                "notes" text,
                CONSTRAINT "PK_sleep_scores" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_sleep_scores_userId_date" UNIQUE ("userId", "date")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sleep_scores"`);
  }
}
