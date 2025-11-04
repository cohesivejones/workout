import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from './mocks/server';
import { Layout } from './Layout';
import { UserContextProvider } from './contexts/UserContextProvider';

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
      // Mock API to return no user
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json({ user: null });
        })
      );
    });

    it.each(navigationLinks)('hides $text link', async ({ text }) => {
      render(
        <BrowserRouter>
          <UserContextProvider>
            <Layout />
          </UserContextProvider>
        </BrowserRouter>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        const link = screen.queryByRole('link', { name: text });
        expect(link).not.toBeInTheDocument();
      });
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      // Mock API to return a logged-in user
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json({
            user: { id: 1, name: 'Test User', email: 'test@example.com' },
          });
        })
      );
    });

    it.each(navigationLinks)('shows $text link', async ({ text }) => {
      render(
        <BrowserRouter>
          <UserContextProvider>
            <Layout />
          </UserContextProvider>
        </BrowserRouter>
      );

      // Wait for auth check to complete and link to appear
      await waitFor(() => {
        const link = screen.getByRole('link', { name: text });
        expect(link).toBeInTheDocument();
      });
    });
  });
});
