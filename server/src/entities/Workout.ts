import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { WorkoutExercise } from "./WorkoutExercise";

@Entity("workouts")
export class Workout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date", unique: true })
  date: Date;

  @Column({ type: "boolean", default: false })
  withInstructor: boolean;

  @OneToMany(() => WorkoutExercise, workoutExercise => workoutExercise.workout, {
    cascade: true
  })
  workoutExercises: WorkoutExercise[];
}
