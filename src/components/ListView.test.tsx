import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ListView } from "./ListView";
import * as Api from "../api";

// Mock the API functions
jest.mock("../api", () => ({
  deleteWorkout: jest.fn(),
  deletePainScore: jest.fn(),
}));

// Mock window.confirm
const originalConfirm = window.confirm;

describe("ListView", () => {
  const mockWorkouts = [
    {
      id: 1,
      userId: 1,
      date: "2025-04-10",
      withInstructor: true,
      exercises: [
        { id: 1, name: "Push-ups", reps: 10, new_reps: true },
        { id: 2, name: "Squats", reps: 15, weight: 20, new_weight: true },
      ],
    },
    {
      id: 2,
      userId: 1,
      date: "2025-04-05",
      withInstructor: false,
      exercises: [{ id: 3, name: "Lunges", reps: 12 }],
    },
  ];

  const mockPainScores = [
    {
      id: 1,
      userId: 1,
      date: "2025-04-12",
      score: 3,
      notes: "Mild pain in lower back",
    },
    {
      id: 2,
      userId: 1,
      date: "2025-04-08",
      score: 5,
      notes: null,
    },
  ];

  const mockSleepScores = [
    {
      id: 1,
      userId: 1,
      date: "2025-04-11",
      score: 4,
      notes: "Slept well",
    },
    {
      id: 2,
      userId: 1,
      date: "2025-04-07",
      score: 2,
      notes: null,
    },
  ];

  const mockHandleWorkoutDeleted = jest.fn();
  const mockHandlePainScoreDelete = jest.fn();
  const mockHandleSleepScoreDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm to always return true
    window.confirm = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    // Restore original window.confirm
    window.confirm = originalConfirm;
  });

  it("renders workouts and pain scores in chronological order", () => {
    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Check that all items are rendered
    expect(screen.getByText("Apr 12, 2025 (Saturday)")).toBeInTheDocument();
    expect(screen.getByText("Apr 10, 2025 (Thursday)")).toBeInTheDocument();
    expect(screen.getByText("Apr 8, 2025 (Tuesday)")).toBeInTheDocument();
    expect(screen.getByText("Apr 5, 2025 (Saturday)")).toBeInTheDocument();

    // Check that items are in the correct order (newest first)
    const dates = screen.getAllByText(/Apr \d+, 2025/);
    expect(dates[0].textContent).toContain("Apr 12"); // Pain score
    expect(dates[1].textContent).toContain("Apr 11"); // Sleep score
    expect(dates[2].textContent).toContain("Apr 10"); // Workout
    expect(dates[3].textContent).toContain("Apr 8"); // Pain score
    expect(dates[4].textContent).toContain("Apr 7"); // Sleep score
    expect(dates[5].textContent).toContain("Apr 5"); // Workout

    // Check workout details
    expect(screen.getByText("Push-ups")).toBeInTheDocument();
    expect(screen.getByText("10 reps")).toBeInTheDocument();
    expect(screen.getByText("Squats")).toBeInTheDocument();
    expect(screen.getByText(/15 reps - 20 lbs/)).toBeInTheDocument();
    expect(screen.getByText("Lunges")).toBeInTheDocument();
    expect(screen.getByText("12 reps")).toBeInTheDocument();

    // Check pain score details
    expect(screen.getAllByText("Pain Level:")[0]).toBeInTheDocument();
    expect(screen.getByText(/3 -/)).toBeInTheDocument();
    expect(screen.getByText(/Noticeable and distracting pain/)).toBeInTheDocument();
    expect(screen.getByText(/5 -/)).toBeInTheDocument();
    // Use a more flexible regex that matches the text regardless of spaces or apostrophes
    expect(screen.getByText(/Moderately strong pain/)).toBeInTheDocument();
    expect(screen.getByText("Mild pain in lower back")).toBeInTheDocument();
  });

  it("displays empty state message when no items", () => {
    render(
      <MemoryRouter>
        <ListView
          workouts={[]}
          painScores={[]}
          sleepScores={[]}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText("No workouts, pain scores, or sleep scores recorded yet.")
    ).toBeInTheDocument();
  });

  it("handles workout deletion", async () => {
    // Mock successful deletion
    (Api.deleteWorkout as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Find delete buttons for workouts
    const deleteButtons = screen.getAllByTitle("Delete workout");
    expect(deleteButtons.length).toBe(2);

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that confirm was called
    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this workout?");

    // Check that the API was called with the correct ID
    await waitFor(() => {
      expect(Api.deleteWorkout).toHaveBeenCalledWith(1);
    });

    // Check that the handler was called with the correct ID
    await waitFor(() => {
      expect(mockHandleWorkoutDeleted).toHaveBeenCalledWith(1);
    });
  });

  it("handles pain score deletion", async () => {
    // Mock successful deletion
    (Api.deletePainScore as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Find delete buttons for pain scores
    const deleteButtons = screen.getAllByTitle("Delete pain score");
    expect(deleteButtons.length).toBe(2);

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that confirm was called
    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this pain score?");

    // Check that the API was called with the correct ID
    await waitFor(() => {
      expect(Api.deletePainScore).toHaveBeenCalledWith(1);
    });

    // Check that the handler was called with the correct ID
    await waitFor(() => {
      expect(mockHandlePainScoreDelete).toHaveBeenCalledWith(1);
    });
  });

  it("handles workout deletion error", async () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock window.alert
    const originalAlert = window.alert;
    window.alert = jest.fn();

    // Mock failed deletion
    (Api.deleteWorkout as jest.Mock).mockRejectedValue(new Error("Failed to delete"));

    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Find delete buttons for workouts
    const deleteButtons = screen.getAllByTitle("Delete workout");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that the error was handled
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Failed to delete workout:", expect.any(Error));
      expect(window.alert).toHaveBeenCalledWith("Failed to delete workout. Please try again.");
    });

    // Check that the handler was not called
    expect(mockHandleWorkoutDeleted).not.toHaveBeenCalled();

    // Restore mocks
    console.error = originalConsoleError;
    window.alert = originalAlert;
  });

  it("handles pain score deletion error", async () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock window.alert
    const originalAlert = window.alert;
    window.alert = jest.fn();

    // Mock failed deletion
    (Api.deletePainScore as jest.Mock).mockRejectedValue(new Error("Failed to delete"));

    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Find delete buttons for pain scores
    const deleteButtons = screen.getAllByTitle("Delete pain score");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that the error was handled
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Failed to delete pain score:", expect.any(Error));
      expect(window.alert).toHaveBeenCalledWith("Failed to delete pain score. Please try again.");
    });

    // Check that the handler was not called
    expect(mockHandlePainScoreDelete).not.toHaveBeenCalled();

    // Restore mocks
    console.error = originalConsoleError;
    window.alert = originalAlert;
  });

  it("does not delete when user cancels confirmation", async () => {
    // Override the mock to return false (user clicked "Cancel")
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Find delete buttons for workouts
    const deleteButtons = screen.getAllByTitle("Delete workout");

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that confirm was called
    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this workout?");

    // Check that the API was not called
    expect(Api.deleteWorkout).not.toHaveBeenCalled();

    // Check that the handler was not called
    expect(mockHandleWorkoutDeleted).not.toHaveBeenCalled();
  });

  it("displays filter controls", () => {
    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Check that filter controls are rendered
    expect(screen.getByText("Filter by Type:")).toBeInTheDocument();

    // Check that all checkboxes are rendered and checked by default
    const workoutsCheckbox = screen.getByLabelText("Workouts") as HTMLInputElement;
    const painScoresCheckbox = screen.getByLabelText("Pain Scores") as HTMLInputElement;
    const sleepScoresCheckbox = screen.getByLabelText("Sleep Scores") as HTMLInputElement;

    expect(workoutsCheckbox).toBeInTheDocument();
    expect(painScoresCheckbox).toBeInTheDocument();
    expect(sleepScoresCheckbox).toBeInTheDocument();

    expect(workoutsCheckbox.checked).toBe(true);
    expect(painScoresCheckbox.checked).toBe(true);
    expect(sleepScoresCheckbox.checked).toBe(true);

    // Check that Show All button is rendered
    expect(screen.getByText("Show All")).toBeInTheDocument();
  });

  it("filters items when checkboxes are clicked", () => {
    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Initially all items should be visible
    expect(screen.getAllByText("Workout").length).toBe(2); // 2 workout cards
    expect(screen.getAllByText("Pain Score").length).toBe(2); // 2 pain score cards
    expect(screen.getAllByText("Sleep Score").length).toBe(2); // 2 sleep score cards

    // Uncheck workouts
    const workoutsCheckbox = screen.getByLabelText("Workouts") as HTMLInputElement;
    fireEvent.click(workoutsCheckbox);

    // Now only pain scores and sleep scores should be visible
    expect(screen.queryAllByText("Workout").length).toBe(0);
    expect(screen.getAllByText("Pain Score").length).toBe(2);
    expect(screen.getAllByText("Sleep Score").length).toBe(2);

    // Uncheck pain scores
    const painScoresCheckbox = screen.getByLabelText("Pain Scores") as HTMLInputElement;
    fireEvent.click(painScoresCheckbox);

    // Now only sleep scores should be visible
    expect(screen.queryAllByText("Workout").length).toBe(0);
    expect(screen.queryAllByText("Pain Score").length).toBe(0);
    expect(screen.getAllByText("Sleep Score").length).toBe(2);

    // Uncheck sleep scores
    const sleepScoresCheckbox = screen.getByLabelText("Sleep Scores") as HTMLInputElement;
    fireEvent.click(sleepScoresCheckbox);

    // Now no items should be visible, but the empty state message should be shown
    expect(screen.queryAllByText("Workout").length).toBe(0);
    expect(screen.queryAllByText("Pain Score").length).toBe(0);
    expect(screen.queryAllByText("Sleep Score").length).toBe(0);
    expect(
      screen.getByText("No workouts, pain scores, or sleep scores recorded yet.")
    ).toBeInTheDocument();
  });

  it("resets filters when Show All button is clicked", () => {
    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Uncheck all checkboxes
    const workoutsCheckbox = screen.getByLabelText("Workouts") as HTMLInputElement;
    const painScoresCheckbox = screen.getByLabelText("Pain Scores") as HTMLInputElement;
    const sleepScoresCheckbox = screen.getByLabelText("Sleep Scores") as HTMLInputElement;

    fireEvent.click(workoutsCheckbox);
    fireEvent.click(painScoresCheckbox);
    fireEvent.click(sleepScoresCheckbox);

    // Verify no items are visible
    expect(screen.queryAllByText("Workout").length).toBe(0);
    expect(screen.queryAllByText("Pain Score").length).toBe(0);
    expect(screen.queryAllByText("Sleep Score").length).toBe(0);

    // Click Show All button
    const showAllButton = screen.getByText("Show All");
    fireEvent.click(showAllButton);

    // Now all items should be visible again
    expect(screen.getAllByText("Workout").length).toBe(2);
    expect(screen.getAllByText("Pain Score").length).toBe(2);
    expect(screen.getAllByText("Sleep Score").length).toBe(2);

    // And all checkboxes should be checked
    expect(workoutsCheckbox.checked).toBe(true);
    expect(painScoresCheckbox.checked).toBe(true);
    expect(sleepScoresCheckbox.checked).toBe(true);
  });

  it("displays NEW REPS and NEW WEIGHT badges when flags are set", () => {
    render(
      <MemoryRouter>
        <ListView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
          handleWorkoutDeleted={mockHandleWorkoutDeleted}
          handlePainScoreDelete={mockHandlePainScoreDelete}
          handleSleepScoreDelete={mockHandleSleepScoreDelete}
        />
      </MemoryRouter>
    );

    // Check that the NEW REPS badge is displayed for Push-ups
    const newRepsBadges = screen.getAllByText("NEW REPS");
    expect(newRepsBadges.length).toBe(1);

    // Check that the NEW WEIGHT badge is displayed for Squats
    const newWeightBadges = screen.getAllByText("NEW WEIGHT");
    expect(newWeightBadges.length).toBe(1);

    // Verify that the badges are associated with the correct exercises
    const pushUpsItem = screen.getByText("Push-ups").closest(".exerciseItem");
    const squatsItem = screen.getByText("Squats").closest(".exerciseItem");
    const lungesItem = screen.getByText("Lunges").closest(".exerciseItem");

    expect(pushUpsItem).toContainElement(newRepsBadges[0]);
    expect(squatsItem).toContainElement(newWeightBadges[0]);

    // Verify that Lunges doesn't have any badges
    expect(lungesItem).not.toHaveTextContent("NEW REPS");
    expect(lungesItem).not.toHaveTextContent("NEW WEIGHT");
  });
});
