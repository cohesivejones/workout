import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Exercise } from "./Exercise";
import { Workout } from "./Workout";

@Entity("workout_exercises")
export class WorkoutExercise {
  @PrimaryColumn()
  workout_id: number;

  @PrimaryColumn()
  exercise_id: number;

  @Column()
  reps: number;

  @ManyToOne(() => Workout, workout => workout.workoutExercises, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "workout_id" })
  workout: Workout;

  @ManyToOne(() => Exercise, exercise => exercise.workoutExercises, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "exercise_id" })
  exercise: Exercise;
}
