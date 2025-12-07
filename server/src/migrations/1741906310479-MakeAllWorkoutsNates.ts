import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAllWorkoutsNates1741906310479 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`UPDATE workouts SET "userId" = 2`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`UPDATE workouts SET "userId" = NULL`);
  }
}
