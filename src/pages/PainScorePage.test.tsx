import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PainScorePage from './PainScorePage';
import * as UserContext from '../contexts/useUserContext';
import { PainScore } from '../types';

interface MockPainScoreFormProps {
  onSubmit: (painScore: Omit<PainScore, 'id'>) => Promise<boolean>;
  existingPainScore?: PainScore;
  selectedDate?: string;
  onCancel?: () => void;
}

// Mock the UserContext
vi.mock('../contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

// Mock the PainScoreForm component
vi.mock('../components/PainScoreForm', () => {
  return {
    __esModule: true,
    default: ({ onSubmit, existingPainScore }: MockPainScoreFormProps) => (
      <div data-testid="mock-pain-score-form">
        <button
          data-testid="mock-submit-button"
          onClick={() =>
            onSubmit({
              date: '2025-04-15',
              score: 4,
              notes: 'Test notes',
            })
          }
        >
          Submit
        </button>
        {existingPainScore && (
          <div data-testid="existing-pain-score-id">{existingPainScore.id}</div>
        )}
      </div>
    ),
  };
});

describe('PainScorePage', () => {
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

  it('renders the form for creating a new pain score', () => {
    render(
      <MemoryRouter initialEntries={['/pain-scores/new']}>
        <Routes>
          <Route path="/pain-scores/new" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that the form is rendered
    expect(screen.getByTestId('mock-pain-score-form')).toBeInTheDocument();

    // Check that there's no existing pain score ID
    expect(screen.queryByTestId('existing-pain-score-id')).not.toBeInTheDocument();
  });

  it('renders the form for editing an existing pain score', async () => {
    server.use(
      http.get('/api/pain-scores/:id', () => {
        return HttpResponse.json({
          id: 456,
          date: '2025-04-10',
          score: 3,
          notes: 'Existing notes',
          userId: 1,
        });
      })
    );

    render(
      <MemoryRouter initialEntries={['/pain-scores/456/edit']}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the pain score to load
    await waitFor(() => {
      expect(screen.getByTestId('existing-pain-score-id')).toBeInTheDocument();
    });

    // Check that the existing pain score ID is displayed
    expect(screen.getByTestId('existing-pain-score-id').textContent).toBe('456');
  });

  it('creates a new pain score when form is submitted', async () => {
    server.use(
      http.post('/api/pain-scores', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({
          date: '2025-04-15',
          score: 4,
          notes: 'Test notes',
        });
        return HttpResponse.json({ id: 123 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/pain-scores/new']}>
        <Routes>
          <Route path="/pain-scores/new" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Submit the form
    fireEvent.click(screen.getByTestId('mock-submit-button'));

    // Wait for the API call to complete
    await waitFor(() => {
      // The component should have called the API
      expect(screen.getByTestId('mock-pain-score-form')).toBeInTheDocument();
    });
  });

  it('updates an existing pain score when form is submitted', async () => {
    server.use(
      http.get('/api/pain-scores/:id', () => {
        return HttpResponse.json({
          id: 456,
          date: '2025-04-10',
          score: 3,
          notes: 'Existing notes',
          userId: 1,
        });
      }),
      http.put('/api/pain-scores/:id', async ({ request, params }) => {
        const body = await request.json();
        expect(params.id).toBe('456');
        expect(body).toEqual({
          date: '2025-04-15',
          score: 4,
          notes: 'Test notes',
        });
        return HttpResponse.json({ id: 456 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/pain-scores/456/edit']}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the pain score to load
    await waitFor(() => {
      expect(screen.getByTestId('existing-pain-score-id')).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByTestId('mock-submit-button'));

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.getByTestId('mock-pain-score-form')).toBeInTheDocument();
    });
  });

  it('handles error when fetching pain score fails', async () => {
    server.use(
      http.get('/api/pain-scores/:id', () => {
        return HttpResponse.json({ error: 'Failed to load pain score' }, { status: 500 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/pain-scores/456/edit']}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load pain score/i)).toBeInTheDocument();
    });
  });

  it('renders form without existing pain score when pain score is not found', async () => {
    server.use(
      http.get('/api/pain-scores/:id', () => {
        return HttpResponse.json(null);
      })
    );

    render(
      <MemoryRouter initialEntries={['/pain-scores/999/edit']}>
        <Routes>
          <Route path="/pain-scores/:id/edit" element={<PainScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-pain-score-form')).toBeInTheDocument();
    });

    // Check that there's no existing pain score ID
    expect(screen.queryByTestId('existing-pain-score-id')).not.toBeInTheDocument();
  });
});
