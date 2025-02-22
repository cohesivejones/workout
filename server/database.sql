CREATE DATABASE workout_tracker;

-- Switch to the workout_tracker database before running these commands

CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL
);

CREATE TABLE workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    reps INTEGER NOT NULL,
    UNIQUE(workout_id, exercise_id)
);
