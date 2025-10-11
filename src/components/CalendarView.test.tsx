import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalendarView from './CalendarView';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-15'));

    // Mock window.innerWidth to simulate desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    // Mock window.addEventListener to capture resize event
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders calendar with workouts and pain scores', () => {
    render(
      <MemoryRouter>
        <CalendarView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
        />
      </MemoryRouter>
    );

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

  it('navigates to pain score edit page when pain score is clicked', () => {
    render(
      <MemoryRouter>
        <CalendarView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
        />
      </MemoryRouter>
    );

    // Find and click a pain score
    const painScore = screen.getByText('Pain: 3');
    fireEvent.click(painScore);

    // Check that navigate was called with the correct path
    expect(mockNavigate).toHaveBeenCalledWith('/pain-scores/1/edit');
  });

  it('changes month when navigation buttons are clicked', () => {
    render(
      <MemoryRouter>
        <CalendarView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
        />
      </MemoryRouter>
    );

    // Check initial month
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();

    // Click previous month button
    const prevButton = screen.getByLabelText('Previous month');
    fireEvent.click(prevButton);

    // Check that month changed to April
    expect(screen.getByText(/April 2025/)).toBeInTheDocument();

    // Click next month button twice to go to June
    const nextButton = screen.getByLabelText('Next month');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Check that month changed to June
    expect(screen.getByText(/June 2025/)).toBeInTheDocument();
  });

  it('goes to today when Today button is clicked', () => {
    // Mock Date.now to return a specific date
    const originalNow = Date.now;
    Date.now = vi.fn(() => new Date('2025-05-02').getTime());

    render(
      <MemoryRouter>
        <CalendarView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
        />
      </MemoryRouter>
    );

    // Navigate to a different month
    const prevButton = screen.getByLabelText('Previous month');
    fireEvent.click(prevButton);
    expect(screen.getByText(/April 2025/)).toBeInTheDocument();

    // Click Today button
    const todayButton = screen.getByLabelText('Go to today');
    fireEvent.click(todayButton);

    // Check that month changed back to May
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();

    // Restore original Date.now
    Date.now = originalNow;
  });

  it('switches to mobile view when window width is small', () => {
    // Render with desktop width first
    const { rerender } = render(
      <MemoryRouter>
        <CalendarView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
        />
      </MemoryRouter>
    );

    // Check that month view is displayed
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();

    // Simulate resize to mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Trigger resize event callback
    const addEventListenerMock = window.addEventListener as unknown as {
      mock: { calls: unknown[][] };
    };
    const resizeCallback = addEventListenerMock.mock.calls.find(
      (call: unknown[]) => call[0] === 'resize'
    )?.[1] as () => void;
    resizeCallback();

    // Re-render to apply the state change
    rerender(
      <MemoryRouter>
        <CalendarView
          workouts={mockWorkouts}
          painScores={mockPainScores}
          sleepScores={mockSleepScores}
        />
      </MemoryRouter>
    );

    // Check that week view is displayed by looking for the month title heading
    const monthTitle = screen.getByRole('heading', { level: 2 });
    expect(monthTitle).toBeInTheDocument();
    expect(monthTitle.textContent).toMatch(/May \d+.*\d+, 2025/);
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('renders empty calendar when no items', () => {
    render(
      <MemoryRouter>
        <CalendarView workouts={[]} painScores={[]} sleepScores={[]} />
      </MemoryRouter>
    );

    // Check that the calendar is rendered
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();

    // We can't check for specific empty state messages since they might be empty divs,
    // but we can verify that no workout or pain score content is displayed
    expect(screen.queryByText(/Pain:/)).not.toBeInTheDocument();
  });
});
