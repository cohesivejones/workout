import WorkoutList from "./WorkoutList";
import PainScoreList from "./PainScoreList";
import { PainScore, Workout } from "../types";

interface ListViewProps {
  painScores: PainScore[];
  handlePainScoreDelete: (painScoreId: number) => void;
  workouts: Workout[];
  handleWorkoutDeleted: (workoutId: number) => void;
}

export const ListView = ({
  painScores,
  handlePainScoreDelete,
  workouts,
  handleWorkoutDeleted,
}: ListViewProps) => {
  return (
    <div>
      <PainScoreList
        painScores={painScores}
        onPainScoreDeleted={handlePainScoreDelete}
      />

      <WorkoutList
        workouts={workouts}
        onWorkoutDeleted={handleWorkoutDeleted}
      />
    </div>
  );
};
