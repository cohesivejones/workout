import { FaHeartbeat, FaMoon } from 'react-icons/fa';
import classNames from 'classnames';
import styles from './ScoreChip.module.css';
import { getPainSeverityColor, getSleepSeverityColor } from '../../styles/chartColors';

type ScoreKind = 'pain' | 'sleep';

interface ScoreChipProps {
  kind: ScoreKind;
  score: number;
  /** 'compact' for calendar grid cells, 'full' for the wider vertical/week view. */
  layout?: 'compact' | 'full';
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * A severity-colored score pill (pain or sleep) with an icon and a mono value.
 * The single source for how scores render across the calendar and lists.
 * Color encodes severity via the shared ramp in chartColors.ts.
 */
export const ScoreChip = ({
  kind,
  score,
  layout = 'compact',
  onClick,
  ariaLabel,
  className,
}: ScoreChipProps) => {
  const isPain = kind === 'pain';
  const color = isPain ? getPainSeverityColor(score) : getSleepSeverityColor(score);
  const label = isPain ? 'Pain' : 'Sleep';
  const Icon = isPain ? FaHeartbeat : FaMoon;

  return (
    <button
      type="button"
      className={classNames(styles.chip, styles[layout], className)}
      style={{ backgroundColor: color }}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClick();
              }
            }
          : undefined
      }
      aria-label={ariaLabel}
    >
      <Icon className={styles.icon} aria-hidden="true" />
      {`${label}: ${score}`}
    </button>
  );
};

export default ScoreChip;
