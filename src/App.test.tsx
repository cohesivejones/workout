import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders workout tracker header', () => {
  render(<App />);
  const headerElement = screen.getByText(/workout tracker/i);
  expect(headerElement).toBeInTheDocument();
});
