import styles from './Status.module.css';

interface LoadingStateProps {
  /** Text shown beneath the spinner. */
  label?: string;
  className?: string;
}

/** Centered loading indicator with a spinner and label. */
export const LoadingState = ({ label = 'Loading...', className }: LoadingStateProps) => (
  <div className={className ? `${styles.loading} ${className}` : styles.loading} role="status">
    <span className={styles.spinner} aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export default LoadingState;
