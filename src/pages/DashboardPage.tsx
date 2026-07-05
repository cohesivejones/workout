import { useState, useEffect, useMemo } from 'react';
import {
  fetchWeightProgressionData,
  fetchPainProgressionData,
  fetchSleepProgressionData,
  ExerciseWeightProgression,
  PainScoreProgression,
  SleepScoreProgression,
} from '../api';
import { formatWeightWithKg } from '../utils/weight';
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
import { eachDayOfInterval } from 'date-fns';
import { formatLongDate } from '../utils/dates';
import { chartColors, prColors } from '../styles/chartColors';
import styles from './DashboardPage.module.css';
import { PageHeader } from '../components/ui/PageHeader';

// Utility function to get standard 12-week date range
const getStandardDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 84); // 12 weeks = 84 days

  // Format dates as ISO strings (YYYY-MM-DD)
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  return {
    startDate,
    endDate,
    startDateStr,
    endDateStr,
  };
};

// Utility function to convert a date to a week number (1-12)
const getWeekNumber = (dateStr: string, startDate: Date): number => {
  const date = new Date(dateStr);
  const diffTime = Math.abs(date.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  // Ensure week number is between 1 and 12
  return Math.min(Math.max(weekNumber, 1), 12);
};

// Utility function to normalize data to the standard date range
const normalizeDataToStandardRange = <T extends { date: string }>(
  dataPoints: T[],
  valueKey: keyof T
): T[] => {
  const { startDate, endDate } = getStandardDateRange();

  // Create a map of existing data points by date
  const dataMap = new Map<string, T>();
  dataPoints.forEach((point) => {
    dataMap.set(point.date, point);
  });

  // Generate a complete series with all dates in the range
  const allDatesInRange = eachDayOfInterval({ start: startDate, end: endDate }).map(
    (date) => date.toISOString().split('T')[0]
  );

  // Create normalized data with all dates in range
  const normalizedData = allDatesInRange.map((dateStr) => {
    if (dataMap.has(dateStr)) {
      return dataMap.get(dateStr) as T;
    } else {
      // Create a placeholder with null value for the specified key
      return {
        date: dateStr,
        [valueKey]: null,
      } as unknown as T;
    }
  });

  return normalizedData;
};

// Custom dot component for rendering PR indicators
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  payload?: { weight: number | null; newReps?: boolean; newWeight?: boolean };
}) => {
  const { cx, cy, payload } = props;

  if (!payload || payload.weight === null) {
    return null;
  }

  // Determine color and size based on PR flags
  let fill = prColors.none; // Default
  let r = 4; // Default radius

  if (payload.newReps && payload.newWeight) {
    fill = prColors.both; // Both PRs
    r = 6;
  } else if (payload.newReps) {
    fill = prColors.reps; // New reps
    r = 6;
  } else if (payload.newWeight) {
    fill = prColors.weight; // New weight
    r = 6;
  }

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={fill} strokeWidth={2} />;
};

// Custom tooltip formatter
const formatTooltip = (
  value: number | string,
  name: string,
  props: { payload?: { weight: number; reps: number; newReps?: boolean; newWeight?: boolean } }
) => {
  if (name === 'Weight' && props.payload) {
    const { weight, reps, newReps, newWeight } = props.payload;

    const tooltipContent = [`${formatWeightWithKg(weight)} • ${reps} reps`, 'Weight & Reps'];

    // Add PR indicators
    const prIndicators = [];
    if (newReps) prIndicators.push('🎉 New Rep PR!');
    if (newWeight) prIndicators.push('⭐ New Weight PR!');

    if (prIndicators.length > 0) {
      tooltipContent[0] += ` • ${prIndicators.join(' • ')}`;
    }

    return tooltipContent;
  }

  return [`${value} lbs`, 'Weight'];
};

function DashboardPage() {
  const [progressionData, setProgressionData] = useState<ExerciseWeightProgression[]>([]);
  const [painData, setPainData] = useState<PainScoreProgression | null>(null);
  const [sleepData, setSleepData] = useState<SleepScoreProgression | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [painLoading, setPainLoading] = useState<boolean>(true);
  const [sleepLoading, setSleepLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get standard date range for x-axis
  const dateRange = useMemo(() => getStandardDateRange(), []);

  // Group exercises by first letter for alphabetical index
  const exercisesByLetter = useMemo(() => {
    const grouped = new Map<string, ExerciseWeightProgression[]>();

    progressionData.forEach((exercise) => {
      const firstLetter = exercise.exerciseName.charAt(0).toUpperCase();
      if (!grouped.has(firstLetter)) {
        grouped.set(firstLetter, []);
      }
      grouped.get(firstLetter)!.push(exercise);
    });

    // Sort exercises within each letter group
    grouped.forEach((exercises) => {
      exercises.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
    });

    return new Map([...grouped.entries()].sort());
  }, [progressionData]);

  // Get all available letters for the index
  const availableLetters = useMemo(() => {
    return Array.from(exercisesByLetter.keys());
  }, [exercisesByLetter]);

  // Function to scroll to a specific letter section
  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [weightData, painData, sleepData] = await Promise.all([
          fetchWeightProgressionData(),
          fetchPainProgressionData(),
          fetchSleepProgressionData(),
        ]);

        // Normalize weight progression data
        const normalizedWeightData = weightData.map((exercise) => ({
          ...exercise,
          dataPoints: normalizeDataToStandardRange(
            exercise.dataPoints,
            'weight' as keyof (typeof exercise.dataPoints)[0]
          ),
        }));

        // Normalize pain data if it exists and has data points
        const normalizedPainData =
          painData && painData.dataPoints.length > 0
            ? {
                ...painData,
                dataPoints: normalizeDataToStandardRange(
                  painData.dataPoints,
                  'score' as keyof (typeof painData.dataPoints)[0]
                ),
              }
            : painData;

        // Normalize sleep data if it exists and has data points
        const normalizedSleepData =
          sleepData && sleepData.dataPoints.length > 0
            ? {
                ...sleepData,
                dataPoints: normalizeDataToStandardRange(
                  sleepData.dataPoints,
                  'score' as keyof (typeof sleepData.dataPoints)[0]
                ),
              }
            : sleepData;

        setProgressionData(normalizedWeightData);
        setPainData(normalizedPainData);
        setSleepData(normalizedSleepData);

        setLoading(false);
        setPainLoading(false);
        setSleepLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
        setPainLoading(false);
        setSleepLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  // If no data is available
  if (progressionData.length === 0) {
    return (
      <div className={styles.noData}>
        <h2>No exercise data available</h2>
        <p>Add workouts with weight data to see your progress over time.</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Alphabetical Index Navigation */}
      {availableLetters.length > 0 && (
        <nav className={styles.alphabetNav} aria-label="Jump to exercise by letter">
          {availableLetters.map((letter) => (
            <button
              key={letter}
              className={styles.letterButton}
              onClick={() => scrollToLetter(letter)}
              aria-label={`Jump to exercises starting with ${letter}`}
            >
              {letter}
            </button>
          ))}
        </nav>
      )}

      <div className={styles.dashboardContent}>
        <PageHeader
          align="center"
          title="Exercise Weight Progression"
          subtitle="Tracking your strength gains over the past 12 weeks"
        />

        <div className={styles.chartsContainer}>
          {Array.from(exercisesByLetter.entries()).map(([letter, exercises]) => (
            <div key={letter} id={`letter-${letter}`} className={styles.letterSection}>
              <h3 className={styles.letterHeading}>{letter}</h3>
              {exercises.map((exercise) => (
                <div key={exercise.exerciseName} className={styles.chartCard}>
                  <h4>{exercise.exerciseName}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={exercise.dataPoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => `Week ${getWeekNumber(date, dateRange.startDate)}`}
                        tick={{ fontSize: 12 }}
                        domain={[dateRange.startDateStr, dateRange.endDateStr]}
                        type="category"
                        allowDataOverflow={true}
                        ticks={Array.from({ length: 12 }, (_, i) => {
                          const weekDate = new Date(dateRange.startDate);
                          weekDate.setDate(weekDate.getDate() + i * 7);
                          return weekDate.toISOString().split('T')[0];
                        })}
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
                        formatter={formatTooltip}
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
                        dot={<CustomDot />}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className={styles.prLegend}>
                    <div className={styles.legendItem}>
                      <div
                        className={styles.legendDot}
                        style={{ backgroundColor: prColors.none }}
                      ></div>
                      <span>Previous Rep</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div
                        className={styles.legendDot}
                        style={{ backgroundColor: prColors.reps }}
                      ></div>
                      <span>New Rep PR</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Pain Score Chart */}
        {!painLoading && painData && painData.dataPoints.length > 0 && (
          <>
            <PageHeader
              align="center"
              title="Pain Score Progression"
              subtitle="Tracking your pain levels over the past 12 weeks"
            />

            <div className={styles.chartCard}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={painData.dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => `Week ${getWeekNumber(date, dateRange.startDate)}`}
                    tick={{ fontSize: 12 }}
                    domain={[dateRange.startDateStr, dateRange.endDateStr]}
                    type="category"
                    allowDataOverflow={true}
                    ticks={Array.from({ length: 12 }, (_, i) => {
                      const weekDate = new Date(dateRange.startDate);
                      weekDate.setDate(weekDate.getDate() + i * 7);
                      return weekDate.toISOString().split('T')[0];
                    })}
                  />
                  <YAxis
                    label={{
                      value: 'Pain Score (0-10)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontSize: 12 },
                    }}
                    domain={[0, 10]}
                    tick={{ fontSize: 12 }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}/10`, 'Pain Level']}
                    labelFormatter={(date) => formatLongDate(date)}
                    contentStyle={{ fontSize: '12px', padding: '8px' }}
                    wrapperStyle={{ zIndex: 1000 }}
                    isAnimationActive={false}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={chartColors.danger}
                    activeDot={{ r: 8 }}
                    connectNulls={true}
                    name="Pain Level"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Sleep Score Chart */}
        {!sleepLoading && sleepData && sleepData.dataPoints.length > 0 && (
          <>
            <PageHeader
              align="center"
              title="Sleep Quality Progression"
              subtitle="Tracking your sleep quality over the past 12 weeks"
            />

            <div className={styles.chartCard}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sleepData.dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => `Week ${getWeekNumber(date, dateRange.startDate)}`}
                    tick={{ fontSize: 12 }}
                    domain={[dateRange.startDateStr, dateRange.endDateStr]}
                    type="category"
                    allowDataOverflow={true}
                    ticks={Array.from({ length: 12 }, (_, i) => {
                      const weekDate = new Date(dateRange.startDate);
                      weekDate.setDate(weekDate.getDate() + i * 7);
                      return weekDate.toISOString().split('T')[0];
                    })}
                  />
                  <YAxis
                    label={{
                      value: 'Sleep Score (1-5)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontSize: 12 },
                    }}
                    domain={[1, 5]}
                    tick={{ fontSize: 12 }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}/5`, 'Sleep Quality']}
                    labelFormatter={(date) => formatLongDate(date)}
                    contentStyle={{ fontSize: '12px', padding: '8px' }}
                    wrapperStyle={{ zIndex: 1000 }}
                    isAnimationActive={false}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={chartColors.success}
                    activeDot={{ r: 8 }}
                    connectNulls={true}
                    name="Sleep Quality"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
