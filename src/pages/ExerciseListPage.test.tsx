import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ExerciseListPage from './ExerciseListPage';
import { UserContext } from '../contexts/UserContext';
import type { UserContextType } from '../contexts/UserContext';

const mockExercises = [
  { id: 1, name: 'Bench Press', createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Squat', createdAt: '2024-01-02T00:00:00Z' },
  { id: 3, name: 'Deadlift', createdAt: '2024-01-03T00:00:00Z' },
];

const server = setupServer(
  http.get('/api/exercises', () => {
    return HttpResponse.json(mockExercises);
  }),
  http.put('/api/exercises/:id', ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      name: 'Updated Name',
      createdAt: '2024-01-01T00:00:00Z',
    });
  }),
  http.post('/api/exercises/:id/suggest', () => {
    return HttpResponse.json({
      suggestions: ['Barbell Bench Press', 'Flat Bench Press', 'Dumbbell Bench Press'],
    });
  })
);

const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
const mockContextValue: UserContextType = {
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
};

describe('ExerciseListPage - Table Layout', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  const renderWithContext = () => {
    return render(
      <UserContext.Provider value={mockContextValue}>
        <ExerciseListPage />
      </UserContext.Provider>
    );
  };

  describe('Table Layout', () => {
    it('renders exercises in a table format', async () => {
      renderWithContext();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      // Check table headers
      expect(screen.getByRole('columnheader', { name: /exercise name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('displays all exercises in table rows', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      expect(screen.getByText('Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('Deadlift')).toBeInTheDocument();
    });

    // Date column removed for lean UI

    it('shows exercise count in header', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText(/3 exercises/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    const getRenderedNames = () =>
      Array.from(document.querySelectorAll('tbody .exerciseName')).map((el) => el.textContent);

    it('sorts by name ascending on first click', async () => {
      renderWithContext();

      // Wait for data
      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      // Initial order is as returned from API
      expect(getRenderedNames()).toEqual(['Bench Press', 'Squat', 'Deadlift']);

      // Click the Exercise Name header button to sort
      const nameHeaderBtn = screen.getByRole('button', { name: /exercise name/i });
      nameHeaderBtn.click();

      // After ascending sort: Bench Press, Deadlift, Squat
      await waitFor(() => {
        expect(getRenderedNames()).toEqual(['Bench Press', 'Deadlift', 'Squat']);
      });

      // aria-sort=ascending on the column header
      const nameHeader = screen.getByRole('columnheader', { name: /exercise name/i });
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('toggles to descending on second click', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const nameHeaderBtn = screen.getByRole('button', { name: /exercise name/i });
      nameHeaderBtn.click(); // asc
      nameHeaderBtn.click(); // desc

      await waitFor(() => {
        expect(getRenderedNames()).toEqual(['Squat', 'Deadlift', 'Bench Press']);
      });

      const nameHeader = screen.getByRole('columnheader', { name: /exercise name/i });
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    });
  });

  describe('Edit Functionality', () => {
    it('shows edit button for each exercise', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(3);
    });

    it('shows suggest name button for each exercise', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const suggestButtons = screen.getAllByRole('button', { name: /suggest name/i });
      expect(suggestButtons).toHaveLength(3);
    });

    it('allows editing exercise name inline', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      // Click edit on first exercise
      const editButton = screen.getByRole('button', { name: /edit bench press/i });
      editButton.click();

      // Should show input field with current name
      const input = await screen.findByDisplayValue('Bench Press');
      expect(input).toBeInTheDocument();

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('saves exercise name when save is clicked', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit bench press/i });
      editButton.click();

      const input = await screen.findByDisplayValue('Bench Press');
      input.setAttribute('value', 'Flat Bench Press');
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const saveButton = await screen.findByRole('button', { name: /save/i });
      saveButton.click();

      await waitFor(() => {
        expect(screen.getByText('Updated Name')).toBeInTheDocument();
      });
    });

    it('cancels edit when cancel is clicked', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit bench press/i });
      editButton.click();

      const input = await screen.findByDisplayValue('Bench Press');
      input.setAttribute('value', 'Changed Name');
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      cancelButton.click();

      // Original name should still be there
      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });
      expect(screen.queryByText('Changed Name')).not.toBeInTheDocument();
    });

    it('shows saving state on button during save', async () => {
      // Delay the update response
      server.use(
        http.put('/api/exercises/:id', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            id: 1,
            name: 'Updated Name',
            createdAt: '2024-01-01T00:00:00Z',
          });
        })
      );

      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit bench press/i });
      editButton.click();

      const saveButton = await screen.findByRole('button', { name: /save/i });
      saveButton.click();

      // Should show "Saving..." briefly
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('fetches and shows suggestions dropdown when suggest button is clicked', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const suggestButton = screen.getByRole('button', { name: /suggest name for bench press/i });
      suggestButton.click();

      // Should show "Suggesting..." while loading
      await waitFor(() => {
        expect(screen.getByText('Suggesting...')).toBeInTheDocument();
      });

      // After loading, should show suggestions dropdown
      await waitFor(() => {
        expect(screen.getByText('Select a suggestion:')).toBeInTheDocument();
      });

      // Should show all three suggestions
      expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Flat Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument();
    });

    it('enters edit mode with selected suggestion when clicking a suggestion', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const suggestButton = screen.getByRole('button', { name: /suggest name for bench press/i });
      suggestButton.click();

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
      });

      // Click on a suggestion
      const suggestion = screen.getByText('Flat Bench Press');
      suggestion.click();

      // Should enter edit mode with the selected suggestion
      await waitFor(() => {
        const input = screen.getByDisplayValue('Flat Bench Press');
        expect(input).toBeInTheDocument();
      });

      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('closes suggestions dropdown when close button is clicked', async () => {
      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const suggestButton = screen.getByRole('button', { name: /suggest name for bench press/i });
      suggestButton.click();

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('Select a suggestion:')).toBeInTheDocument();
      });

      // Click the close button
      const closeButton = screen.getByRole('button', { name: /close suggestions/i });
      closeButton.click();

      // Suggestions should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Select a suggestion:')).not.toBeInTheDocument();
      });
    });

    it('handles suggestion error gracefully', async () => {
      server.use(
        http.post('/api/exercises/:id/suggest', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
      });

      const suggestButton = screen.getByRole('button', { name: /suggest name for bench press/i });
      suggestButton.click();

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to generate name suggestion/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state initially', () => {
      renderWithContext();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows error message when fetch fails', async () => {
      server.use(
        http.get('/api/exercises', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText(/failed to load exercises/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no exercises exist', async () => {
      server.use(
        http.get('/api/exercises', () => {
          return HttpResponse.json([]);
        })
      );

      renderWithContext();

      await waitFor(() => {
        expect(screen.getByText(/no exercises found/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/add exercises when creating a workout/i)).toBeInTheDocument();
    });
  });

  // No date column, so no responsive hide test needed
});
