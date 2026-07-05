import React from 'react';
import classNames from 'classnames';
import styles from './Checkbox.module.css';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
};

/**
 * Labeled checkbox using the brand accent color. forwardRef so react-hook-form
 * register() works. The label wraps the input, so the whole row is clickable.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => (
    <label className={classNames(styles.wrapper, className)}>
      <input ref={ref} type="checkbox" className={styles.checkbox} {...props} />
      {label != null && <span className={styles.label}>{label}</span>}
    </label>
  )
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
