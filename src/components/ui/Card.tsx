import React from 'react';
import classNames from 'classnames';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift — use for cards that are clickable or link somewhere. */
  interactive?: boolean;
  /** Colored left accent bar (pass a token value, e.g. var(--color-primary)). */
  accent?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

/**
 * A surface container — the design system's card. Wraps content in the
 * standard surface + border + radius + shadow.
 */
export const Card = ({
  interactive,
  accent,
  padding = 'md',
  className,
  style,
  children,
  ...rest
}: CardProps) => (
  <div
    className={classNames(
      styles.card,
      styles[`pad-${padding}`],
      { [styles.interactive]: interactive, [styles.accented]: !!accent },
      className
    )}
    style={accent ? { borderLeftColor: accent, ...style } : style}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
