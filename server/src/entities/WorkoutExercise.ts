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

  @Column({ type: "float", nullable: true })
  weight: number | null;

  @Column({ type: "float", nullable: true })
  time_seconds: number | null;

  @Column({ default: false })
  new_reps: boolean;

  @Column({ default: false })
  new_weight: boolean;

  @Column({ default: false })
  new_time: boolean;

  @ManyToOne(() => Workout, (workout) => workout.workoutExercises, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "workout_id" })
  workout: Workout;

  @ManyToOne(() => Exercise, (exercise) => exercise.workoutExercises, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "exercise_id" })
  exercise: Exercise;
}
