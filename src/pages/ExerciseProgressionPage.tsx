import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { fetchExerciseProgression, ExerciseProgressionResponse } from '../api';
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
import { format } from 'date-fns';
import styles from './ExerciseProgressionPage.module.css';
import buttonStyles from '../styles/common/buttons.module.css';
import classNames from 'classnames';

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

  const fill = payload.newWeight ? '#4caf50' : '#8884d8';
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

  const fill = payload.newReps ? '#ffd700' : '#ff6b35';
  const r = payload.newReps ? 6 : 4;

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={fill} strokeWidth={2} />;
};

function ExerciseProgressionPage() {
  const { id } = useParams<{ id: string }>();
  const exerciseId = parseInt(id || '0');

  const [progressionData, setProgressionData] = useState<ExerciseProgressionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchExerciseProgression(exerciseId);
        setProgressionData(data);
      } catch (err) {
        console.error('Failed to load progression data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load progression data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [exerciseId]);

  if (loading) {
    return <div className={styles.loading}>Loading progression data...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (!progressionData) {
    return <div className={styles.errorMessage}>No progression data found</div>;
  }

  // Check if there's any actual data
  const hasWeightData = progressionData.weightData.length > 0;
  const hasRepsData = progressionData.repsData.length > 0;

  if (!hasWeightData && !hasRepsData) {
    return (
      <div className={styles.progressionPage}>
        <div className={styles.pageHeader}>
          <h2>{progressionData.exerciseName}</h2>
          <Link to="/" className={classNames(buttonStyles.tertiaryBtn)}>
            Back
          </Link>
        </div>
        <div className={styles.noData}>
          <p>No progression data available for this exercise.</p>
          <p>Start tracking this exercise in your workouts to see your progress over time!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.progressionPage}>
      <div className={styles.pageHeader}>
        <h2>{progressionData.exerciseName}</h2>
        <Link to="/" className={classNames(buttonStyles.tertiaryBtn)}>
          Back
        </Link>
      </div>

      <p className={styles.subtitle}>Track your progressive overload over time</p>

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
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
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
                  labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                  contentStyle={{ fontSize: '12px', padding: '8px' }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  connectNulls={true}
                  name="Weight"
                  dot={<WeightDot />}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className={styles.prLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#8884d8' }}></div>
                <span>Normal</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#4caf50' }}></div>
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
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
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
                  labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                  contentStyle={{ fontSize: '12px', padding: '8px' }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                <Line
                  type="monotone"
                  dataKey="reps"
                  stroke="#ff6b35"
                  activeDot={{ r: 8 }}
                  connectNulls={true}
                  name="Reps"
                  dot={<RepsDot />}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className={styles.prLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#ff6b35' }}></div>
                <span>Normal</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#ffd700' }}></div>
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
