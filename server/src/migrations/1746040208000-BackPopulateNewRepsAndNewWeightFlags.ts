import { MigrationInterface, QueryRunner } from "typeorm";

export class BackPopulateNewRepsAndNewWeightFlags1746040208000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // This query uses window functions to compare each workout exercise with the previous one
    // for the same user and exercise, ordered by workout date
    await queryRunner.query(`
      WITH workout_exercises_with_prev AS (
        SELECT 
          we.workout_id,
          we.exercise_id,
          we.reps,
          we.weight,
          LAG(we.reps) OVER (
            PARTITION BY w."userId", we.exercise_id 
            ORDER BY w.date
          ) as prev_reps,
          LAG(we.weight) OVER (
            PARTITION BY w."userId", we.exercise_id 
            ORDER BY w.date
          ) as prev_weight
        FROM 
          workout_exercises we
        JOIN 
          workouts w ON we.workout_id = w.id
      )
      UPDATE workout_exercises we
      SET 
        new_reps = CASE 
          WHEN prev.prev_reps IS NULL THEN false -- First workout with this exercise
          WHEN we.reps != prev.prev_reps THEN true
          ELSE false
        END,
        new_weight = CASE 
          WHEN prev.prev_weight IS NULL THEN false -- First workout with this exercise
          WHEN (we.weight IS NULL AND prev.prev_weight IS NOT NULL) THEN true
          WHEN (we.weight IS NOT NULL AND prev.prev_weight IS NULL) THEN true
          WHEN (we.weight != prev.prev_weight) THEN true
          ELSE false
        END
      FROM workout_exercises_with_prev prev
      WHERE 
        we.workout_id = prev.workout_id AND
        we.exercise_id = prev.exercise_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reset all flags to false
    await queryRunner.query(`
      UPDATE workout_exercises
      SET new_reps = false, new_weight = false
    `);
  }
}
