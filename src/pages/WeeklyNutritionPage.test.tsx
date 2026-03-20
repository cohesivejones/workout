import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import WeeklyNutritionPage from './WeeklyNutritionPage';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('WeeklyNutritionPage', () => {
  const getMondayOfCurrentWeek = () => startOfWeek(new Date(), { weekStartsOn: 1 });

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.ResizeObserver = ResizeObserverMock as any;
  });

  const createMockWeeklySummary = (weekStartDate: Date) => {
    const weekStart = format(weekStartDate, 'yyyy-MM-dd');
    const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd');

    return {
      weekStart,
      weekEnd,
      dailyData: Array.from({ length: 7 }, (_, i) => ({
        date: format(addDays(weekStartDate, i), 'yyyy-MM-dd'),
        weight: null,
        totalCalories: null,
        totalProtein: null,
        totalCarbs: null,
        totalFat: null,
      })),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    server.use(
      http.get('/api/nutrition/weekly-summary', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(createMockWeeklySummary(getMondayOfCurrentWeek()));
      })
    );

    render(<WeeklyNutritionPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders page header and week navigator', async () => {
    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(createMockWeeklySummary(getMondayOfCurrentWeek()));
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Nutrition Analytics')).toBeInTheDocument();
      expect(
        screen.getByText('Track your weight and calorie trends throughout the week')
      ).toBeInTheDocument();
      expect(screen.getByText('← Previous Week')).toBeInTheDocument();
      expect(screen.getByText('Next Week →')).toBeInTheDocument();
      expect(screen.getByText('Current Week')).toBeInTheDocument();
    });
  });

  it('displays empty state when no data exists', async () => {
    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(createMockWeeklySummary(getMondayOfCurrentWeek()));
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('No data available for this week.')).toBeInTheDocument();
      expect(
        screen.getByText('Start logging meals and weight entries to see your progress!')
      ).toBeInTheDocument();
    });
  });

  it('displays weight chart when weight data exists', async () => {
    const monday = getMondayOfCurrentWeek();
    const mockData = createMockWeeklySummary(monday);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).weight = 85.5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[2] as any).weight = 85.3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[4] as any).weight = 85.1;

    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Weight Trend')).toBeInTheDocument();
    });
  });

  it('displays calorie chart when calorie data exists', async () => {
    const monday = getMondayOfCurrentWeek();
    const mockData = createMockWeeklySummary(monday);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).totalCalories = 2000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[1] as any).totalCalories = 1800;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[2] as any).totalCalories = 2200;

    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Calorie Intake')).toBeInTheDocument();
    });
  });

  it('displays both charts when both data types exist', async () => {
    const monday = getMondayOfCurrentWeek();
    const mockData = createMockWeeklySummary(monday);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).weight = 85.5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).totalCalories = 2000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[1] as any).weight = 85.3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[1] as any).totalCalories = 1900;

    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Weight Trend')).toBeInTheDocument();
      expect(screen.getByText('Calorie Intake')).toBeInTheDocument();
    });
  });

  it('navigates to previous week when clicking Previous Week button', async () => {
    const monday = getMondayOfCurrentWeek();
    const previousMonday = addWeeks(monday, -1);

    let requestCount = 0;
    server.use(
      http.get('/api/nutrition/weekly-summary', ({ request }) => {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        requestCount++;

        if (requestCount === 1) {
          // Initial load - current week
          expect(startDate).toBe(format(monday, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockWeeklySummary(monday));
        } else {
          // After clicking previous week
          expect(startDate).toBe(format(previousMonday, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockWeeklySummary(previousMonday));
        }
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('← Previous Week')).toBeInTheDocument();
    });

    const previousButton = screen.getByText('← Previous Week');
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(requestCount).toBe(2);
    });
  });

  it('navigates to next week when clicking Next Week button', async () => {
    const monday = getMondayOfCurrentWeek();
    const nextMonday = addWeeks(monday, 1);

    let requestCount = 0;
    server.use(
      http.get('/api/nutrition/weekly-summary', ({ request }) => {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        requestCount++;

        if (requestCount === 1) {
          expect(startDate).toBe(format(monday, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockWeeklySummary(monday));
        } else {
          expect(startDate).toBe(format(nextMonday, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockWeeklySummary(nextMonday));
        }
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Next Week →')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next Week →');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(requestCount).toBe(2);
    });
  });

  it('returns to current week when clicking Current Week button', async () => {
    const monday = getMondayOfCurrentWeek();
    const previousMonday = addWeeks(monday, -1);

    let requestCount = 0;
    server.use(
      http.get('/api/nutrition/weekly-summary', ({ request }) => {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        requestCount++;

        if (requestCount === 1) {
          return HttpResponse.json(createMockWeeklySummary(monday));
        } else if (requestCount === 2) {
          // After clicking previous week
          expect(startDate).toBe(format(previousMonday, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockWeeklySummary(previousMonday));
        } else {
          // After clicking current week
          expect(startDate).toBe(format(monday, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockWeeklySummary(monday));
        }
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Current Week')).toBeInTheDocument();
    });

    // Navigate to previous week first
    const previousButton = screen.getByText('← Previous Week');
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(requestCount).toBe(2);
    });

    // Then return to current week
    const currentButton = screen.getByText('Current Week');
    fireEvent.click(currentButton);

    await waitFor(() => {
      expect(requestCount).toBe(3);
    });
  });

  it('displays correct week date range', async () => {
    const monday = new Date('2024-01-15'); // A known Monday

    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(createMockWeeklySummary(monday));
      })
    );

    // Mock current date to be in that week
    vi.setSystemTime(monday);

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      // Should display "Jan 15 - Jan 21, 2024"
      expect(screen.getByText(/Jan 15.*Jan 21, 2024/)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data. Please try again later.')).toBeInTheDocument();
    });
  });

  it('makes API request with correct startDate parameter', async () => {
    const monday = getMondayOfCurrentWeek();
    const expectedDate = format(monday, 'yyyy-MM-dd');

    let capturedStartDate: string | null = null;

    server.use(
      http.get('/api/nutrition/weekly-summary', ({ request }) => {
        const url = new URL(request.url);
        capturedStartDate = url.searchParams.get('startDate');
        return HttpResponse.json(createMockWeeklySummary(monday));
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(capturedStartDate).toBe(expectedDate);
    });
  });

  it('does not display charts when no data is available', async () => {
    server.use(
      http.get('/api/nutrition/weekly-summary', () => {
        return HttpResponse.json(createMockWeeklySummary(getMondayOfCurrentWeek()));
      })
    );

    render(<WeeklyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('No data available for this week.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Weight Trend')).not.toBeInTheDocument();
    expect(screen.queryByText('Calorie Intake')).not.toBeInTheDocument();
  });
});
