import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkoutShowPage from "./WorkoutShowPage";
import * as Api from "../api";
import * as UserContext from "../contexts/useUserContext";

// Mock the API functions
jest.mock("../api", () => ({
  fetchWorkout: jest.fn(),
}));

// Mock the UserContext
jest.mock("../contexts/useUserContext", () => ({
  useUserContext: jest.fn(),
}));

describe("WorkoutShowPage", () => {
  const mockWorkout = {
    id: 1,
    userId: 1,
    date: "2025-04-10",
    withInstructor: true,
    exercises: [
      { id: 1, name: "Push-ups", reps: 10 },
      { id: 2, name: "Squats", reps: 15, weight: 20 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the user context to simulate a logged-in user
    jest.spyOn(UserContext, "useUserContext").mockReturnValue({
      user: { id: 1, name: "Test User" },
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
    });

    // Mock the API call to return the workout
    (Api.fetchWorkout as jest.Mock).mockResolvedValue(mockWorkout);
  });

  it("renders loading state initially", () => {
    render(
      <MemoryRouter initialEntries={["/workouts/1"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that loading state is displayed
    expect(screen.getByText(/Loading workout.../i)).toBeInTheDocument();
  });

  it("renders workout details after loading", async () => {
    render(
      <MemoryRouter initialEntries={["/workouts/1"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that the API was called with the correct ID
    expect(Api.fetchWorkout).toHaveBeenCalledWith(1);

    // Check that workout details are displayed
    expect(screen.getByText(/Apr 10, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/With Instructor/i)).toBeInTheDocument();

    // Check that exercises are displayed
    expect(screen.getByText("Push-ups")).toBeInTheDocument();
    expect(screen.getByText("10 reps")).toBeInTheDocument();
    expect(screen.getByText("Squats")).toBeInTheDocument();
    expect(screen.getByText("15 reps")).toBeInTheDocument();
    expect(screen.getByText("20 lbs")).toBeInTheDocument();

    // Check that edit button is displayed
    expect(screen.getByText("Edit Workout")).toBeInTheDocument();
  });

  it("renders error state when API call fails", async () => {
    // Mock the API call to fail
    (Api.fetchWorkout as jest.Mock).mockRejectedValue(new Error("Failed to load workout"));

    render(
      <MemoryRouter initialEntries={["/workouts/1"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load workout/i)).toBeInTheDocument();
    });
  });

  it("renders not found state when workout doesn't exist", async () => {
    // Mock the API call to return null (workout not found)
    (Api.fetchWorkout as jest.Mock).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/workouts/999"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the not found message to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Workout not found/i)).toBeInTheDocument();
    });
  });

  it("renders workout without instructor badge when withInstructor is false", async () => {
    // Mock the API call to return a workout without instructor
    const workoutWithoutInstructor = { ...mockWorkout, withInstructor: false };
    (Api.fetchWorkout as jest.Mock).mockResolvedValue(workoutWithoutInstructor);

    render(
      <MemoryRouter initialEntries={["/workouts/1"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that the "With Instructor" badge is not displayed
    expect(screen.queryByText(/With Instructor/i)).not.toBeInTheDocument();
  });

  it("renders exercises without weight when weight is not provided", async () => {
    // Mock the API call to return a workout with an exercise without weight
    const workoutWithExerciseWithoutWeight = {
      ...mockWorkout,
      exercises: [{ id: 1, name: "Push-ups", reps: 10 }],
    };
    (Api.fetchWorkout as jest.Mock).mockResolvedValue(workoutWithExerciseWithoutWeight);

    render(
      <MemoryRouter initialEntries={["/workouts/1"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that the exercise is displayed without weight
    expect(screen.getByText("Push-ups")).toBeInTheDocument();
    expect(screen.getByText("10 reps")).toBeInTheDocument();
    expect(screen.queryByText(/lbs/i)).not.toBeInTheDocument();
  });

  it("renders exercises with time when time_minutes is provided", async () => {
    // Mock the API call to return a workout with an exercise with time
    const workoutWithTime = {
      ...mockWorkout,
      exercises: [
        { id: 1, name: "Plank", reps: 3, time_minutes: 2.5 },
        { id: 2, name: "Wall Sit", reps: 2, weight: 0, time_minutes: 1.5 },
      ],
    };
    (Api.fetchWorkout as jest.Mock).mockResolvedValue(workoutWithTime);

    render(
      <MemoryRouter initialEntries={["/workouts/1"]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that exercises with time are displayed correctly
    expect(screen.getByText("Plank")).toBeInTheDocument();
    expect(screen.getByText("3 reps")).toBeInTheDocument();
    expect(screen.getByText("2.5 min")).toBeInTheDocument();

    expect(screen.getByText("Wall Sit")).toBeInTheDocument();
    expect(screen.getByText("2 reps")).toBeInTheDocument();
    expect(screen.getByText("1.5 min")).toBeInTheDocument();
  });
});
