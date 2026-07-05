import React from 'react';
import styles from './Status.module.css';

interface EmptyStateProps {
  /** Icon element (e.g. a react-icon) shown in a tinted badge. */
  icon?: React.ReactNode;
  title: string;
  message?: React.ReactNode;
  /** Optional call-to-action (e.g. a Button). */
  action?: React.ReactNode;
  className?: string;
}

/** Branded empty state: tinted icon badge + title + message + optional action. */
export const EmptyState = ({ icon, title, message, action, className }: EmptyStateProps) => (
  <div className={className ? `${styles.empty} ${className}` : styles.empty}>
    {icon && (
      <div className={styles.emptyIcon} aria-hidden="true">
        {icon}
      </div>
    )}
    <h3 className={styles.emptyTitle}>{title}</h3>
    {message && <p className={styles.emptyMessage}>{message}</p>}
    {action}
  </div>
);

export default EmptyState;
