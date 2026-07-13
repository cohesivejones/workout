import { useState, useEffect } from 'react';
import { fetchMonthlyNutritionSummary, MonthlyNutritionSummary } from '../api';
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
import { startOfMonth, addMonths, format } from 'date-fns';
import { formatShortDate, formatDayOfMonth } from '../utils/dates';
import { chartColors } from '../styles/chartColors';
import styles from './MonthlyNutritionPage.module.css';
import { PageHeader } from '../components/ui/PageHeader';
import { DateNavigator } from '../components/ui/DateNavigator';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';

function MonthlyNutritionPage() {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [data, setData] = useState<MonthlyNutritionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const summaryData = await fetchMonthlyNutritionSummary(monthStartStr);
        setData(summaryData);
      } catch (err) {
        console.error('Failed to load monthly nutrition data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [monthStart]);

  const handlePreviousMonth = () => {
    setMonthStart((prev) => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setMonthStart((prev) => addMonths(prev, 1));
  };

  const handleCurrentMonth = () => {
    setMonthStart(startOfMonth(new Date()));
  };

  const formatMonthDisplay = () => {
    return format(monthStart, 'MMMM yyyy');
  };

  if (loading) {
    return <LoadingState label="Loading..." />;
  }

  if (error) {
    return <ErrorState>{error}</ErrorState>;
  }

  // Format chart data for display
  const chartData =
    data?.dailyData.map((day) => ({
      ...day,
      dayOfMonth: formatDayOfMonth(day.date),
      displayDate: formatShortDate(day.date),
    })) || [];

  // Check if there's any data
  const hasWeightData = data?.dailyData.some((day) => day.weight !== null) || false;
  const hasCalorieData = data?.dailyData.some((day) => day.totalCalories !== null) || false;
  const hasAnyData = hasWeightData || hasCalorieData;

  // Custom label component for workout day markers
  interface LabelProps {
    cx?: number;
    cy?: number;
    payload?: {
      workoutDay?: boolean;
      totalCalories?: number | null;
    };
  }

  const renderWorkoutMarker = (props: LabelProps) => {
    const { cx, cy, payload } = props;
    if (cx && cy && payload?.workoutDay && payload?.totalCalories !== null) {
      return (
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          fill={chartColors.axis}
          fontSize="16"
          fontWeight="bold"
        >
          🏋️
        </text>
      );
    }
    // Return empty g element instead of null to satisfy TypeScript
    return <g />;
  };

  return (
    <div className={styles.MonthlyNutritionPage}>
      <PageHeader
        title="Monthly Nutrition Analytics"
        subtitle="Track your weight and calorie trends throughout the month"
      />

      <DateNavigator
        label={formatMonthDisplay()}
        prevLabel="Previous Month"
        nextLabel="Next Month"
        resetLabel="Current Month"
        onPrev={handlePreviousMonth}
        onNext={handleNextMonth}
        onReset={handleCurrentMonth}
      />

      {!hasAnyData && (
        <div className={styles.emptyState}>
          <p>No data available for this month.</p>
          <p>Start logging meals and weight entries to see your progress!</p>
        </div>
      )}

      {hasAnyData && (
        <div className={styles.chartsContainer}>
          {/* Weight Chart */}
          {hasWeightData && (
            <Card>
              <h3>Weight Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dayOfMonth"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Day of Month',
                      position: 'insideBottom',
                      offset: -5,
                      style: { fontSize: 12 },
                    }}
                  />
                  <YAxis
                    label={{
                      value: 'Weight (kg)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontSize: 12 },
                    }}
                    tick={{ fontSize: 12 }}
                    width={50}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const numValue = value as number;
                      return numValue !== null
                        ? [`${numValue.toFixed(1)} kg`, 'Weight']
                        : ['No data', 'Weight'];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return (payload[0].payload as any).displayDate;
                      }
                      return label;
                    }}
                    contentStyle={{ fontSize: '12px', padding: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                    name="Weight"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Calories Chart */}
          {hasCalorieData && (
            <Card>
              <div className={styles.chartHeader}>
                <h3>Calorie Intake</h3>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>🏋️ = Workout Day</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dayOfMonth"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Day of Month',
                      position: 'insideBottom',
                      offset: -5,
                      style: { fontSize: 12 },
                    }}
                  />
                  <YAxis
                    label={{
                      value: 'Calories (kcal)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontSize: 12 },
                    }}
                    tick={{ fontSize: 12 }}
                    width={60}
                    domain={[0, 'dataMax + 200']}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const numValue = value as number;
                      return numValue !== null
                        ? [`${numValue.toFixed(0)} kcal`, 'Calories']
                        : ['No data', 'Calories'];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const day = payload[0].payload as any;
                        const workoutIndicator = day.workoutDay ? ' 🏋️' : '';
                        return `${day.displayDate}${workoutIndicator}`;
                      }
                      return label;
                    }}
                    contentStyle={{ fontSize: '12px', padding: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                  <Line
                    type="monotone"
                    dataKey="totalCalories"
                    stroke={chartColors.accent}
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                    name="Calories"
                    dot={{ r: 4 }}
                    label={renderWorkoutMarker}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default MonthlyNutritionPage;
