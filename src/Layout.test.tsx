import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import * as UserContext from './contexts/useUserContext';

// Mock the UserContext
vi.mock('./contexts/useUserContext', () => ({
  useUserContext: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div>Outlet Content</div>,
  };
});

describe('Layout - Header Navigation', () => {
  const navigationLinks = [
    { text: 'Timeline', href: '/' },
    { text: 'Dashboard', href: '/dashboard' },
    { text: 'Exercises', href: '/exercises' },
    { text: 'Generate Workout', href: '/workouts/generate' },
    { text: 'Diagnostician', href: '/diagnostician' },
  ];

  describe('when user is not logged in', () => {
    beforeEach(() => {
      vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false,
      });
    });

    it.each(navigationLinks)('hides $text link', ({ text }) => {
      render(
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      );

      const link = screen.queryByRole('link', { name: text });
      expect(link).not.toBeInTheDocument();
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        login: vi.fn(),
        logout: vi.fn(),
        loading: false,
      });
    });

    it.each(navigationLinks)('shows $text link', ({ text }) => {
      render(
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      );

      const link = screen.getByRole('link', { name: text });
      expect(link).toBeInTheDocument();
    });
  });
});
