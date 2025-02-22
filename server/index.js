const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Get all exercises
app.get('/api/exercises', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM exercises ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new exercise
app.post('/api/exercises', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.query(
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
app.get('/api/workouts', async (req, res) => {
  try {
    const result = await db.query(`
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
          '[]'
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
app.post('/api/workouts', async (req, res) => {
  try {
    await db.query('BEGIN');
    const { date, exercises } = req.body;

    // Insert workout
    const workoutResult = await db.query(
      'INSERT INTO workouts (date) VALUES ($1) RETURNING id',
      [date]
    );
    const workoutId = workoutResult.rows[0].id;

    // Insert exercises and workout_exercises
    for (const exercise of exercises) {
      // Get or create exercise
      const exerciseResult = await db.query(
        'INSERT INTO exercises (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [exercise.name]
      );
      const exerciseId = exerciseResult.rows[0].id;

      // Link exercise to workout with reps
      await db.query(
        'INSERT INTO workout_exercises (workout_id, exercise_id, reps) VALUES ($1, $2, $3)',
        [workoutId, exerciseId, exercise.reps]
      );
    }

    await db.query('COMMIT');

    // Fetch the complete workout with exercises
    const result = await db.query(`
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
          '[]'
        ) as exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN exercises e ON we.exercise_id = e.id
      WHERE w.id = $1
      GROUP BY w.id, w.date
    `, [workoutId]);

    res.json(result.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
