import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import NutritionPage from './NutritionPage';
import { useUserContext } from '../contexts/useUserContext';
import { format, addDays } from 'date-fns';

vi.mock('../contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

const mockUser = { id: 1, name: 'Test User' };

describe('NutritionPage', () => {
  const mockWeightEntry = {
    id: 1,
    userId: 1,
    date: '2024-01-15',
    weight: 85.5,
  };

  const mockLatestWeight = {
    id: 1,
    userId: 1,
    date: '2024-01-15',
    weight: 85.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUserContext as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nutrition page with meals and weight tracking', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayMeals = [
      {
        id: 1,
        userId: 1,
        date: today,
        description: 'Breakfast - Oats',
        calories: 400,
        protein: 15,
        carbs: 65,
        fat: 10,
      },
      {
        id: 2,
        userId: 1,
        date: today,
        description: 'Lunch - Chicken Salad',
        calories: 550,
        protein: 40,
        carbs: 35,
        fat: 25,
      },
    ];

    const todayWeight = {
      id: 1,
      userId: 1,
      date: today,
      weight: 85.5,
    };

    server.use(
      http.get('/api/meals', ({ request }) => {
        const url = new URL(request.url);
        const date = url.searchParams.get('date');
        if (date === today) {
          return HttpResponse.json(todayMeals);
        }
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', ({ request }) => {
        const url = new URL(request.url);
        const date = url.searchParams.get('date');
        if (date === today) {
          return HttpResponse.json(todayWeight);
        }
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(todayWeight);
      })
    );

    render(<NutritionPage />);

    // Wait for meals to load
    await waitFor(() => {
      expect(screen.getByText('Breakfast - Oats')).toBeInTheDocument();
      expect(screen.getByText('Lunch - Chicken Salad')).toBeInTheDocument();
    });

    // Check weight input is present
    const weightInput = screen.getByLabelText(/weight/i);
    expect(weightInput).toBeInTheDocument();
    expect(weightInput).toHaveValue(85.5);

    // Check last known weight is displayed
    expect(screen.getByText('Last Known Weight:')).toBeInTheDocument();
    // Weight value appears in multiple places, just verify it's there
    const allWeightMatches = screen.getAllByText(/85\.5/);
    expect(allWeightMatches.length).toBeGreaterThan(0);
  });

  it('displays empty weight input when no weight entry exists for date', async () => {
    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(mockLatestWeight);
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      const weightInput = screen.getByLabelText(/weight/i);
      expect(weightInput).toBeInTheDocument();
      expect(weightInput).toHaveValue(null);
    });

    // Last known weight should still be displayed from a different date
    expect(screen.getByText('Last Known Weight:')).toBeInTheDocument();
    const weightValue = screen.getByText(/85\.5/);
    expect(weightValue).toBeInTheDocument();
  });

  it('creates new weight entry when saving weight', async () => {
    let createCalled = false;

    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.post('/api/weight-entries', async ({ request }) => {
        createCalled = true;
        const body = (await request.json()) as { date: string; weight: number };
        expect(body.weight).toBe(82.5);
        return HttpResponse.json({
          id: 2,
          userId: 1,
          date: body.date,
          weight: body.weight,
        });
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    });

    // Enter weight
    const weightInput = screen.getByLabelText(/weight/i);
    fireEvent.change(weightInput, { target: { value: '82.5' } });

    // Save weight
    const saveButton = screen.getByRole('button', { name: /save weight/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createCalled).toBe(true);
    });
  });

  it('updates existing weight entry when saving weight for date with entry', async () => {
    let updateCalled = false;

    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(mockWeightEntry);
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(mockLatestWeight);
      }),
      http.put('/api/weight-entries/:id', async ({ params, request }) => {
        updateCalled = true;
        expect(params.id).toBe('1');
        const body = (await request.json()) as { date: string; weight: number };
        expect(body.weight).toBe(86.0);
        return HttpResponse.json({
          id: 1,
          userId: 1,
          date: body.date,
          weight: body.weight,
        });
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      const weightInput = screen.getByLabelText(/weight/i);
      expect(weightInput).toHaveValue(85.5);
    });

    // Update weight
    const weightInput = screen.getByLabelText(/weight/i);
    fireEvent.change(weightInput, { target: { value: '86.0' } });

    // Save weight
    const saveButton = screen.getByRole('button', { name: /save weight/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateCalled).toBe(true);
    });
  });

  it('displays last known weight with date', async () => {
    const lastWeightWithDate = {
      id: 1,
      userId: 1,
      date: '2024-01-10',
      weight: 87.2,
    };

    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(lastWeightWithDate);
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Last Known Weight:')).toBeInTheDocument();
      expect(screen.getByText(/87\.2/)).toBeInTheDocument();
      expect(screen.getByText(/January 10, 2024/i)).toBeInTheDocument();
    });

    // Verify the weight value contains kg
    const weightValue = screen.getByText(/87\.2/);
    expect(weightValue.textContent).toContain('kg');
  });

  it('handles error when fetching weight fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    });

    // Should not crash, weight input should be empty
    const weightInput = screen.getByLabelText(/weight/i);
    expect(weightInput).toHaveValue(null);

    consoleErrorSpy.mockRestore();
  });

  it('handles error when saving weight fails', async () => {
    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.post('/api/weight-entries', () => {
        return HttpResponse.json({ error: 'Failed to save weight' }, { status: 500 });
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    });

    // Enter weight
    const weightInput = screen.getByLabelText(/weight/i);
    fireEvent.change(weightInput, { target: { value: '82.5' } });

    // Save weight
    const saveButton = screen.getByRole('button', { name: /save weight/i });
    fireEvent.click(saveButton);

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText(/failed to save weight/i)).toBeInTheDocument();
    });
  });

  it('updates weight entry when navigating to different date', async () => {
    // Use today's date for consistency
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const weight1 = { id: 1, userId: 1, date: today, weight: 85.5 };
    const weight2 = { id: 2, userId: 1, date: tomorrow, weight: 84.8 };

    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', ({ request }) => {
        const url = new URL(request.url);
        const date = url.searchParams.get('date');
        if (date === today) {
          return HttpResponse.json(weight1);
        } else if (date === tomorrow) {
          return HttpResponse.json(weight2);
        }
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(weight2);
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      const weightInput = screen.getByLabelText(/weight/i);
      expect(weightInput).toHaveValue(85.5);
    });

    // Navigate to next day
    const nextDayButton = screen.getByRole('button', { name: /next day/i });
    fireEvent.click(nextDayButton);

    // Weight should update to the next day's value
    await waitFor(() => {
      const weightInput = screen.getByLabelText(/weight/i);
      expect(weightInput).toHaveValue(84.8);
    });
  });

  it('does not display last known weight when no weight entries exist', async () => {
    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(null, { status: 404 });
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    });

    // Should not show "Last Known Weight" text when there's no weight data
    expect(screen.queryByText(/last known weight/i)).not.toBeInTheDocument();
  });

  it('correctly handles timezone when determining todays date', async () => {
    // Mock a specific date/time - use noon to avoid timezone edge cases
    const mockDate = new Date('2026-03-20T12:00:00.000Z');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(mockDate);

    // Calculate what the local date should be in YYYY-MM-DD format
    const expectedLocalDate = format(mockDate, 'yyyy-MM-dd');

    let fetchedDate: string | null = null;

    server.use(
      http.get('/api/meals', ({ request }) => {
        const url = new URL(request.url);
        fetchedDate = url.searchParams.get('date');
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(null, { status: 404 });
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(null, { status: 404 });
      })
    );

    render(<NutritionPage />);

    await screen.findByLabelText(/weight/i);

    // Verify that the page is using the mocked date
    expect(fetchedDate).toBe(expectedLocalDate);

    // Also verify that clicking "Today" button uses the mocked date
    const todayButton = screen.getByRole('button', { name: /today/i });
    fireEvent.click(todayButton);

    await screen.findByLabelText(/weight/i);
    expect(fetchedDate).toBe(expectedLocalDate);
  });

  it('when the page has a known last weight', async () => {
    // Database decimal columns return strings, not numbers
    const lastKnownWeight = {
      id: 1,
      userId: 1,
      date: '2024-01-10',
      weight: 87.2, // String from database decimal column
    };

    const todaysWeight = {
      id: 1,
      userId: 1,
      date: '2024-01-10',
      weight: 88.2, // String from database decimal column
    };

    server.use(
      http.get('/api/meals', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/weight-entries/by-date', () => {
        return HttpResponse.json(todaysWeight);
      }),
      http.get('/api/weight-entries/latest', () => {
        return HttpResponse.json(lastKnownWeight);
      })
    );

    render(<NutritionPage />);

    await waitFor(() => {
      expect(screen.getByText('Last Known Weight:')).toBeInTheDocument();
      expect(screen.getByText(/87\.2/)).toBeInTheDocument();
    });

    // Verify the component doesn't crash and displays the weight correctly
    expect(screen.getByText(/current weight.*88\.2.*kg/i)).toBeInTheDocument();
  });
});
