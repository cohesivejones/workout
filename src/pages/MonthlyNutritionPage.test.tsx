import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import MonthlyNutritionPage from './MonthlyNutritionPage';
import { format, startOfMonth, endOfMonth, addDays, addMonths } from 'date-fns';

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MonthlyNutritionPage', () => {
  const getFirstDayOfCurrentMonth = () => startOfMonth(new Date());

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.ResizeObserver = ResizeObserverMock as any;
  });

  const createMockMonthlySummary = (monthStartDate: Date) => {
    const monthStart = format(monthStartDate, 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(monthStartDate), 'yyyy-MM-dd');
    const daysInMonth = endOfMonth(monthStartDate).getDate();

    return {
      monthStart,
      monthEnd,
      dailyData: Array.from({ length: daysInMonth }, (_, i) => ({
        date: format(addDays(monthStartDate, i), 'yyyy-MM-dd'),
        weight: null,
        totalCalories: null,
        totalProtein: null,
        totalCarbs: null,
        totalFat: null,
        workoutDay: false,
      })),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    server.use(
      http.get('/api/nutrition/monthly-summary', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(createMockMonthlySummary(getFirstDayOfCurrentMonth()));
      })
    );

    render(<MonthlyNutritionPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders page header and month navigator', async () => {
    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(createMockMonthlySummary(getFirstDayOfCurrentMonth()));
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Nutrition Analytics')).toBeInTheDocument();
      expect(
        screen.getByText('Track your weight and calorie trends throughout the month')
      ).toBeInTheDocument();
      expect(screen.getByText('← Previous Month')).toBeInTheDocument();
      expect(screen.getByText('Next Month →')).toBeInTheDocument();
      expect(screen.getByText('Current Month')).toBeInTheDocument();
    });
  });

  it('displays empty state when no data exists', async () => {
    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(createMockMonthlySummary(getFirstDayOfCurrentMonth()));
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('No data available for this month.')).toBeInTheDocument();
      expect(
        screen.getByText('Start logging meals and weight entries to see your progress!')
      ).toBeInTheDocument();
    });
  });

  it('displays weight chart when weight data exists', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const mockData = createMockMonthlySummary(monthStart);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).weight = 85.5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[5] as any).weight = 85.3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[10] as any).weight = 85.1;

    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Weight Trend')).toBeInTheDocument();
    });
  });

  it('displays calorie chart when calorie data exists', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const mockData = createMockMonthlySummary(monthStart);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).totalCalories = 2000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[1] as any).totalCalories = 1800;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[2] as any).totalCalories = 2200;

    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Calorie Intake')).toBeInTheDocument();
    });
  });

  it('displays both charts when both data types exist', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const mockData = createMockMonthlySummary(monthStart);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).weight = 85.5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).totalCalories = 2000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[1] as any).weight = 85.3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[1] as any).totalCalories = 1900;

    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Weight Trend')).toBeInTheDocument();
      expect(screen.getByText('Calorie Intake')).toBeInTheDocument();
    });
  });

  it('navigates to previous month when clicking Previous Month button', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const previousMonthStart = addMonths(monthStart, -1);

    let requestCount = 0;
    server.use(
      http.get('/api/nutrition/monthly-summary', ({ request }) => {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        requestCount++;

        if (requestCount === 1) {
          // Initial load - current month
          expect(startDate).toBe(format(monthStart, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockMonthlySummary(monthStart));
        } else {
          // After clicking previous month
          expect(startDate).toBe(format(previousMonthStart, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockMonthlySummary(previousMonthStart));
        }
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('← Previous Month')).toBeInTheDocument();
    });

    const previousButton = screen.getByText('← Previous Month');
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(requestCount).toBe(2);
    });
  });

  it('navigates to next month when clicking Next Month button', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const nextMonthStart = addMonths(monthStart, 1);

    let requestCount = 0;
    server.use(
      http.get('/api/nutrition/monthly-summary', ({ request }) => {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        requestCount++;

        if (requestCount === 1) {
          expect(startDate).toBe(format(monthStart, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockMonthlySummary(monthStart));
        } else {
          expect(startDate).toBe(format(nextMonthStart, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockMonthlySummary(nextMonthStart));
        }
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Next Month →')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next Month →');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(requestCount).toBe(2);
    });
  });

  it('returns to current month when clicking Current Month button', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const previousMonthStart = addMonths(monthStart, -1);

    let requestCount = 0;
    server.use(
      http.get('/api/nutrition/monthly-summary', ({ request }) => {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        requestCount++;

        if (requestCount === 1) {
          return HttpResponse.json(createMockMonthlySummary(monthStart));
        } else if (requestCount === 2) {
          // After clicking previous month
          expect(startDate).toBe(format(previousMonthStart, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockMonthlySummary(previousMonthStart));
        } else {
          // After clicking current month
          expect(startDate).toBe(format(monthStart, 'yyyy-MM-dd'));
          return HttpResponse.json(createMockMonthlySummary(monthStart));
        }
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Current Month')).toBeInTheDocument();
    });

    // Navigate to previous month first
    const previousButton = screen.getByText('← Previous Month');
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(requestCount).toBe(2);
    });

    // Then return to current month
    const currentButton = screen.getByText('Current Month');
    fireEvent.click(currentButton);

    await waitFor(() => {
      expect(requestCount).toBe(3);
    });
  });

  it('displays correct month', async () => {
    const monthStart = new Date('2024-01-01');

    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(createMockMonthlySummary(monthStart));
      })
    );

    // Mock current date to be in that month
    vi.setSystemTime(monthStart);

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      // Should display "January 2024"
      expect(screen.getByText(/January 2024/)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data. Please try again later.')).toBeInTheDocument();
    });
  });

  it('makes API request with correct startDate parameter', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const expectedDate = format(monthStart, 'yyyy-MM-dd');

    let capturedStartDate: string | null = null;

    server.use(
      http.get('/api/nutrition/monthly-summary', ({ request }) => {
        const url = new URL(request.url);
        capturedStartDate = url.searchParams.get('startDate');
        return HttpResponse.json(createMockMonthlySummary(monthStart));
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(capturedStartDate).toBe(expectedDate);
    });
  });

  it('does not display charts when no data is available', async () => {
    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(createMockMonthlySummary(getFirstDayOfCurrentMonth()));
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('No data available for this month.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Weight Trend')).not.toBeInTheDocument();
    expect(screen.queryByText('Calorie Intake')).not.toBeInTheDocument();
  });

  it('displays workout day markers on calorie chart', async () => {
    const monthStart = getFirstDayOfCurrentMonth();
    const mockData = createMockMonthlySummary(monthStart);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).totalCalories = 2000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[0] as any).workoutDay = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[5] as any).totalCalories = 1800;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockData.dailyData[5] as any).workoutDay = true;

    server.use(
      http.get('/api/nutrition/monthly-summary', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(<MonthlyNutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Calorie Intake')).toBeInTheDocument();
      expect(screen.getByText('🏋️ = Workout Day')).toBeInTheDocument();
    });
  });
});
