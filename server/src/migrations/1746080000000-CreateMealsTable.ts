import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMealsTable1746080000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "meals" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "date" date NOT NULL,
                "description" text NOT NULL,
                "calories" decimal(10,2) NOT NULL,
                "protein" decimal(10,2) NOT NULL,
                "carbs" decimal(10,2) NOT NULL,
                "fat" decimal(10,2) NOT NULL,
                CONSTRAINT "PK_meals" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meals"`);
  }
}
