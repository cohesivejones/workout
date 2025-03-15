import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkoutList from "./WorkoutList";
import { Workout } from "../types";
import { deleteWorkout } from "../api";
import * as UserContext from "../contexts/useUserContext";

jest.mock("react-router-dom", () => ({
  Link: ({ to, className, children }: any) => (
    <a href={to} className={className} data-testid={`link-to-${to}`}>
      {children}
    </a>
  ),
}));

jest.mock("../api", () => ({
  deleteWorkout: jest.fn(),
}));

describe("WorkoutList", () => {
  const mockOnWorkoutDeleted = jest.fn();
  const mockWorkouts: Workout[] = [
    {
      id: 1,
      userId: 1,
      date: "2025-03-01",
      withInstructor: true,
      exercises: [
        { id: 1, name: "Push-ups", reps: 10 },
        { id: 2, name: "Squats", reps: 15, weight: 20 },
      ],
    },
    {
      id: 2,
      userId: 1,
      date: "2025-03-02",
      withInstructor: false,
      exercises: [{ id: 3, name: "Lunges", reps: 12 }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(UserContext, "useUserContext").mockReturnValue({
      user: { id: 1, name: "Bob Jones" },
      login: jest.fn(),
    });
    // Mock window.confirm to always return true
    window.confirm = jest.fn(() => true);
  });

  it("renders a message when there are no workouts", () => {
    render(
      <WorkoutList workouts={[]} onWorkoutDeleted={mockOnWorkoutDeleted} />
    );

    expect(
      screen.getByText("No workouts yet. Add your first workout!")
    ).toBeInTheDocument();
  });

  it("renders a list of workouts", () => {
    render(
      <WorkoutList
        workouts={mockWorkouts}
        onWorkoutDeleted={mockOnWorkoutDeleted}
      />
    );

    // Check that both workouts are rendered
    expect(screen.getByText(/Mar 1, 2025 \(Saturday\)/)).toBeVisible();
    expect(screen.getByText(/Mar 2, 2025 \(Sunday\)/)).toBeVisible();

    // Check that exercises are rendered
    expect(screen.getByText("Push-ups - 10 reps")).toBeInTheDocument();
    expect(screen.getByText("Squats - 15 reps - 20 lbs")).toBeInTheDocument();
    expect(screen.getByText("Lunges - 12 reps")).toBeInTheDocument();

    // Check that edit links are rendered
    expect(screen.getByTestId("link-to-/edit/1")).toBeInTheDocument();
    expect(screen.getByTestId("link-to-/edit/2")).toBeInTheDocument();

    // Check that delete buttons are rendered
    const deleteButtons = screen.getAllByText("×");
    expect(deleteButtons).toHaveLength(2);
  });

  it("applies 'with-instructor' class to workouts with an instructor", () => {
    render(
      <WorkoutList
        workouts={mockWorkouts}
        onWorkoutDeleted={mockOnWorkoutDeleted}
      />
    );

    // Get all workout cards
    const workoutCards = document.querySelectorAll(".workout-card");

    // Check that the first workout has the 'with-instructor' class
    expect(workoutCards[0]).toHaveClass("with-instructor");

    // Check that the second workout does not have the 'with-instructor' class
    expect(workoutCards[1]).not.toHaveClass("with-instructor");
  });

  it("deletes a workout when delete button is clicked", async () => {
    // Mock the deleteWorkout function to resolve successfully
    (deleteWorkout as jest.Mock).mockResolvedValue({ id: 1 });

    render(
      <WorkoutList
        workouts={mockWorkouts}
        onWorkoutDeleted={mockOnWorkoutDeleted}
      />
    );

    // Get all delete buttons
    const deleteButtons = screen.getAllByText("×");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that window.confirm was called
    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this workout?"
    );

    // Check that deleteWorkout was called with the correct ID
    expect(deleteWorkout).toHaveBeenCalledWith(1);

    // Check that onWorkoutDeleted was called with the correct ID
    await waitFor(() => {
      expect(mockOnWorkoutDeleted).toHaveBeenCalledWith(1);
    });
  });

  it("shows 'Deleting...' text when a workout is being deleted", async () => {
    // Mock the deleteWorkout function to not resolve immediately
    (deleteWorkout as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ id: 1 }), 100);
      });
    });

    render(
      <WorkoutList
        workouts={mockWorkouts}
        onWorkoutDeleted={mockOnWorkoutDeleted}
      />
    );

    // Get all delete buttons
    const deleteButtons = screen.getAllByText("×");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that the button text changes to "Deleting..."
    expect(screen.getByText("Deleting...")).toBeInTheDocument();

    // Wait for the deletion to complete
    await waitFor(() => {
      expect(mockOnWorkoutDeleted).toHaveBeenCalledWith(1);
    });
  });

  it("does not delete a workout when confirmation is cancelled", async () => {
    // Mock window.confirm to return false
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(
      <WorkoutList
        workouts={mockWorkouts}
        onWorkoutDeleted={mockOnWorkoutDeleted}
      />
    );

    // Get all delete buttons
    const deleteButtons = screen.getAllByText("×");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that window.confirm was called
    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this workout?"
    );

    // Check that deleteWorkout was not called
    expect(deleteWorkout).not.toHaveBeenCalled();

    // Check that onWorkoutDeleted was not called
    expect(mockOnWorkoutDeleted).not.toHaveBeenCalled();
  });

  it("handles error when deleting a workout fails", async () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock window.alert
    window.alert = jest.fn();

    // Mock the deleteWorkout function to reject
    (deleteWorkout as jest.Mock).mockRejectedValue(
      new Error("Failed to delete workout")
    );

    render(
      <WorkoutList
        workouts={mockWorkouts}
        onWorkoutDeleted={mockOnWorkoutDeleted}
      />
    );

    // Get all delete buttons
    const deleteButtons = screen.getAllByText("×");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Wait for the error to be handled
    await waitFor(() => {
      // Check that console.error was called
      expect(console.error).toHaveBeenCalled();

      // Check that window.alert was called
      expect(window.alert).toHaveBeenCalledWith(
        "Failed to delete workout. Please try again."
      );

      // Check that onWorkoutDeleted was not called
      expect(mockOnWorkoutDeleted).not.toHaveBeenCalled();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
});
