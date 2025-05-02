// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import FormContainer from './FormContainer';

describe('FormContainer', () => {
  it('renders the title', () => {
    render(<FormContainer title="Test Title">Content</FormContainer>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <FormContainer title="Test Title">
        <div data-testid="test-content">Test Content</div>
      </FormContainer>
    );
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(
      <FormContainer title="Test Title" errorMessage="Test Error">
        Content
      </FormContainer>
    );
    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });

  it('renders success message when provided', () => {
    render(
      <FormContainer title="Test Title" successMessage="Test Success">
        Content
      </FormContainer>
    );
    expect(screen.getByText('Test Success')).toBeInTheDocument();
  });

  it('renders as a form element when asForm is true', () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    const { container } = render(
      <FormContainer title="Test Title" asForm={true} onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </FormContainer>
    );
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('renders as a div element when asForm is false', () => {
    render(
      <FormContainer title="Test Title" asForm={false}>
        Content
      </FormContainer>
    );
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <FormContainer title="Test Title" className="custom-class">
        Content
      </FormContainer>
    );
    const formContainer = container.firstChild;
    expect(formContainer).toHaveClass('custom-class');
  });
});
