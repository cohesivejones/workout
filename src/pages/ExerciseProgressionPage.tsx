import { useParams } from 'wouter';
import { fetchExerciseProgression } from '../api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatShortDate, formatLongDate } from '../utils/dates';
import { chartColors, prColors } from '../styles/chartColors';
import styles from './ExerciseProgressionPage.module.css';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { useAsync } from '../hooks/useAsync';

// Custom dot component for weight chart
const WeightDot = (props: {
  cx?: number;
  cy?: number;
  payload?: { weight: number | null; newWeight?: boolean };
}) => {
  const { cx, cy, payload } = props;

  if (!payload || payload.weight === null) {
    return null;
  }

  const fill = payload.newWeight ? prColors.weight : prColors.none;
  const r = payload.newWeight ? 6 : 4;

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={fill} strokeWidth={2} />;
};

// Custom dot component for reps chart
const RepsDot = (props: {
  cx?: number;
  cy?: number;
  payload?: { reps: number | null; newReps?: boolean };
}) => {
  const { cx, cy, payload } = props;

  if (!payload || payload.reps === null) {
    return null;
  }

  const fill = payload.newReps ? prColors.reps : chartColors.accent;
  const r = payload.newReps ? 6 : 4;

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={fill} strokeWidth={2} />;
};

function ExerciseProgressionPage() {
  const { id } = useParams<{ id: string }>();
  const exerciseId = parseInt(id || '0');

  const {
    data: progressionData,
    loading,
    error,
  } = useAsync(() => fetchExerciseProgression(exerciseId), [exerciseId], {
    errorMessage: 'Failed to load progression data',
  });

  if (loading) {
    return <LoadingState label="Loading progression data..." />;
  }

  if (error) {
    return <ErrorState>{error}</ErrorState>;
  }

  if (!progressionData) {
    return <ErrorState>No progression data found</ErrorState>;
  }

  // Check if there's any actual data
  const hasWeightData = progressionData.weightData.length > 0;
  const hasRepsData = progressionData.repsData.length > 0;

  if (!hasWeightData && !hasRepsData) {
    return (
      <div className={styles.progressionPage}>
        <PageHeader
          title={progressionData.exerciseName}
          actions={
            <Button to="/" variant="tertiary">
              Back
            </Button>
          }
        />
        <EmptyState
          title="No progression data available for this exercise."
          message="Start tracking this exercise in your workouts to see your progress over time!"
        />
      </div>
    );
  }

  return (
    <div className={styles.progressionPage}>
      <PageHeader
        title={progressionData.exerciseName}
        subtitle="Track your progressive overload over time"
        actions={
          <Button to="/" variant="tertiary">
            Back
          </Button>
        }
      />

      <div className={styles.chartsContainer}>
        {/* Weight Progression Chart */}
        {hasWeightData && (
          <div className={styles.chartCard}>
            <h3>Weight Progression</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressionData.weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatShortDate(date)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{
                    value: 'Weight (lbs)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: 12 },
                  }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  formatter={(value: number, _name: string) => [`${value} lbs`, 'Weight']}
                  labelFormatter={(date) => formatLongDate(date)}
                  contentStyle={{ fontSize: '12px', padding: '8px' }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={chartColors.primary}
                  activeDot={{ r: 8 }}
                  connectNulls={true}
                  name="Weight"
                  dot={<WeightDot />}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className={styles.prLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: prColors.none }}></div>
                <span>Normal</span>
              </div>
              <div className={styles.legendItem}>
                <div
                  className={styles.legendDot}
                  style={{ backgroundColor: prColors.weight }}
                ></div>
                <span>New Weight PR</span>
              </div>
            </div>
          </div>
        )}

        {/* Reps Progression Chart */}
        {hasRepsData && (
          <div className={styles.chartCard}>
            <h3>Rep Progression</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressionData.repsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatShortDate(date)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{
                    value: 'Reps',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: 12 },
                  }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  formatter={(value: number, _name: string) => [`${value} reps`, 'Reps']}
                  labelFormatter={(date) => formatLongDate(date)}
                  contentStyle={{ fontSize: '12px', padding: '8px' }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                <Line
                  type="monotone"
                  dataKey="reps"
                  stroke={chartColors.accent}
                  activeDot={{ r: 8 }}
                  connectNulls={true}
                  name="Reps"
                  dot={<RepsDot />}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className={styles.prLegend}>
              <div className={styles.legendItem}>
                <div
                  className={styles.legendDot}
                  style={{ backgroundColor: chartColors.accent }}
                ></div>
                <span>Normal</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: prColors.reps }}></div>
                <span>New Rep PR</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.progressionInfo}>
        <h3>Understanding Progressive Overload</h3>
        <p>
          Progressive overload is the gradual increase of stress placed upon the body during
          training. Look for trends in your charts:
        </p>
        <ul>
          <li>
            <strong>Increasing weight</strong> with consistent reps shows strength gains
          </li>
          <li>
            <strong>Increasing reps</strong> at the same weight builds muscular endurance
          </li>
          <li>
            <strong>Both increasing</strong> indicates excellent overall progress
          </li>
          <li>Consider increasing load when you can perform 2-3 more reps than your target</li>
        </ul>
      </div>
    </div>
  );
}

export default ExerciseProgressionPage;
