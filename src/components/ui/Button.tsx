import React from 'react';
import { Link } from 'wouter';
import classNames from 'classnames';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Square icon button (e.g. edit/delete actions). */
  iconOnly?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    to?: undefined;
  };

type LinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    /** When set, renders a router <Link> styled as a button. */
    to: string;
  };

/**
 * The design system's button. Renders a <button>, or a router <Link> when
 * `to` is provided. Skin/behavior live here; sizing is controlled by props.
 */
const OWN_PROP_KEYS = ['variant', 'size', 'fullWidth', 'iconOnly', 'className', 'children', 'to'];

export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', size = 'md', fullWidth, iconOnly, className, children } = props;

  const classes = classNames(
    styles.btn,
    styles[variant],
    styles[size],
    { [styles.fullWidth]: fullWidth, [styles.iconOnly]: iconOnly },
    className
  );

  // Forward only the native DOM props (onClick, disabled, type, aria-*, etc.),
  // dropping this component's own props.
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!OWN_PROP_KEYS.includes(key)) {
      rest[key] = (props as Record<string, unknown>)[key];
    }
  }

  if (props.to !== undefined) {
    return (
      <Link
        to={props.to}
        className={classes}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}

export default Button;
