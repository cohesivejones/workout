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
          time_minutes: null,
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
});
