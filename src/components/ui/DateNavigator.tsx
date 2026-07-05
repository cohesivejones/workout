import styles from './DateNavigator.module.css';

interface DateNavigatorProps {
  /** Center label (formatted date or month). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  /** Optional "jump to today/current" reset control. */
  resetLabel?: string;
  onReset?: () => void;
}

/** Prev / center-label(+reset) / next navigation bar (day or month). */
export const DateNavigator = ({
  label,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  resetLabel,
  onReset,
}: DateNavigatorProps) => (
  <div className={styles.navigator}>
    <button type="button" onClick={onPrev} className={styles.navButton}>
      {prevLabel}
    </button>
    <div className={styles.center}>
      <span className={styles.label}>{label}</span>
      {resetLabel && onReset && (
        <button type="button" onClick={onReset} className={styles.resetButton}>
          {resetLabel}
        </button>
      )}
    </div>
    <button type="button" onClick={onNext} className={styles.navButton}>
      {nextLabel}
    </button>
  </div>
);

export default DateNavigator;
