import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';
import { Exercise, Workout, DatabaseError } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Get all exercises
app.get('/exercises', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<Exercise>('SELECT * FROM exercises ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new exercise
app.post('/exercises', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const result = await pool.query<Exercise>(
      'INSERT INTO exercises (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all workouts with exercises
app.get('/workouts', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<Workout>(`
      SELECT 
        w.id,
        w.date,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'reps', we.reps
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        ) as exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN exercises e ON we.exercise_id = e.id
      GROUP BY w.id, w.date
      ORDER BY w.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new workout
app.post('/workouts', async (req: Request, res: Response) => {
  try {
    await pool.query('BEGIN');
    const { date, exercises } = req.body;

    // Insert workout
    const workoutResult = await pool.query<{ id: number }>(
      'INSERT INTO workouts (date) VALUES ($1) RETURNING id',
      [date]
    );
    const workoutId = workoutResult.rows[0].id;

    // Insert exercises and workout_exercises
    for (const exercise of exercises) {
      // Get or create exercise
      const exerciseResult = await pool.query<Exercise>(
        'INSERT INTO exercises (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [exercise.name]
      );
      const exerciseId = exerciseResult.rows[0].id;

      // Link exercise to workout with reps
      await pool.query(
        'INSERT INTO workout_exercises (workout_id, exercise_id, reps) VALUES ($1, $2, $3)',
        [workoutId, exerciseId, exercise.reps]
      );
    }

    await pool.query('COMMIT');

    // Fetch the complete workout with exercises
    const result = await pool.query<Workout>(`
      SELECT 
        w.id,
        w.date,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'reps', we.reps
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        ) as exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN exercises e ON we.exercise_id = e.id
      WHERE w.id = $1
      GROUP BY w.id, w.date
    `, [workoutId]);

    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    const error = err as DatabaseError;
    
    // Check for unique constraint violation
    if (error.code === '23505' && error.constraint === 'workouts_date_key') {
      res.status(400).json({ error: 'A workout already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

// Delete workout
app.delete('/workouts/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('BEGIN');
    
    // Delete workout exercises first (due to foreign key constraint)
    await pool.query(
      'DELETE FROM workout_exercises WHERE workout_id = $1',
      [req.params.id]
    );

    // Delete workout
    const result = await pool.query(
      'DELETE FROM workouts WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    await pool.query('COMMIT');

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Workout not found' });
    } else {
      res.json({ id: req.params.id });
    }
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    const error = err as DatabaseError;
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
