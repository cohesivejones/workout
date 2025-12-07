import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePainScoresTable1711104100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "pain_scores" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "date" date NOT NULL,
                "score" integer NOT NULL,
                "notes" text,
                CONSTRAINT "PK_pain_scores" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_pain_scores_userId_date" UNIQUE ("userId", "date")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pain_scores"`);
  }
}
