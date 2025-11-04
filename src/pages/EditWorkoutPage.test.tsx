import { render, screen, waitFor } from '@testing-library/react';
import { Route } from 'wouter';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import EditWorkoutPage from './EditWorkoutPage';
import * as UserContext from '../contexts/useUserContext';
import { MemoryRouter } from '../test-utils/MemoryRouter';

// Mock the UserContext
vi.mock('../contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

describe('EditWorkoutPage', () => {
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

  const mockExercises = [
    { id: 1, name: 'Push-ups', userId: 1 },
    { id: 2, name: 'Squats', userId: 1 },
    { id: 3, name: 'Lunges', userId: 1 },
  ];

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

  it('should call fetchWorkout (GET /api/workouts/:id)', async () => {
    let workoutEndpointCalled = false;
    let workoutsEndpointCalled = false;

    server.use(
      // This endpoint SHOULD be called
      http.get('/api/workouts/:id', ({ params }) => {
        workoutEndpointCalled = true;
        expect(params.id).toBe('1');
        return HttpResponse.json(mockWorkout);
      }),
      // This endpoint should NOT be called
      http.get('/api/workouts', () => {
        workoutsEndpointCalled = true;
        return HttpResponse.json([mockWorkout]);
      }),
      http.get('/api/exercises', () => {
        return HttpResponse.json(mockExercises);
      })
    );

    render(
      <MemoryRouter initialPath="/workouts/1/edit">
        <Route path="/workouts/:id/edit">
          <EditWorkoutPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Verify the correct endpoint was called
    expect(workoutEndpointCalled).toBe(true);
    expect(workoutsEndpointCalled).toBe(false);
  });

  it('renders loading state initially', () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return new Promise(() => {}); // Never resolve
      }),
      http.get('/api/exercises', () => {
        return new Promise(() => {}); // Never resolve
      })
    );

    render(
      <MemoryRouter initialPath="/workouts/1/edit">
        <Route path="/workouts/:id/edit">
          <EditWorkoutPage />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders WorkoutForm with workout data after loading', async () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(mockWorkout);
      }),
      http.get('/api/exercises', () => {
        return HttpResponse.json(mockExercises);
      })
    );

    render(
      <MemoryRouter initialPath="/workouts/1/edit">
        <Route path="/workouts/:id/edit">
          <EditWorkoutPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // Check that the form is rendered (WorkoutForm should be present)
    // We can verify by checking for the heading and form elements
    expect(screen.getByRole('heading', { name: /Edit Workout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Workout/i })).toBeInTheDocument();
  });

  it('renders error state when workout fetch fails', async () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json({ error: 'Failed to load workout' }, { status: 500 });
      }),
      http.get('/api/exercises', () => {
        return HttpResponse.json(mockExercises);
      })
    );

    render(
      <MemoryRouter initialPath="/workouts/1/edit">
        <Route path="/workouts/:id/edit">
          <EditWorkoutPage />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
    });
  });

  it('renders error state when workout is not found', async () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(null);
      }),
      http.get('/api/exercises', () => {
        return HttpResponse.json(mockExercises);
      })
    );

    render(
      <MemoryRouter initialPath="/workouts/999/edit">
        <Route path="/workouts/:id/edit">
          <EditWorkoutPage />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Workout with ID 999 not found/i)).toBeInTheDocument();
    });
  });

  it('loads exercises list for the form', async () => {
    server.use(
      http.get('/api/workouts/:id', () => {
        return HttpResponse.json(mockWorkout);
      }),
      http.get('/api/exercises', () => {
        return HttpResponse.json(mockExercises);
      })
    );

    render(
      <MemoryRouter initialPath="/workouts/1/edit">
        <Route path="/workouts/:id/edit">
          <EditWorkoutPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });

    // The WorkoutForm should have access to the exercises
    // This is verified by the form rendering successfully
    expect(screen.getByRole('heading', { name: /Edit Workout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Workout/i })).toBeInTheDocument();
  });
});
