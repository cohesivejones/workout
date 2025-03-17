import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import WorkoutListPage from "./pages/WorkoutListPage";
import AddWorkoutPage from "./pages/NewWorkoutPage";
import EditWorkoutPage from "./pages/EditWorkoutPage";
import WorkoutShowPage from "./pages/WorkoutShowPage";
import NotFoundPage from "./pages/NotFoundPage";
import { Layout } from "./Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index path="/" element={<WorkoutListPage />} />
          <Route path="/workouts/new" element={<AddWorkoutPage />} />
          <Route path="/workouts/:id/edit" element={<EditWorkoutPage />} />
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
