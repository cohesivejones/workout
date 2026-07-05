import React from 'react';
import classNames from 'classnames';
import styles from './Field.module.css';

/* ---- Controls (forwardRef so react-hook-form register works) ---- */

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...props }, ref) => (
    <input
      ref={ref}
      className={classNames(styles.control, { [styles.invalid]: invalid }, className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={classNames(styles.control, { [styles.invalid]: invalid }, className)}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={classNames(styles.control, { [styles.invalid]: invalid }, className)}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

/* ---- Field wrapper: label + control + error ---- */

interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Groups a label, control, and error message with consistent spacing. */
export const Field = ({ label, htmlFor, error, children, className }: FieldProps) => (
  <div className={classNames(styles.field, className)}>
    {label && (
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
    )}
    {children}
    {error && <span className={styles.error}>{error}</span>}
  </div>
);

export default Field;
