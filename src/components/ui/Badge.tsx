import React from 'react';
import classNames from 'classnames';
import styles from './Badge.module.css';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'danger' | 'accent' | 'warning';

interface BadgeProps {
  variant?: BadgeVariant;
  /** Small, uppercased, tracked — for terse status tags like "NEW REPS". */
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}

/**
 * A pill-shaped status label. The design system's single source for
 * badges/tags (PR flags, "With Instructor", etc.).
 */
export const Badge = ({ variant = 'neutral', size = 'md', className, children }: BadgeProps) => (
  <span
    className={classNames(styles.badge, styles[variant], { [styles.sm]: size === 'sm' }, className)}
  >
    {children}
  </span>
);

export default Badge;
