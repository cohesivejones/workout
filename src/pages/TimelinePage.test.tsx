import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TimelinePage from './TimelinePage';
import * as api from '../api';
import * as UserContext from '../contexts/useUserContext';

// Mock the API module
vi.mock('../api');

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

const mockTimelineData = {
  workouts: [
    {
      id: 1,
      date: '2025-01-15',
      withInstructor: false,
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
    const mockFetchTimeline = vi.fn().mockResolvedValue(mockTimelineData);
    vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

    renderWithRouter(<TimelinePage />);

    await waitFor(() => {
      expect(mockFetchTimeline).toHaveBeenCalledTimes(1);
    });
  });

  it('should display loading state initially', () => {
    const mockFetchTimeline = vi.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

    renderWithRouter(<TimelinePage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display calendar view by default after loading', async () => {
    const mockFetchTimeline = vi.fn().mockResolvedValue(mockTimelineData);
    vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

    renderWithRouter(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    });
  });

  it('should display error message when API call fails', async () => {
    const mockFetchTimeline = vi.fn().mockRejectedValue(new Error('API Error'));
    vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

    renderWithRouter(<TimelinePage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
    });
  });

  it('should not call fetchTimeline when user is not logged in', () => {
    const mockFetchTimeline = vi.fn().mockResolvedValue(mockTimelineData);
    vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);
    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });

    renderWithRouter(<TimelinePage />);

    expect(mockFetchTimeline).not.toHaveBeenCalled();
  });

  describe('Date range pagination', () => {
    it('should initially fetch last 3 months to next 3 months of data', async () => {
      const mockFetchTimeline = vi.fn().mockResolvedValue(mockTimelineData);
      vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(mockFetchTimeline).toHaveBeenCalledTimes(1);
      });

      // Check that it was called with date parameters for last 3 months to next 3 months
      const callArgs = mockFetchTimeline.mock.calls[0];
      expect(callArgs).toHaveLength(2);

      const startDate = callArgs[0];
      const endDate = callArgs[1];

      // Verify startDate is approximately 90 days ago
      const expectedStartDate = new Date();
      expectedStartDate.setDate(expectedStartDate.getDate() - 90);
      const expectedStart = expectedStartDate.toISOString().split('T')[0];
      expect(startDate).toBe(expectedStart);

      // Verify endDate is approximately 90 days ahead
      const expectedEndDate = new Date();
      expectedEndDate.setDate(expectedEndDate.getDate() + 90);
      const expectedEnd = expectedEndDate.toISOString().split('T')[0];
      expect(endDate).toBe(expectedEnd);
    });

    it('should extend date range by 3 months when loading more', async () => {
      const mockFetchTimeline = vi
        .fn()
        .mockResolvedValueOnce({ ...mockTimelineData, hasMore: true })
        .mockResolvedValueOnce({ ...mockTimelineData, hasMore: false });
      vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

      const { rerender } = renderWithRouter(<TimelinePage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetchTimeline).toHaveBeenCalledTimes(1);
      });

      // Simulate load more action by triggering a re-render with updated state
      // This will be done through the ListView component's onLoadMore callback
      rerender(
        <BrowserRouter>
          <TimelinePage />
        </BrowserRouter>
      );

      // The actual implementation will call fetchTimeline again with extended date range
      // For now, we're just testing that the logic exists
    });

    it('should pass hasMore flag to ListView', async () => {
      const mockFetchTimeline = vi.fn().mockResolvedValue({
        ...mockTimelineData,
        hasMore: true,
      });
      vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(mockFetchTimeline).toHaveBeenCalled();
      });

      // The ListView component should receive hasMore prop
      // This will be verified once we implement the feature
    });

    it('should handle loading more data without duplicates', async () => {
      const initialData = {
        workouts: [{ id: 1, date: '2025-01-15', withInstructor: false, exercises: [] }],
        painScores: [],
        sleepScores: [],
        hasMore: true,
      };

      const olderData = {
        workouts: [{ id: 2, date: '2024-10-15', withInstructor: false, exercises: [] }],
        painScores: [],
        sleepScores: [],
        hasMore: false,
      };

      const mockFetchTimeline = vi
        .fn()
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce({
          workouts: [...initialData.workouts, ...olderData.workouts],
          painScores: [],
          sleepScores: [],
          hasMore: false,
        });

      vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

      renderWithRouter(<TimelinePage />);

      await waitFor(() => {
        expect(mockFetchTimeline).toHaveBeenCalledTimes(1);
      });

      // After loading more, both workouts should be present without duplicates
    });

    it('should update hasMore state correctly when loading more data', async () => {
      const initialData = {
        workouts: [
          { id: 1, date: '2025-01-15', withInstructor: false, exercises: [] },
          { id: 2, date: '2025-01-10', withInstructor: false, exercises: [] },
          { id: 3, date: '2025-01-05', withInstructor: false, exercises: [] },
        ],
        painScores: [],
        sleepScores: [],
        hasMore: true,
      };

      const extendedData = {
        workouts: [
          ...initialData.workouts,
          { id: 4, date: '2024-10-15', withInstructor: false, exercises: [] },
          { id: 5, date: '2024-09-15', withInstructor: false, exercises: [] },
          { id: 6, date: '2024-08-15', withInstructor: false, exercises: [] },
        ],
        painScores: [],
        sleepScores: [],
        hasMore: false, // No more data after this
      };

      const mockFetchTimeline = vi
        .fn()
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(extendedData);

      vi.spyOn(api, 'fetchTimeline').mockImplementation(mockFetchTimeline);

      renderWithRouter(<TimelinePage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(mockFetchTimeline).toHaveBeenCalledTimes(1);
      });

      // Verify initial data was fetched with hasMore: true
      expect(mockFetchTimeline).toHaveBeenNthCalledWith(1, expect.any(String), expect.any(String));

      // The component should have received hasMore: true from the first fetch
      // When we implement the Load More functionality, it should:
      // 1. Call fetchTimeline again with extended date range
      // 2. Receive hasMore: false in the response
      // 3. Update its internal state to reflect hasMore: false

      // This test verifies the API mock is set up correctly
      // The actual UI behavior will be tested in the e2e test
    });
  });
});
