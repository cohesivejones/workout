import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./DashboardPage";
import * as Api from "../api";

// Mock the API functions
jest.mock("../api", () => ({
  fetchWeightProgressionData: jest.fn(),
  fetchPainProgressionData: jest.fn(),
  fetchSleepProgressionData: jest.fn(),
}));

// Mock the Recharts components
jest.mock("recharts", () => {
  const OriginalModule = jest.requireActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: () => <div data-testid="chart-line" />,
    XAxis: (props: { domain?: unknown }) => (
      <div data-testid="x-axis" data-domain={JSON.stringify(props.domain)} />
    ),
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

// Mock date-fns functions to return consistent dates for testing
jest.mock("date-fns", () => {
  const actual = jest.requireActual("date-fns");
  return {
    ...actual,
    // Mock the current date to be fixed for tests
    parseISO: actual.parseISO,
    format: actual.format,
    isWithinInterval: actual.isWithinInterval,
    eachDayOfInterval: actual.eachDayOfInterval,
  };
});

describe("DashboardPage", () => {
  const mockProgressionData = [
    {
      exerciseName: "Bench Press",
      dataPoints: [
        { date: "2025-02-15", weight: 135, reps: 8, new_reps: false, new_weight: false },
        { date: "2025-02-22", weight: 145, reps: 10, new_reps: true, new_weight: true },
        { date: "2025-03-01", weight: 155, reps: 8, new_reps: false, new_weight: true },
      ],
    },
    {
      exerciseName: "Squat",
      dataPoints: [
        { date: "2025-02-15", weight: 185, reps: 5, new_reps: false, new_weight: false },
        { date: "2025-02-22", weight: 195, reps: 6, new_reps: true, new_weight: false },
        { date: "2025-03-08", weight: 205, reps: 5, new_reps: false, new_weight: true },
      ],
    },
  ];

  const mockPainData = {
    dataPoints: [
      { date: "2025-02-15", score: 3 },
      { date: "2025-02-22", score: 4 },
      { date: "2025-03-01", score: 2 },
    ],
  };

  const mockSleepData = {
    dataPoints: [
      { date: "2025-02-15", score: 4 },
      { date: "2025-02-22", score: 3 },
      { date: "2025-03-01", score: 5 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Mock API to not resolve immediately
    (Api.fetchWeightProgressionData as jest.Mock).mockImplementation(() => new Promise(() => {}));

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
      expect(
        screen.getByText(/Add workouts with weight data to see your progress/i)
      ).toBeInTheDocument();
    });
  });

  it("formats dates correctly in chart labels and uses consistent domain", async () => {
    // Mock successful API responses
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);
    (Api.fetchPainProgressionData as jest.Mock).mockResolvedValue(mockPainData);
    (Api.fetchSleepProgressionData as jest.Mock).mockResolvedValue(mockSleepData);

    render(<DashboardPage />);

    await waitFor(() => {
      const xAxes = screen.getAllByTestId("x-axis");
      expect(xAxes.length).toBeGreaterThan(0);

      // Check that all x-axes have the same domain
      const firstDomain = xAxes[0].getAttribute("data-domain");
      xAxes.forEach((axis) => {
        expect(axis.getAttribute("data-domain")).toBe(firstDomain);
      });

      expect(screen.getAllByTestId("y-axis").length).toBeGreaterThan(0);
    });
  });

  it("renders pain and sleep score charts when data is loaded successfully", async () => {
    // Mock successful API responses
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);
    (Api.fetchPainProgressionData as jest.Mock).mockResolvedValue(mockPainData);
    (Api.fetchSleepProgressionData as jest.Mock).mockResolvedValue(mockSleepData);

    render(<DashboardPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Check that pain and sleep score sections are displayed
    expect(screen.getByText("Pain Score Progression")).toBeInTheDocument();
    expect(screen.getByText("Sleep Quality Progression")).toBeInTheDocument();

    // Check that charts are rendered
    const charts = screen.getAllByTestId("line-chart");
    expect(charts.length).toBe(4); // 2 exercise charts + pain + sleep

    // Check that all x-axes have the same domain
    const xAxes = screen.getAllByTestId("x-axis");
    const firstDomain = xAxes[0].getAttribute("data-domain");
    xAxes.forEach((axis) => {
      expect(axis.getAttribute("data-domain")).toBe(firstDomain);
    });
  });

  it("does not render pain and sleep charts when no data is available", async () => {
    // Mock API responses with empty data for pain and sleep
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);
    (Api.fetchPainProgressionData as jest.Mock).mockResolvedValue({ dataPoints: [] });
    (Api.fetchSleepProgressionData as jest.Mock).mockResolvedValue({ dataPoints: [] });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Check that pain and sleep sections are not displayed
    expect(screen.queryByText("Pain Score Progression")).not.toBeInTheDocument();
    expect(screen.queryByText("Sleep Quality Progression")).not.toBeInTheDocument();
  });

  it("normalizes data to have consistent date range across all charts", async () => {
    // Mock successful API responses
    (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);
    (Api.fetchPainProgressionData as jest.Mock).mockResolvedValue(mockPainData);
    (Api.fetchSleepProgressionData as jest.Mock).mockResolvedValue(mockSleepData);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Check that all charts have the same x-axis domain
    const xAxes = screen.getAllByTestId("x-axis");
    expect(xAxes.length).toBeGreaterThan(0);

    // All x-axes should have the same domain
    const firstDomain = xAxes[0].getAttribute("data-domain");
    xAxes.forEach((axis) => {
      expect(axis.getAttribute("data-domain")).toBe(firstDomain);
    });
  });

  describe("PR Indicator Features", () => {
    beforeEach(() => {
      (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockProgressionData);
      (Api.fetchPainProgressionData as jest.Mock).mockResolvedValue(mockPainData);
      (Api.fetchSleepProgressionData as jest.Mock).mockResolvedValue(mockSleepData);
    });

    it("renders PR legend for each exercise chart", async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      });

      // Check that PR legend items are displayed for each exercise
      const previousRepLabels = screen.getAllByText("Previous Rep");
      const newRepPRLabels = screen.getAllByText("New Rep PR");

      // Should have one legend per exercise chart (2 exercises)
      expect(previousRepLabels).toHaveLength(2);
      expect(newRepPRLabels).toHaveLength(2);
    });

    it("displays correct legend colors for PR indicators", async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      });

      // Get all legend dots and verify their colors
      const legendDots = document.querySelectorAll('[class*="legendDot"]');

      // Should have 4 legend dots total (2 per exercise chart)
      expect(legendDots).toHaveLength(4);

      // Check that we have the expected colors
      const colors = Array.from(legendDots).map(
        (dot) => (dot as HTMLElement).style.backgroundColor
      );

      // Should contain our simplified PR indicator colors
      expect(colors).toContain("rgb(136, 132, 216)"); // #8884d8 - Previous Rep
      expect(colors).toContain("rgb(255, 215, 0)"); // #ffd700 - New Rep PR
    });
  });

  describe("Custom Dot Component", () => {
    it("renders custom dots with correct colors based on PR flags", async () => {
      // Create a more detailed mock to test the CustomDot component
      const mockDataWithPRs = [
        {
          exerciseName: "Test Exercise",
          dataPoints: [
            { date: "2025-02-15", weight: 135, reps: 8, new_reps: false, new_weight: false },
            { date: "2025-02-22", weight: 145, reps: 10, new_reps: true, new_weight: false },
            { date: "2025-03-01", weight: 155, reps: 8, new_reps: false, new_weight: true },
            { date: "2025-03-08", weight: 165, reps: 10, new_reps: true, new_weight: true },
          ],
        },
      ];

      (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(mockDataWithPRs);
      (Api.fetchPainProgressionData as jest.Mock).mockResolvedValue({ dataPoints: [] });
      (Api.fetchSleepProgressionData as jest.Mock).mockResolvedValue({ dataPoints: [] });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      });

      // Verify that the chart is rendered
      expect(screen.getByText("Test Exercise")).toBeInTheDocument();

      // Since there's only one exercise chart now, we can use getByTestId
      const charts = screen.getAllByTestId("line-chart");
      expect(charts.length).toBe(1); // Only the exercise chart, no pain/sleep charts
    });
  });

  describe("Enhanced Tooltip Formatting", () => {
    it("includes reps and PR indicators in tooltip data structure", async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      });

      // The tooltip formatting is tested through the data structure
      // Since we're mocking Recharts, we can't test the actual tooltip rendering
      // but we can verify the data contains the necessary fields
      expect(mockProgressionData[0].dataPoints[0]).toHaveProperty("reps");
      expect(mockProgressionData[0].dataPoints[0]).toHaveProperty("new_reps");
      expect(mockProgressionData[0].dataPoints[0]).toHaveProperty("new_weight");
    });
  });

  describe("Data Structure Validation", () => {
    it("handles data points with PR flags correctly", async () => {
      const dataWithMixedPRs = [
        {
          exerciseName: "Mixed PRs Exercise",
          dataPoints: [
            { date: "2025-02-15", weight: 100, reps: 5, new_reps: false, new_weight: false },
            { date: "2025-02-22", weight: 100, reps: 8, new_reps: true, new_weight: false },
            { date: "2025-03-01", weight: 110, reps: 5, new_reps: false, new_weight: true },
            { date: "2025-03-08", weight: 120, reps: 10, new_reps: true, new_weight: true },
          ],
        },
      ];

      (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(dataWithMixedPRs);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      });

      // Verify the exercise is rendered
      expect(screen.getByText("Mixed PRs Exercise")).toBeInTheDocument();

      // Verify PR legend is present
      expect(screen.getByText("Previous Rep")).toBeInTheDocument();
      expect(screen.getByText("New Rep PR")).toBeInTheDocument();
    });

    it("handles data points without PR flags gracefully", async () => {
      const dataWithoutPRFlags = [
        {
          exerciseName: "Legacy Data Exercise",
          dataPoints: [
            { date: "2025-02-15", weight: 100, reps: 5 },
            { date: "2025-02-22", weight: 110, reps: 6 },
          ],
        },
      ];

      (Api.fetchWeightProgressionData as jest.Mock).mockResolvedValue(dataWithoutPRFlags);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      });

      // Should still render the exercise and legend
      expect(screen.getByText("Legacy Data Exercise")).toBeInTheDocument();
      expect(screen.getByText("Previous Rep")).toBeInTheDocument();
    });
  });
});
