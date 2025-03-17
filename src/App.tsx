import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import WorkoutListPage from "./pages/WorkoutListPage";
import AddWorkoutPage from "./pages/AddWorkoutPage";
import EditWorkoutPage from "./pages/EditWorkoutPage";
import WorkoutShowPage from "./pages/WorkoutShowPage";
import NotFoundPage from "./pages/NotFoundPage";
import { Layout } from "./Layout";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Workout Tracker</h1>
        </header>
        <main className="App-main">
          <Routes>
            <Route element={<Layout />}>
              <Route index path="/" element={<WorkoutListPage />} />
              <Route path="/workouts/new" element={<AddWorkoutPage />} />
              <Route path="/workouts/:id/edit" element={<EditWorkoutPage />} />
              <Route path="/workouts/:id" element={<WorkoutShowPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
