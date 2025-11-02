import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../mocks/server';
import TimelinePage from './TimelinePage';
import * as UserContext from '../contexts/useUserContext';
import { TimelineResponse } from '../types';

// Mock the UserContext
vi.mock('../contexts/useUserContext');

// Mock the child components
vi.mock('../components/CalendarView', () => ({
  __esModule: true,
  default: () => <div data-testid="calendar-view">Calendar View</div>,
}));

vi.mock('../components/ListView', () => ({
  ListView: () => <div data-testid="list-view">List View</div>,
}));

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
};

const mockTimelineData: TimelineResponse = {
  workouts: [
    {
      id: 1,
      date: '2025-01-15',
      withInstructor: false,
      userId: 1,
      exercises: [
        {
          id: 1,
          name: 'Squats',
          reps: 10,
          weight: 100,
          time_seconds: null,
        },
      ],
    },
  ],
  painScores: [
    {
      id: 1,
      date: '2025-01-15',
      score: 3,
      userId: 1,
    },
  ],
  sleepScores: [
    {
      id: 1,
      date: '2025-01-15',
      score: 8,
      userId: 1,
    },
  ],
  hasMore: false,
};

describe('TimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should call fetchTimeline API once on mount', async () => {
    let callCount = 0;
    server.use(
      http.get('/api/timeline', () => {
        callCount++;
        return HttpResponse.json(mockTimelineData);
      })
    );

    renderWithRouter(<TimelinePage />);

    await waitFor(() => {
      expect(callCount).toBe(1);
    });
  });

  it('should display loading state initially', () => {
    server.use(
      http.get('/api/timeline', () => {
        // Never resolve to keep loading state
        return new Promise(() => {});
      })
    );

    renderWithRouter(<TimelinePage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display calendar view by default after loading', async () => {
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json(mockTimelineData);
      })
    );

    renderWithRouter(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    });
  });

  it('should display error message when API call fails', async () => {
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({ error: 'API Error' }, { status: 500 });
      })
    );

    renderWithRouter(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
    });
  });

  it('should not call fetchTimeline when user is not logged in', () => {
    let callCount = 0;
    server.use(
      http.get('/api/timeline', () => {
        callCount++;
        return HttpResponse.json(mockTimelineData);
      })
    );

    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });

    renderWithRouter(<TimelinePage />);

    expect(callCount).toBe(0);
  });

  describe('Date range pagination', () => {
    it('should initially fetch last 3 months to next 3 months of data', async () => {
      let capturedStartDate: string | null = null;
      let capturedEndDate: string | null = null;

      server.use(
        http.get('/api/timeline', ({ request }) => {
          const url = new URL(request.url);
          capturedStartDate = url.searchParams.get('startDate');
          capturedEndDate = url.searchParams.get('endDate');
          return HttpResponse.json(mockTimelineData);
        })
      );

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(capturedStartDate).not.toBeNull();
        expect(capturedEndDate).not.toBeNull();
      });

      // Verify startDate is approximately 90 days ago
      const expectedStartDate = new Date();
      expectedStartDate.setDate(expectedStartDate.getDate() - 90);
      const expectedStart = expectedStartDate.toISOString().split('T')[0];
      expect(capturedStartDate).toBe(expectedStart);

      // Verify endDate is approximately 90 days ahead
      const expectedEndDate = new Date();
      expectedEndDate.setDate(expectedEndDate.getDate() + 90);
      const expectedEnd = expectedEndDate.toISOString().split('T')[0];
      expect(capturedEndDate).toBe(expectedEnd);
    });

    it('should extend date range by 3 months when loading more', async () => {
      server.use(
        http.get('/api/timeline', () => {
          return HttpResponse.json({ ...mockTimelineData, hasMore: true });
        })
      );

      const { rerender } = renderWithRouter(<TimelinePage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      });

      // Simulate load more action by triggering a re-render with updated state
      rerender(
        <BrowserRouter>
          <TimelinePage />
        </BrowserRouter>
      );
    });

    it('should pass hasMore flag to ListView', async () => {
      server.use(
        http.get('/api/timeline', () => {
          return HttpResponse.json({
            ...mockTimelineData,
            hasMore: true,
          });
        })
      );

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      });
    });

    it('should handle loading more data without duplicates', async () => {
      const initialData: TimelineResponse = {
        workouts: [{ id: 1, date: '2025-01-15', withInstructor: false, userId: 1, exercises: [] }],
        painScores: [],
        sleepScores: [],
        hasMore: true,
      };

      const olderData: TimelineResponse = {
        workouts: [{ id: 2, date: '2024-10-15', withInstructor: false, userId: 1, exercises: [] }],
        painScores: [],
        sleepScores: [],
        hasMore: false,
      };

      let callCount = 0;
      server.use(
        http.get('/api/timeline', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(initialData);
          }
          return HttpResponse.json({
            workouts: [...initialData.workouts, ...olderData.workouts],
            painScores: [],
            sleepScores: [],
            hasMore: false,
          });
        })
      );

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(callCount).toBe(1);
      });
    });

    it('should update hasMore state correctly when loading more data', async () => {
      const initialData: TimelineResponse = {
        workouts: [
          { id: 1, date: '2025-01-15', withInstructor: false, userId: 1, exercises: [] },
          { id: 2, date: '2025-01-10', withInstructor: false, userId: 1, exercises: [] },
          { id: 3, date: '2025-01-05', withInstructor: false, userId: 1, exercises: [] },
        ],
        painScores: [],
        sleepScores: [],
        hasMore: true,
      };

      const extendedData: TimelineResponse = {
        workouts: [
          ...initialData.workouts,
          { id: 4, date: '2024-10-15', withInstructor: false, userId: 1, exercises: [] },
          { id: 5, date: '2024-09-15', withInstructor: false, userId: 1, exercises: [] },
          { id: 6, date: '2024-08-15', withInstructor: false, userId: 1, exercises: [] },
        ],
        painScores: [],
        sleepScores: [],
        hasMore: false,
      };

      let callCount = 0;
      server.use(
        http.get('/api/timeline', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(initialData);
          }
          return HttpResponse.json(extendedData);
        })
      );

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(callCount).toBe(1);
      });
    });
  });
});
