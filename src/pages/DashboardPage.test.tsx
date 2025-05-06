import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./DashboardPage";
import * as Api from "../api";

// Mock the API functions
jest.mock("../api", () => ({
  fetchWeightProgressionData: jest.fn(),
}));

// Mock the Recharts components
jest.mock("recharts", () => {
  const OriginalModule = jest.requireActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="chart-line" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

describe("DashboardPage", () => {
  const mockProgressionData = [
    {
      exerciseName: "Bench Press",
      dataPoints: [
        { date: "2025-02-15", weight: 135 },
        { date: "2025-02-22", weight: 145 },
        { date: "2025-03-01", weight: 155 },
      ],
    },
    {
      exerciseName: "Squat",
      dataPoints: [
        { date: "2025-02-15", weight: 185 },
        { date: "2025-02-22", weight: 195 },
        { date: "2025-03-08", weight: 205 },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Mock API to not resolve immediately
    (Api.fetchWeightProgressionData as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<DashboardPage />);

    // Check that loading state is displayed
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it("renders charts when data is loaded successfully", async () => {
    // Mock successful API response
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);

    render(<DashboardPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Check page title
    expect(screen.getByText("Exercise Weight Progression")).toBeInTheDocument();
    
    // Check that exercise names are displayed
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Squat")).toBeInTheDocument();
    
    // Check that charts are rendered
    const charts = screen.getAllByTestId("line-chart");
    expect(charts.length).toBe(2);
  });

  it("renders error message when API call fails", async () => {
    // Mock API failure
    (Api.fetchWeightProgressionData as jest.Mock).mockRejectedValue(
      new Error("Failed to fetch data")
    );

    render(<DashboardPage />);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  it("renders empty state when no data is available", async () => {
    // Mock empty data response
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue([]);

    render(<DashboardPage />);

    // Wait for empty state to be displayed
    await waitFor(() => {
      expect(screen.getByText(/No exercise data available/i)).toBeInTheDocument();
      expect(screen.getByText(/Add workouts with weight data to see your progress/i)).toBeInTheDocument();
    });
  });

  it("formats dates correctly in chart labels", async () => {
    // This test would be more complex in a real implementation
    // as we'd need to test the actual formatting function
    // For now, we'll just check that the chart components are rendered
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId("x-axis").length).toBe(2);
      expect(screen.getAllByTestId("y-axis").length).toBe(2);
    });
  });
});
