import { render, screen, fireEvent } from '@testing-library/react';
import { Router } from 'wouter';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimelinePage from './TimelinePage';

// Mock the child components
vi.mock('../components/CalendarView', () => ({
  __esModule: true,
  default: () => <div data-testid="calendar-view">Calendar View</div>,
}));

vi.mock('../components/ListView', () => ({
  ListView: () => <div data-testid="list-view">List View</div>,
}));

describe('TimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<Router>{component}</Router>);
  };

  describe('View Switching', () => {
    it('should display calendar view by default', () => {
      renderWithRouter(<TimelinePage />);

      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    });

    it('should switch to list view when List button is clicked', () => {
      renderWithRouter(<TimelinePage />);

      // Initially shows calendar view
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();

      // Click List button
      const listButton = screen.getByText('List');
      fireEvent.click(listButton);

      // Now shows list view
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument();
    });

    it('should switch back to calendar view when Calendar button is clicked', () => {
      renderWithRouter(<TimelinePage />);

      // Switch to list view
      const listButton = screen.getByText('List');
      fireEvent.click(listButton);
      expect(screen.getByTestId('list-view')).toBeInTheDocument();

      // Switch back to calendar view
      const calendarButton = screen.getByText('Calendar');
      fireEvent.click(calendarButton);
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    });

    it('should highlight the active view button', () => {
      renderWithRouter(<TimelinePage />);

      const calendarButton = screen.getByText('Calendar');
      const listButton = screen.getByText('List');

      // Calendar button should be active by default
      expect(calendarButton.className).toContain('active');
      expect(listButton.className).not.toContain('active');

      // Click List button
      fireEvent.click(listButton);

      // List button should now be active
      expect(listButton.className).toContain('active');
      expect(calendarButton.className).not.toContain('active');
    });
  });

  describe('Page Structure', () => {
    it('should render page header with title', () => {
      renderWithRouter(<TimelinePage />);

      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    });

    it('should render view toggle buttons', () => {
      renderWithRouter(<TimelinePage />);

      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
    });
  });
});
