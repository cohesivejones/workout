import { BrowserRouter, Routes, Route } from "react-router-dom";
import TimelinePage from "./pages/TimelinePage";
import AddWorkoutPage from "./pages/NewWorkoutPage";
import EditWorkoutPage from "./pages/EditWorkoutPage";
import WorkoutShowPage from "./pages/WorkoutShowPage";
import PainScorePage from "./pages/PainScorePage";
import SleepScorePage from "./pages/SleepScorePage";
import ExerciseListPage from "./pages/ExerciseListPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DiagnosticianPage from "./pages/DiagnosticianPage";
import DashboardPage from "./pages/DashboardPage";
import GenerateWorkoutPage from "./pages/GenerateWorkoutPage";
import NotFoundPage from "./pages/NotFoundPage";
import { Layout } from "./Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index path="/" element={<TimelinePage />} />
          <Route path="/workouts/new" element={<AddWorkoutPage />} />
          <Route path="/workouts/:id/edit" element={<EditWorkoutPage />} />
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
          <Route path="/pain-scores/new" element={<PainScorePage />} />
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
          <Route path="/sleep-scores/new" element={<SleepScorePage />} />
          <Route path="/sleep-scores/:id/edit" element={<SleepScorePage />} />
          <Route path="/exercises" element={<ExerciseListPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/diagnostician" element={<DiagnosticianPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workouts/generate" element={<GenerateWorkoutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
