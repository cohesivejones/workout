import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { ListView } from './ListView';
import * as UserContext from '../contexts/useUserContext';
import { TimelineResponse } from '../types';

// Mock window.confirm
const originalConfirm = window.confirm;

// Mock the UserContext
vi.mock('../contexts/useUserContext');

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
      score: 4,
      userId: 1,
    },
  ],
  hasMore: false,
};

describe('ListView', () => {
  const mockWorkouts = [
    {
      id: 1,
      userId: 1,
      date: '2025-04-10',
      withInstructor: true,
      exercises: [
        { id: 1, name: 'Push-ups', reps: 10, new_reps: true },
        { id: 2, name: 'Squats', reps: 15, weight: 20, new_weight: true },
      ],
    },
    {
      id: 2,
      userId: 1,
      date: '2025-04-05',
      withInstructor: false,
      exercises: [{ id: 3, name: 'Lunges', reps: 12 }],
    },
  ];

  const mockPainScores = [
    {
      id: 1,
      userId: 1,
      date: '2025-04-12',
      score: 3,
      notes: 'Mild pain in lower back',
    },
    {
      id: 2,
      userId: 1,
      date: '2025-04-08',
      score: 5,
      notes: null,
    },
  ];

  const mockSleepScores = [
    {
      id: 1,
      userId: 1,
      date: '2025-04-11',
      score: 4,
      notes: 'Slept well',
    },
    {
      id: 2,
      userId: 1,
      date: '2025-04-07',
      score: 2,
      notes: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm to always return true
    window.confirm = vi.fn().mockReturnValue(true);

    // Mock user context with logged in user by default
    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  afterEach(() => {
    // Restore original window.confirm
    window.confirm = originalConfirm;
  });

  describe('Data Fetching', () => {
    it('should call fetchTimeline API once on mount', async () => {
      let callCount = 0;
      server.use(
        http.get('/api/timeline', () => {
          callCount++;
          return HttpResponse.json(mockTimelineData);
        })
      );

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display error message when API call fails', async () => {
      server.use(
        http.get('/api/timeline', () => {
          return HttpResponse.json({ error: 'API Error' }, { status: 500 });
        })
      );

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      expect(callCount).toBe(0);
    });

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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

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
      let callCount = 0;
      const capturedStartDates: string[] = [];

      server.use(
        http.get('/api/timeline', ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const startDate = url.searchParams.get('startDate');
          if (startDate) {
            capturedStartDates.push(startDate);
          }
          return HttpResponse.json({ ...mockTimelineData, hasMore: callCount === 1 });
        })
      );

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Click load more button
      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      fireEvent.click(loadMoreButton);

      // Wait for second API call
      await waitFor(() => {
        expect(callCount).toBe(2);
      });

      // Verify that the second call has a start date 90 days earlier
      expect(capturedStartDates.length).toBe(2);
      const firstStart = new Date(capturedStartDates[0]);
      const secondStart = new Date(capturedStartDates[1]);
      const daysDiff = Math.round(
        (firstStart.getTime() - secondStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(90);
    });
  });

  it('renders workouts and pain scores in chronological order', async () => {
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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 12, 2025 (Saturday)')).toBeInTheDocument();
    });

    // Check that all items are rendered
    expect(screen.getByText('Apr 12, 2025 (Saturday)')).toBeInTheDocument();
    expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    expect(screen.getByText('Apr 8, 2025 (Tuesday)')).toBeInTheDocument();
    expect(screen.getByText('Apr 5, 2025 (Saturday)')).toBeInTheDocument();

    // Check that items are in the correct order (newest first)
    const dates = screen.getAllByText(/Apr \d+, 2025/);
    expect(dates[0].textContent).toContain('Apr 12'); // Pain score
    expect(dates[1].textContent).toContain('Apr 11'); // Sleep score
    expect(dates[2].textContent).toContain('Apr 10'); // Workout
    expect(dates[3].textContent).toContain('Apr 8'); // Pain score
    expect(dates[4].textContent).toContain('Apr 7'); // Sleep score
    expect(dates[5].textContent).toContain('Apr 5'); // Workout

    // Check workout details
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('10 reps')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText(/15 reps - 20 lbs/)).toBeInTheDocument();
    expect(screen.getByText('Lunges')).toBeInTheDocument();
    expect(screen.getByText('12 reps')).toBeInTheDocument();

    // Check pain score details
    expect(screen.getAllByText('Pain Level:')[0]).toBeInTheDocument();
    expect(screen.getByText(/3 -/)).toBeInTheDocument();
    expect(screen.getByText(/Noticeable and distracting pain/)).toBeInTheDocument();
    expect(screen.getByText(/5 -/)).toBeInTheDocument();
    // Use a more flexible regex that matches the text regardless of spaces or apostrophes
    expect(screen.getByText(/Moderately strong pain/)).toBeInTheDocument();
    expect(screen.getByText('Mild pain in lower back')).toBeInTheDocument();
  });

  it('displays empty state message when no items', async () => {
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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(
        screen.getByText('No workouts, pain scores, or sleep scores recorded yet.')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('No workouts, pain scores, or sleep scores recorded yet.')
    ).toBeInTheDocument();
  });

  it('handles workout deletion', async () => {
    // Mock timeline data
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      }),
      http.delete('/api/workouts/:id', () => {
        return HttpResponse.json({ id: 1 });
      })
    );

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    });

    // Find delete buttons for workouts
    const deleteButtons = screen.getAllByTitle('Delete workout');
    expect(deleteButtons.length).toBe(2);

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that confirm was called
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this workout?');

    // Check that the workout was removed from the list
    await waitFor(() => {
      const remainingDeleteButtons = screen.getAllByTitle('Delete workout');
      expect(remainingDeleteButtons.length).toBe(1);
    });
  });

  it('handles pain score deletion', async () => {
    // Mock timeline data
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      }),
      http.delete('/api/pain-scores/:id', () => {
        return HttpResponse.json({ id: 1 });
      })
    );

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 12, 2025 (Saturday)')).toBeInTheDocument();
    });

    // Find delete buttons for pain scores
    const deleteButtons = screen.getAllByTitle('Delete pain score');
    expect(deleteButtons.length).toBe(2);

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that confirm was called
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this pain score?');

    // Check that the pain score was removed from the list
    await waitFor(() => {
      const remainingDeleteButtons = screen.getAllByTitle('Delete pain score');
      expect(remainingDeleteButtons.length).toBe(1);
    });
  });

  it('handles workout deletion error', async () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = vi.fn();

    // Mock window.alert
    const originalAlert = window.alert;
    window.alert = vi.fn();

    // Mock timeline data and failed deletion
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      }),
      http.delete('/api/workouts/:id', () => {
        return HttpResponse.json({ error: 'Failed to delete' }, { status: 500 });
      })
    );

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    });

    // Find delete buttons for workouts
    const deleteButtons = screen.getAllByTitle('Delete workout');

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that the error was handled
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Failed to delete workout:', expect.any(Error));
      expect(window.alert).toHaveBeenCalledWith('Failed to delete workout. Please try again.');
    });

    // Restore mocks
    console.error = originalConsoleError;
    window.alert = originalAlert;
  });

  it('handles pain score deletion error', async () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = vi.fn();

    // Mock window.alert
    const originalAlert = window.alert;
    window.alert = vi.fn();

    // Mock timeline data and failed deletion
    server.use(
      http.get('/api/timeline', () => {
        return HttpResponse.json({
          workouts: mockWorkouts,
          painScores: mockPainScores,
          sleepScores: mockSleepScores,
          hasMore: false,
        });
      }),
      http.delete('/api/pain-scores/:id', () => {
        return HttpResponse.json({ error: 'Failed to delete' }, { status: 500 });
      })
    );

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 12, 2025 (Saturday)')).toBeInTheDocument();
    });

    // Find delete buttons for pain scores
    const deleteButtons = screen.getAllByTitle('Delete pain score');

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that the error was handled
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Failed to delete pain score:', expect.any(Error));
      expect(window.alert).toHaveBeenCalledWith('Failed to delete pain score. Please try again.');
    });

    // Restore mocks
    console.error = originalConsoleError;
    window.alert = originalAlert;
  });

  it('does not delete when user cancels confirmation', async () => {
    // Override the mock to return false (user clicked "Cancel")
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    });

    // Find delete buttons for workouts
    const deleteButtons = screen.getAllByTitle('Delete workout');
    const initialCount = deleteButtons.length;

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    // Check that confirm was called
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this workout?');

    // Check that the workout count hasn't changed
    const stillDeleteButtons = screen.getAllByTitle('Delete workout');
    expect(stillDeleteButtons.length).toBe(initialCount);
  });

  it('displays filter controls', async () => {
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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    });

    // Check that filter controls are rendered
    expect(screen.getByText('Filter by Type:')).toBeInTheDocument();

    // Check that all checkboxes are rendered and checked by default
    const workoutsCheckbox = screen.getByLabelText('Workouts') as HTMLInputElement;
    const painScoresCheckbox = screen.getByLabelText('Pain Scores') as HTMLInputElement;
    const sleepScoresCheckbox = screen.getByLabelText('Sleep Scores') as HTMLInputElement;

    expect(workoutsCheckbox).toBeInTheDocument();
    expect(painScoresCheckbox).toBeInTheDocument();
    expect(sleepScoresCheckbox).toBeInTheDocument();

    expect(workoutsCheckbox.checked).toBe(true);
    expect(painScoresCheckbox.checked).toBe(true);
    expect(sleepScoresCheckbox.checked).toBe(true);

    // Check that Show All button is rendered
    expect(screen.getByText('Show All')).toBeInTheDocument();
  });

  it('filters items when checkboxes are clicked', async () => {
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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    });

    // Initially all items should be visible
    expect(screen.getAllByText('Workout').length).toBe(2); // 2 workout cards
    expect(screen.getAllByText('Pain Score').length).toBe(2); // 2 pain score cards
    expect(screen.getAllByText('Sleep Score').length).toBe(2); // 2 sleep score cards

    // Uncheck workouts
    const workoutsCheckbox = screen.getByLabelText('Workouts') as HTMLInputElement;
    fireEvent.click(workoutsCheckbox);

    // Now only pain scores and sleep scores should be visible
    expect(screen.queryAllByText('Workout').length).toBe(0);
    expect(screen.getAllByText('Pain Score').length).toBe(2);
    expect(screen.getAllByText('Sleep Score').length).toBe(2);

    // Uncheck pain scores
    const painScoresCheckbox = screen.getByLabelText('Pain Scores') as HTMLInputElement;
    fireEvent.click(painScoresCheckbox);

    // Now only sleep scores should be visible
    expect(screen.queryAllByText('Workout').length).toBe(0);
    expect(screen.queryAllByText('Pain Score').length).toBe(0);
    expect(screen.getAllByText('Sleep Score').length).toBe(2);

    // Uncheck sleep scores
    const sleepScoresCheckbox = screen.getByLabelText('Sleep Scores') as HTMLInputElement;
    fireEvent.click(sleepScoresCheckbox);

    // Now no items should be visible, but the empty state message should be shown
    expect(screen.queryAllByText('Workout').length).toBe(0);
    expect(screen.queryAllByText('Pain Score').length).toBe(0);
    expect(screen.queryAllByText('Sleep Score').length).toBe(0);
    expect(
      screen.getByText('No workouts, pain scores, or sleep scores recorded yet.')
    ).toBeInTheDocument();
  });

  it('resets filters when Show All button is clicked', async () => {
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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
    });

    // Uncheck all checkboxes
    const workoutsCheckbox = screen.getByLabelText('Workouts') as HTMLInputElement;
    const painScoresCheckbox = screen.getByLabelText('Pain Scores') as HTMLInputElement;
    const sleepScoresCheckbox = screen.getByLabelText('Sleep Scores') as HTMLInputElement;

    fireEvent.click(workoutsCheckbox);
    fireEvent.click(painScoresCheckbox);
    fireEvent.click(sleepScoresCheckbox);

    // Verify no items are visible
    expect(screen.queryAllByText('Workout').length).toBe(0);
    expect(screen.queryAllByText('Pain Score').length).toBe(0);
    expect(screen.queryAllByText('Sleep Score').length).toBe(0);

    // Click Show All button
    const showAllButton = screen.getByText('Show All');
    fireEvent.click(showAllButton);

    // Now all items should be visible again
    expect(screen.getAllByText('Workout').length).toBe(2);
    expect(screen.getAllByText('Pain Score').length).toBe(2);
    expect(screen.getAllByText('Sleep Score').length).toBe(2);

    // And all checkboxes should be checked
    expect(workoutsCheckbox.checked).toBe(true);
    expect(painScoresCheckbox.checked).toBe(true);
    expect(sleepScoresCheckbox.checked).toBe(true);
  });

  it('displays NEW REPS and NEW WEIGHT badges when flags are set', async () => {
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

    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
    });

    // Check that the NEW REPS badge is displayed for Push-ups
    const newRepsBadges = screen.getAllByText('NEW REPS');
    expect(newRepsBadges.length).toBe(1);

    // Check that the NEW WEIGHT badge is displayed for Squats
    const newWeightBadges = screen.getAllByText('NEW WEIGHT');
    expect(newWeightBadges.length).toBe(1);

    // Verify that the badges are associated with the correct exercises
    const pushUpsItem = screen.getByText('Push-ups').closest('.exerciseItem');
    const squatsItem = screen.getByText('Squats').closest('.exerciseItem');
    const lungesItem = screen.getByText('Lunges').closest('.exerciseItem');

    expect(pushUpsItem).toContainElement(newRepsBadges[0]);
    expect(squatsItem).toContainElement(newWeightBadges[0]);

    // Verify that Lunges doesn't have any badges
    expect(lungesItem).not.toHaveTextContent('NEW REPS');
    expect(lungesItem).not.toHaveTextContent('NEW WEIGHT');
  });

  describe('FAB (Floating Action Button)', () => {
    it('renders FAB button with correct aria-label', async () => {
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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
      });

      const fabButton = screen.getByRole('button', { name: 'Add new item' });
      expect(fabButton).toBeInTheDocument();
      expect(fabButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles FAB menu when button is clicked', async () => {
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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
      });

      const fabButton = screen.getByRole('button', { name: 'Add new item' });

      // Menu should not be visible initially
      expect(screen.queryByRole('link', { name: /New Workout/i })).not.toBeInTheDocument();

      // Click to open menu
      fireEvent.click(fabButton);

      // Menu items should now be visible
      expect(screen.getByRole('link', { name: /New Workout/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /New Pain Score/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /New Sleep Score/i })).toBeInTheDocument();
      expect(fabButton).toHaveAttribute('aria-expanded', 'true');

      // Click again to close menu
      fireEvent.click(fabButton);

      // Menu should be hidden again
      expect(screen.queryByRole('link', { name: /New Workout/i })).not.toBeInTheDocument();
      expect(fabButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('displays correct links in FAB menu', async () => {
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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
      });

      const fabButton = screen.getByRole('button', { name: 'Add new item' });
      fireEvent.click(fabButton);

      // Check that all three menu items have correct hrefs
      const workoutLink = screen.getByRole('link', { name: /New Workout/i });
      const painScoreLink = screen.getByRole('link', { name: /New Pain Score/i });
      const sleepScoreLink = screen.getByRole('link', { name: /New Sleep Score/i });

      expect(workoutLink).toHaveAttribute('href', '/workouts/new');
      expect(painScoreLink).toHaveAttribute('href', '/pain-scores/new');
      expect(sleepScoreLink).toHaveAttribute('href', '/sleep-scores/new');
    });

    it('closes FAB menu when clicking outside', async () => {
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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
      });

      const fabButton = screen.getByRole('button', { name: 'Add new item' });

      // Open menu
      fireEvent.click(fabButton);
      expect(screen.getByRole('link', { name: /New Workout/i })).toBeInTheDocument();

      // Click outside (on the document body)
      fireEvent.mouseDown(document.body);

      // Menu should be closed
      expect(screen.queryByRole('link', { name: /New Workout/i })).not.toBeInTheDocument();
    });

    it('closes FAB menu when a menu item is clicked', async () => {
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

      render(
        <MemoryRouter>
          <ListView />
        </MemoryRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Apr 10, 2025 (Thursday)')).toBeInTheDocument();
      });

      const fabButton = screen.getByRole('button', { name: 'Add new item' });

      // Open menu
      fireEvent.click(fabButton);
      expect(screen.getByRole('link', { name: /New Workout/i })).toBeInTheDocument();

      // Click on a menu item
      const workoutLink = screen.getByRole('link', { name: /New Workout/i });
      fireEvent.click(workoutLink);

      // Menu should be closed
      expect(screen.queryByRole('link', { name: /New Workout/i })).not.toBeInTheDocument();
    });
  });
});
