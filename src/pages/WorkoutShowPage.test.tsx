import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import WorkoutShowPage from './WorkoutShowPage';
import * as UserContext from '../contexts/useUserContext';

// Mock the UserContext
vi.mock('../contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

describe('WorkoutShowPage', () => {
  const mockWorkout = {
    id: 1,
    userId: 1,
    date: '2025-04-10',
    withInstructor: true,
    exercises: [
      { id: 1, name: 'Push-ups', reps: 10 },
      { id: 2, name: 'Squats', reps: 15, weight: 20 },
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
      http.get('/api/workouts/:id', () => {
        return new Promise(() => {}); // Never resolve
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that loading state is displayed
    expect(screen.getByText(/Loading workout.../i)).toBeInTheDocument();
  });

  it('renders workout details after loading', async () => {
    server.use(
      http.get('/api/workouts/:id', ({ params }) => {
        expect(params.id).toBe('1');
        return HttpResponse.json(mockWorkout);
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that workout details are displayed
    expect(screen.getByText(/Apr 10, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/With Instructor/i)).toBeInTheDocument();

    // Check that exercises are displayed
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('10 reps')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('15 reps')).toBeInTheDocument();
    expect(screen.getByText('20 lbs')).toBeInTheDocument();

    // Check that edit button is displayed
    expect(screen.getByText('Edit Workout')).toBeInTheDocument();
  });

  it('renders error state when API call fails', async () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json({ error: 'Failed to load workout' }, { status: 500 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load workout/i)).toBeInTheDocument();
    });
  });

  it("renders not found state when workout doesn't exist", async () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(null);
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/999']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the not found message to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Workout not found/i)).toBeInTheDocument();
    });
  });

  it('renders workout without instructor badge when withInstructor is false', async () => {
    const workoutWithoutInstructor = { ...mockWorkout, withInstructor: false };

    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(workoutWithoutInstructor);
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that the "With Instructor" badge is not displayed
    expect(screen.queryByText(/With Instructor/i)).not.toBeInTheDocument();
  });

  it('renders exercises without weight when weight is not provided', async () => {
    const workoutWithExerciseWithoutWeight = {
      ...mockWorkout,
      exercises: [{ id: 1, name: 'Push-ups', reps: 10 }],
    };

    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(workoutWithExerciseWithoutWeight);
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that the exercise is displayed without weight
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('10 reps')).toBeInTheDocument();
    expect(screen.queryByText(/lbs/i)).not.toBeInTheDocument();
  });

  it('renders exercises with time when time_seconds is provided', async () => {
    const workoutWithTime = {
      ...mockWorkout,
      exercises: [
        { id: 1, name: 'Plank', reps: 3, time_seconds: 2.5 },
        { id: 2, name: 'Wall Sit', reps: 2, weight: 0, time_seconds: 1.5 },
      ],
    };

    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(workoutWithTime);
      })
    );

    render(
      <MemoryRouter initialEntries={['/workouts/1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutShowPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the workout to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading workout.../i)).not.toBeInTheDocument();
    });

    // Check that exercises with time are displayed correctly
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('3 reps')).toBeInTheDocument();
    expect(screen.getByText('2.5 sec')).toBeInTheDocument();

    expect(screen.getByText('Wall Sit')).toBeInTheDocument();
    expect(screen.getByText('2 reps')).toBeInTheDocument();
    expect(screen.getByText('1.5 sec')).toBeInTheDocument();
  });
});
