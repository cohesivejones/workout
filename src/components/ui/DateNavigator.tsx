import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import styles from './DateNavigator.module.css';

interface DateNavigatorProps {
  /** Center label (formatted date or month). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** Text for the previous control (e.g. "Previous Day"); also its aria-label. */
  prevLabel: string;
  /** Text for the next control (e.g. "Next Day"); also its aria-label. */
  nextLabel: string;
  /** Optional "jump to today/current" reset control. */
  resetLabel?: string;
  onReset?: () => void;
}

/**
 * Prev / center-label(+reset) / next navigation bar (day or month).
 * The direction chevron is always shown; the text label collapses to an
 * icon-only button on narrow screens so the bar stays a comfortable
 * single row on mobile.
 */
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
    <button type="button" onClick={onPrev} className={styles.navButton} aria-label={prevLabel}>
      <MdChevronLeft className={styles.navIcon} aria-hidden="true" />
      <span className={styles.navText}>{prevLabel}</span>
    </button>
    <div className={styles.center}>
      <span className={styles.label}>{label}</span>
      {resetLabel && onReset && (
        <button type="button" onClick={onReset} className={styles.resetButton}>
          {resetLabel}
        </button>
      )}
    </div>
    <button type="button" onClick={onNext} className={styles.navButton} aria-label={nextLabel}>
      <span className={styles.navText}>{nextLabel}</span>
      <MdChevronRight className={styles.navIcon} aria-hidden="true" />
    </button>
  </div>
);

export default DateNavigator;
