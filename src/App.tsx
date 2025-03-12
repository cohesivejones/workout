import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import "./App.css";
import WorkoutListPage from "./pages/WorkoutListPage";
import AddWorkoutPage from "./pages/AddWorkoutPage";
import EditWorkoutPage from "./pages/EditWorkoutPage";
import WorkoutShowPage from "./pages/WorkoutShowPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import { UserContextProvider } from "./contexts/UserContextProvider";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Workout Tracker</h1>
        </header>
        <main className="App-main">
          <Routes>
            <Route
              path="/"
              element={
                <UserContextProvider>
                  <Outlet />
                </UserContextProvider>
              }
            >
              <Route path="/" element={<LoginPage />} />
              <Route path="/workouts" element={<WorkoutListPage />} />
              <Route path="/add" element={<AddWorkoutPage />} />
              <Route path="/edit/:id" element={<EditWorkoutPage />} />
              <Route path="/workout/:id" element={<WorkoutShowPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
