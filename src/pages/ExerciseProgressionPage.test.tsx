import { render, screen, waitFor } from '@testing-library/react';
import { Route } from 'wouter';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import ExerciseProgressionPage from './ExerciseProgressionPage';
import * as UserContext from '../contexts/useUserContext';
import { MemoryRouter } from '../test-utils/MemoryRouter';

// Mock recharts to avoid rendering complexity in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock the UserContext
vi.mock('../contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

describe('ExerciseProgressionPage', () => {
  const mockProgressionData = {
    exerciseName: 'Bench Press',
    weightData: [
      { date: '2025-01-01', weight: 135, reps: 10, new_weight: false, new_reps: false },
      { date: '2025-01-08', weight: 135, reps: 12, new_weight: false, new_reps: true },
      { date: '2025-01-15', weight: 145, reps: 10, new_weight: true, new_reps: false },
    ],
    repsData: [
      { date: '2025-01-01', reps: 10, weight: 135, new_weight: false, new_reps: false },
      { date: '2025-01-08', reps: 12, weight: 135, new_weight: false, new_reps: true },
      { date: '2025-01-15', reps: 10, weight: 145, new_weight: true, new_reps: false },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the user context to simulate a logged-in user
    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: { id: 1, name: 'Test User', email: 'test@example.com' },
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  it('renders loading state initially', () => {
    server.use(
      http.get('/api/exercises/:id/progression', () => {
        return new Promise(() => {}); // Never resolve
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Check that loading state is displayed
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders exercise name from API response', async () => {
    server.use(
      http.get('/api/exercises/:id/progression', ({ params }) => {
        expect(params.id).toBe('1');
        return HttpResponse.json(mockProgressionData);
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check that exercise name is displayed
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('calls API with correct exercise ID from URL params', async () => {
    let capturedId: string | undefined;

    server.use(
      http.get('/api/exercises/:id/progression', ({ params }) => {
        capturedId = params.id as string;
        return HttpResponse.json(mockProgressionData);
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/42/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for API call
    await waitFor(() => {
      expect(capturedId).toBe('42');
    });
  });

  it('renders error state when API call fails', async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/exercises/:id/progression', () => {
        return HttpResponse.json({ error: 'Failed to load progression data' }, { status: 500 });
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('renders "no data" state when exercise has no history', async () => {
    const emptyData = {
      exerciseName: 'New Exercise',
      weightData: [],
      repsData: [],
    };

    server.use(
      http.get('/api/exercises/:id/progression', () => {
        return HttpResponse.json(emptyData);
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check that "no data" message is displayed
    expect(screen.getByText(/No progression data/i)).toBeInTheDocument();
  });

  it('renders charts when data is available', async () => {
    server.use(
      http.get('/api/exercises/:id/progression', () => {
        return HttpResponse.json(mockProgressionData);
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check that charts are rendered (mocked components)
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts).toHaveLength(2); // Weight chart and reps chart
  });

  it('renders back button that navigates to previous page', async () => {
    server.use(
      http.get('/api/exercises/:id/progression', () => {
        return HttpResponse.json(mockProgressionData);
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check that back button exists
    const backButton = screen.getByRole('link', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('renders chart section headings', async () => {
    server.use(
      http.get('/api/exercises/:id/progression', () => {
        return HttpResponse.json(mockProgressionData);
      })
    );

    render(
      <MemoryRouter initialPath="/exercises/1/progression">
        <Route path="/exercises/:id/progression">
          <ExerciseProgressionPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check that section headings are displayed
    expect(screen.getByText(/Weight Progression/i)).toBeInTheDocument();
    expect(screen.getByText(/Rep Progression/i)).toBeInTheDocument();
  });
});
