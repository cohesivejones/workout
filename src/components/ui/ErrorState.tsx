import React from 'react';
import styles from './Status.module.css';

interface ErrorStateProps {
  children: React.ReactNode;
  className?: string;
}

/** Inline error banner for page-level failures. */
export const ErrorState = ({ children, className }: ErrorStateProps) => (
  <div className={className ? `${styles.error} ${className}` : styles.error} role="alert">
    {children}
  </div>
);

export default ErrorState;
