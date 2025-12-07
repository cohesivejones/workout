import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserChloe1746070000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delete all related data for user with email 'chloe.m.summers@gmail.com' first (foreign key constraints)

    // Delete workout_exercises entries for Chloe's workouts
    await queryRunner.query(`
      DELETE FROM workout_exercises WHERE workout_id IN (
        SELECT id FROM workouts WHERE "userId" IN (
          SELECT id FROM users WHERE email = 'chloe.m.summers@gmail.com'
        )
      )
    `);

    // Delete workouts for Chloe
    await queryRunner.query(`
      DELETE FROM workouts WHERE "userId" IN (
        SELECT id FROM users WHERE email = 'chloe.m.summers@gmail.com'
      )
    `);

    // Delete exercises for Chloe
    await queryRunner.query(`
      DELETE FROM exercises WHERE "userId" IN (
        SELECT id FROM users WHERE email = 'chloe.m.summers@gmail.com'
      )
    `);

    // Delete pain scores for Chloe
    await queryRunner.query(`
      DELETE FROM pain_scores WHERE "userId" IN (
        SELECT id FROM users WHERE email = 'chloe.m.summers@gmail.com'
      )
    `);

    // Delete sleep scores for Chloe
    await queryRunner.query(`
      DELETE FROM sleep_scores WHERE "userId" IN (
        SELECT id FROM users WHERE email = 'chloe.m.summers@gmail.com'
      )
    `);

    // Finally, delete the user
    await queryRunner.query(`
      DELETE FROM users WHERE email = 'chloe.m.summers@gmail.com'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Cannot reliably restore deleted user data, so down migration is a no-op
    console.log(
      'Cannot restore deleted user data for chloe.m.summers@gmail.com. This migration is irreversible.'
    );
  }
}
