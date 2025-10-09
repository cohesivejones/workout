import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PainScorePage from "./PainScorePage";
import * as Api from "../api";
import * as UserContext from "../contexts/useUserContext";

// Mock the API functions
vi.mock("../api", () => ({
  fetchPainScore: vi.fn(),
  createPainScore: vi.fn(),
  updatePainScore: vi.fn(),
}));

// Mock the UserContext
vi.mock("../contexts/useUserContext", () => ({
  useUserContext: vi.fn(),
}));

// Mock the PainScoreForm component
vi.mock("../components/PainScoreForm", () => {
  return {
    __esModule: true,
    default: ({ onSubmit, existingPainScore }: any) => (
      <div data-testid="mock-pain-score-form">
        <button
          data-testid="mock-submit-button"
          onClick={() =>
            onSubmit({
              date: "2025-04-15",
              score: 4,
              notes: "Test notes",
            })
          }
        >
          Submit
        </button>
        {existingPainScore && (
          <div data-testid="existing-pain-score-id">
            {existingPainScore.id}
          </div>
        )}
      </div>
    ),
  };
});

describe("PainScorePage", () => {
  const mockUser = { id: 1, name: "Test User" };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the user context to simulate a logged-in user
    vi.spyOn(UserContext, "useUserContext").mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
    
    // Mock successful API responses
    (Api.createPainScore as any).mockResolvedValue({ id: 123 });
    (Api.updatePainScore as any).mockResolvedValue({ id: 456 });
    (Api.fetchPainScore as any).mockResolvedValue({
      id: 456,
      date: "2025-04-10",
      score: 3,
      notes: "Existing notes",
    });
  });

  it("renders the form for creating a new pain score", () => {
    render(
      <MemoryRouter initialEntries={["/pain-scores/new"]}>
        <Routes>
          <Route path="/pain-scores/new" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that the form is rendered
    expect(screen.getByTestId("mock-pain-score-form")).toBeInTheDocument();
    
    // Check that there's no existing pain score ID
    expect(screen.queryByTestId("existing-pain-score-id")).not.toBeInTheDocument();
  });

  it("renders the form for editing an existing pain score", async () => {
    render(
      <MemoryRouter initialEntries={["/pain-scores/456/edit"]}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the pain score to load
    await waitFor(() => {
      expect(screen.getByTestId("existing-pain-score-id")).toBeInTheDocument();
    });

    // Check that the API was called with the correct ID
    expect(Api.fetchPainScore).toHaveBeenCalledWith(456);
    
    // Check that the existing pain score ID is displayed
    expect(screen.getByTestId("existing-pain-score-id").textContent).toBe("456");
  });

  it("creates a new pain score when form is submitted", async () => {
    render(
      <MemoryRouter initialEntries={["/pain-scores/new"]}>
        <Routes>
          <Route path="/pain-scores/new" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Submit the form
    fireEvent.click(screen.getByTestId("mock-submit-button"));

    // Check that the API was called with the correct data
    await waitFor(() => {
      expect(Api.createPainScore).toHaveBeenCalledWith({
        date: "2025-04-15",
        score: 4,
        notes: "Test notes",
      });
    });
  });

  it("updates an existing pain score when form is submitted", async () => {
    render(
      <MemoryRouter initialEntries={["/pain-scores/456/edit"]}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the pain score to load
    await waitFor(() => {
      expect(screen.getByTestId("existing-pain-score-id")).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByTestId("mock-submit-button"));

    // Check that the API was called with the correct data
    await waitFor(() => {
      expect(Api.updatePainScore).toHaveBeenCalledWith(456, {
        date: "2025-04-15",
        score: 4,
        notes: "Test notes",
      });
    });
  });

  it("handles error when fetching pain score fails", async () => {
    // Mock the API call to fail
    (Api.fetchPainScore as any).mockRejectedValue(new Error("Failed to load pain score"));

    render(
      <MemoryRouter initialEntries={["/pain-scores/456/edit"]}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load pain score/i)).toBeInTheDocument();
    });
  });

  it("renders form without existing pain score when pain score is not found", async () => {
    // Mock the API call to return null (pain score not found)
    (Api.fetchPainScore as any).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/pain-scores/999/edit"]}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByTestId("mock-pain-score-form")).toBeInTheDocument();
    });
    
    // Check that there's no existing pain score ID
    expect(screen.queryByTestId("existing-pain-score-id")).not.toBeInTheDocument();
  });
});
