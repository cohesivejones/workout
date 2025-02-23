import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import WorkoutListPage from './pages/WorkoutListPage';
import AddWorkoutPage from './pages/AddWorkoutPage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Workout Tracker</h1>
        </header>
        <main className="App-main">
          <Routes>
            <Route path="/" element={<WorkoutListPage />} />
            <Route path="/add" element={<AddWorkoutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
