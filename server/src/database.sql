CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    workout_id INTEGER REFERENCES workouts(id),
    exercise_id INTEGER REFERENCES exercises(id),
    reps INTEGER NOT NULL,
    PRIMARY KEY (workout_id, exercise_id)
);
