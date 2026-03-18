import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'wouter';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import MealFormPage from './MealFormPage';
import * as UserContext from '../contexts/useUserContext';
import { Meal } from '../types';
import { MemoryRouter } from '../test-utils/MemoryRouter';

interface MockMealFormProps {
  onSubmit: (meal: Omit<Meal, 'id'>) => Promise<boolean>;
  existingMeal?: Meal;
  selectedDate?: string;
  onCancel?: () => void;
}

// Mock the UserContext
vi.mock('../contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

// Mock the MealForm component
vi.mock('../components/MealForm', () => {
  return {
    __esModule: true,
    default: ({ onSubmit, existingMeal }: MockMealFormProps) => (
      <div data-testid="mock-meal-form">
        <button
          data-testid="mock-submit-button"
          onClick={() =>
            onSubmit({
              date: '2025-04-15',
              description: 'Test Meal',
              calories: 500,
              protein: 30,
              carbs: 50,
              fat: 20,
            })
          }
        >
          Submit
        </button>
        {existingMeal && <div data-testid="existing-meal-id">{existingMeal.id}</div>}
      </div>
    ),
  };
});

describe('MealFormPage', () => {
  const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the user context to simulate a logged-in user
    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  it('renders the form for creating a new meal', () => {
    render(
      <MemoryRouter initialPath="/nutrition/meals/new">
        <Route path="/nutrition/meals/new">
          <MealFormPage />
        </Route>
      </MemoryRouter>
    );

    // Check that the form is rendered
    expect(screen.getByTestId('mock-meal-form')).toBeInTheDocument();

    // Check that there's no existing meal ID
    expect(screen.queryByTestId('existing-meal-id')).not.toBeInTheDocument();
  });

  it('renders the form for editing an existing meal', async () => {
    server.use(
      http.get('/api/meals/:id', () => {
        return HttpResponse.json({
          id: 456,
          date: '2025-04-10',
          description: 'Chicken and Rice',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
          userId: 1,
        });
      })
    );

    render(
      <MemoryRouter initialPath="/nutrition/meals/456/edit">
        <Route path="/nutrition/meals/:id/edit">
          <MealFormPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the meal to load
    await waitFor(() => {
      expect(screen.getByTestId('existing-meal-id')).toBeInTheDocument();
    });

    // Check that the existing meal ID is displayed
    expect(screen.getByTestId('existing-meal-id').textContent).toBe('456');
  });

  it('creates a new meal when form is submitted', async () => {
    server.use(
      http.post('/api/meals', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({
          date: '2025-04-15',
          description: 'Test Meal',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20,
        });
        return HttpResponse.json({ id: 123 });
      })
    );

    render(
      <MemoryRouter initialPath="/nutrition/meals/new">
        <Route path="/nutrition/meals/new">
          <MealFormPage />
        </Route>
      </MemoryRouter>
    );

    // Submit the form
    fireEvent.click(screen.getByTestId('mock-submit-button'));

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.getByTestId('mock-meal-form')).toBeInTheDocument();
    });
  });

  it('updates an existing meal when form is submitted', async () => {
    server.use(
      http.get('/api/meals/:id', () => {
        return HttpResponse.json({
          id: 456,
          date: '2025-04-10',
          description: 'Chicken and Rice',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
          userId: 1,
        });
      }),
      http.put('/api/meals/:id', async ({ request, params }) => {
        const body = await request.json();
        expect(params.id).toBe('456');
        expect(body).toEqual({
          date: '2025-04-15',
          description: 'Test Meal',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20,
        });
        return HttpResponse.json({ id: 456 });
      })
    );

    render(
      <MemoryRouter initialPath="/nutrition/meals/456/edit">
        <Route path="/nutrition/meals/:id/edit">
          <MealFormPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the meal to load
    await waitFor(() => {
      expect(screen.getByTestId('existing-meal-id')).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByTestId('mock-submit-button'));

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.getByTestId('mock-meal-form')).toBeInTheDocument();
    });
  });

  it('handles error when fetching meal fails', async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/meals/:id', () => {
        return HttpResponse.json({ error: 'Failed to load meal' }, { status: 500 });
      })
    );

    render(
      <MemoryRouter initialPath="/nutrition/meals/456/edit">
        <Route path="/nutrition/meals/:id/edit">
          <MealFormPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load meal/i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('renders form without existing meal when meal is not found', async () => {
    server.use(
      http.get('/api/meals/:id', () => {
        return HttpResponse.json(null);
      })
    );

    render(
      <MemoryRouter initialPath="/nutrition/meals/999/edit">
        <Route path="/nutrition/meals/:id/edit">
          <MealFormPage />
        </Route>
      </MemoryRouter>
    );

    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-meal-form')).toBeInTheDocument();
    });

    // Check that there's no existing meal ID
    expect(screen.queryByTestId('existing-meal-id')).not.toBeInTheDocument();
  });
});
