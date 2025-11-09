import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Router, Route } from 'wouter';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import CalendarView from './CalendarView';
import * as UserContext from '../contexts/useUserContext';
import MockDate from 'mockdate';

// Mock wouter's useLocation
const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/', mockSetLocation],
  };
});

// Mock the UserContext
vi.mock('../contexts/useUserContext');

// Helper function to render CalendarView with Router
const renderCalendarView = () => {
  return render(
    <Router>
      <Route path="/">
        <CalendarView />
      </Route>
    </Router>
  );
};

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
};

describe('CalendarView', () => {
  const mockWorkouts = [
    {
      id: 1,
      userId: 1,
      date: '2025-05-10',
      withInstructor: true,
      exercises: [
        { id: 1, name: 'Push-ups', reps: 10 },
        { id: 2, name: 'Squats', reps: 15, weight: 20 },
      ],
    },
    {
      id: 2,
      userId: 1,
      date: '2025-05-05',
      withInstructor: false,
      exercises: [{ id: 3, name: 'Lunges', reps: 12 }],
    },
  ];

  const mockPainScores = [
    {
      id: 1,
      userId: 1,
      date: '2025-05-12',
      score: 3,
      notes: 'Mild pain in lower back',
    },
    {
      id: 2,
      userId: 1,
      date: '2025-05-08',
      score: 5,
      notes: null,
    },
  ];

  const mockSleepScores = [
    {
      id: 1,
      userId: 1,
      date: '2025-05-11',
      score: 4,
      notes: 'Slept well',
    },
    {
      id: 2,
      userId: 1,
      date: '2025-05-07',
      score: 2,
      notes: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date to always return May 2025
    MockDate.set('2025-05-15');

    // Mock window.innerWidth to simulate desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    // Mock window.addEventListener to capture resize event
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();

    // Mock user context with logged in user by default
    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  afterEach(() => {
    MockDate.reset();
  });

  describe('Data Fetching', () => {
    it('should call fetchTimeline API once on mount', async () => {
      let callCount = 0;
      server.use(
        http.get('/api/timeline', () => {
          callCount++;
          return HttpResponse.json({
            workouts: mockWorkouts,
            painScores: mockPainScores,
            sleepScores: mockSleepScores,
            hasMore: false,
          });
        })
      );

      renderCalendarView();

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

      renderCalendarView();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display error message when API call fails', async () => {
      // Suppress expected console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('/api/timeline', () => {
          return HttpResponse.json({ error: 'API Error' }, { status: 500 });
        })
      );

      renderCalendarView();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not call fetchTimeline when user is not logged in', () => {
      let callCount = 0;
      server.use(
        http.get('/api/timeline', () => {
          callCount++;
          return HttpResponse.json({
            workouts: mockWorkouts,
            painScores: mockPainScores,
            sleepScores: mockSleepScores,
            hasMore: false,
          });
        })
      );

      vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false,
      });

      renderCalendarView();

      expect(callCount).toBe(0);
    });

    it('should fetch data for the visible month', async () => {
      let capturedStartDate: string | null = null;
      let capturedEndDate: string | null = null;

      server.use(
        http.get('/api/timeline', ({ request }) => {
          const url = new URL(request.url);
          capturedStartDate = url.searchParams.get('startDate');
          capturedEndDate = url.searchParams.get('endDate');
          return HttpResponse.json({
            workouts: mockWorkouts,
            painScores: mockPainScores,
            sleepScores: mockSleepScores,
            hasMore: false,
          });
        })
      );

      renderCalendarView();

      await waitFor(() => {
        expect(capturedStartDate).not.toBeNull();
        expect(capturedEndDate).not.toBeNull();
      });

      // Verify dates are for May 2025 (current mocked month)
      expect(capturedStartDate).toBe('2025-05-01');
      expect(capturedEndDate).toBe('2025-05-31');
    });

    it('should refetch data when month changes', async () => {
      let callCount = 0;
      const capturedDates: Array<{ start: string; end: string }> = [];

      server.use(
        http.get('/api/timeline', ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const startDate = url.searchParams.get('startDate');
          const endDate = url.searchParams.get('endDate');
          if (startDate && endDate) {
            capturedDates.push({ start: startDate, end: endDate });
          }
          return HttpResponse.json({
            workouts: mockWorkouts,
            painScores: mockPainScores,
            sleepScores: mockSleepScores,
            hasMore: false,
          });
        })
      );

      renderCalendarView();

      // Wait for initial load (May 2025)
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Click next month button to go to June
      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);

      // Wait for second API call
      await waitFor(() => {
        expect(callCount).toBe(2);
      });

      // Verify that we fetched May and then June
      expect(capturedDates.length).toBe(2);
      expect(capturedDates[0]).toEqual({ start: '2025-05-01', end: '2025-05-31' });
      expect(capturedDates[1]).toEqual({ start: '2025-06-01', end: '2025-06-30' });
    });
  });

  it('renders calendar with workouts and pain scores', async () => {
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      })
    );

    renderCalendarView();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/May 2025/)).toBeInTheDocument();
    });

    // Check that the month title is displayed
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();

    // Check that day names are displayed
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();

    // Check that workout exercises are displayed
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Lunges')).toBeInTheDocument();

    // Check that pain scores are displayed
    expect(screen.getByText('Pain: 3')).toBeInTheDocument();
    expect(screen.getByText('Pain: 5')).toBeInTheDocument();
  });

  it('navigates to pain score edit page when pain score is clicked', async () => {
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      })
    );

    renderCalendarView();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Pain: 3')).toBeInTheDocument();
    });

    // Find and click a pain score
    const painScore = screen.getByText('Pain: 3');
    fireEvent.click(painScore);

    // Check that setLocation was called with the correct path
    expect(mockSetLocation).toHaveBeenCalledWith('/pain-scores/1/edit');
  });

  it('switches to mobile view when window width is small', async () => {
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      })
    );

    // Render with desktop width first
    const { rerender } = renderCalendarView();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/May 2025/)).toBeInTheDocument();
    });

    // Check that month view is displayed
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();

    // Simulate resize to mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Trigger resize event callback wrapped in act
    const addEventListenerMock = window.addEventListener as unknown as {
      mock: { calls: unknown[][] };
    };
    const resizeCallback = addEventListenerMock.mock.calls.find(
      (call: unknown[]) => call[0] === 'resize'
    )?.[1] as () => void;

    await waitFor(() => {
      resizeCallback();
    });

    // Re-render to apply the state change
    rerender(
      <Router>
        <Route path="/">
          <CalendarView />
        </Route>
      </Router>
    );

    // Wait for the view to update
    await waitFor(() => {
      expect(screen.getByText('Sunday')).toBeInTheDocument();
    });

    // Check that week view is displayed
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('renders empty calendar when no items', async () => {
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: [],
          painScores: [],
          sleepScores: [],
          hasMore: false,
        });
      })
    );

    renderCalendarView();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/May 2025/)).toBeInTheDocument();
    });

    // Check that the calendar is rendered
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();

    // We can't check for specific empty state messages since they might be empty divs,
    // but we can verify that no workout or pain score content is displayed
    expect(screen.queryByText(/Pain:/)).not.toBeInTheDocument();
  });

  describe('Week Navigation in Mobile View', () => {
    it('should fetch data for new month when week navigation crosses month boundary', async () => {
      // Mock April and May data
      // May 15 is mocked as "today", which falls in the week of May 11-17
      // We'll put workouts in the displayed weeks
      const aprilWorkouts = [
        {
          id: 3,
          userId: 1,
          date: '2025-04-25', // This should be in a week that we navigate to
          withInstructor: false,
          exercises: [{ id: 4, name: 'April Workout', reps: 10 }],
        },
      ];

      const mayWorkouts = [
        {
          id: 1,
          userId: 1,
          date: '2025-05-14', // Wednesday in the current week (May 11-17)
          withInstructor: true,
          exercises: [{ id: 1, name: 'May Workout', reps: 10 }],
        },
      ];

      const apiCalls: string[] = [];

      server.use(
        http.get('/api/timeline', ({ request }) => {
          const url = new URL(request.url);
          const startDate = url.searchParams.get('startDate');
          const endDate = url.searchParams.get('endDate');
          apiCalls.push(`${startDate} to ${endDate}`);

          // Return April data for April requests
          if (startDate?.startsWith('2025-04')) {
            return HttpResponse.json({
              workouts: aprilWorkouts,
              painScores: [],
              sleepScores: [],
              hasMore: false,
            });
          }

          // Return May data for May requests
          return HttpResponse.json({
            workouts: mayWorkouts,
            painScores: [],
            sleepScores: [],
            hasMore: false,
          });
        })
      );

      // Set window to mobile size to trigger week view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderCalendarView();

      // Wait for initial May data to load and week view to render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /May 11 - May 17/ })).toBeInTheDocument();
      });

      // Verify May workout is visible
      await waitFor(() => {
        expect(screen.getByText('May Workout')).toBeInTheDocument();
      });

      // Should have fetched May data initially
      expect(apiCalls.length).toBe(1);
      expect(apiCalls[0]).toContain('2025-05-01');

      // Navigate to previous week (multiple times to get into April)
      const prevWeekButton = screen.getByRole('button', { name: 'Previous week' });

      // Click 3 times to go back ~3 weeks into April (from mid-May to late April)
      fireEvent.click(prevWeekButton);
      await waitFor(() => {}, { timeout: 100 });

      fireEvent.click(prevWeekButton);
      await waitFor(() => {}, { timeout: 100 });

      fireEvent.click(prevWeekButton);

      // Wait for April data to be fetched
      await waitFor(
        () => {
          expect(apiCalls.length).toBeGreaterThan(1);
        },
        { timeout: 2000 }
      );

      // Verify that April data was fetched
      const aprilFetch = apiCalls.find((call) => call.includes('2025-04-01'));
      expect(aprilFetch).toBeDefined();

      // Verify April workout is now visible
      await waitFor(
        () => {
          expect(screen.getByText('April Workout')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Both workouts should be visible (accumulated data)
      // Note: May workout may not be visible anymore since we navigated to a different week,
      // but the data should still be in memory
      expect(screen.getByText('April Workout')).toBeInTheDocument();
    });

    it('should not refetch data for a month that was already fetched', async () => {
      const mayWorkouts = [
        {
          id: 1,
          userId: 1,
          date: '2025-05-10',
          withInstructor: true,
          exercises: [{ id: 1, name: 'May Workout', reps: 10 }],
        },
      ];

      let fetchCount = 0;

      server.use(
        http.get('/api/timeline', () => {
          fetchCount++;
          return HttpResponse.json({
            workouts: mayWorkouts,
            painScores: [],
            sleepScores: [],
            hasMore: false,
          });
        })
      );

      // Set window to mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderCalendarView();

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('May Workout')).toBeInTheDocument();
      });

      expect(fetchCount).toBe(1);

      // Navigate forward and backward within the same month
      const prevWeekButton = screen.getByRole('button', { name: 'Previous week' });
      const nextWeekButton = screen.getByRole('button', { name: 'Next week' });

      fireEvent.click(prevWeekButton);
      await waitFor(() => {}, { timeout: 100 });

      fireEvent.click(nextWeekButton);
      await waitFor(() => {}, { timeout: 100 });

      // Should still be only 1 fetch (no refetch for same month)
      expect(fetchCount).toBe(1);
    });
  });
});
