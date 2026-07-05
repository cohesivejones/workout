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
export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', size = 'md', fullWidth, iconOnly, className, children } = props;

  const classes = classNames(
    styles.btn,
    styles[variant],
    styles[size],
    { [styles.fullWidth]: fullWidth, [styles.iconOnly]: iconOnly },
    className
  );

  if (props.to !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      variant: _v,
      size: _s,
      fullWidth: _f,
      iconOnly: _i,
      className: _c,
      to,
      ...rest
    } = props;
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    variant: _v,
    size: _s,
    fullWidth: _f,
    iconOnly: _i,
    className: _c,
    to: _t,
    ...rest
  } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
