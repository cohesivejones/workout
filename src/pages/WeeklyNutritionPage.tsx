import { useState, useEffect } from 'react';
import { fetchWeeklyNutritionSummary, WeeklyNutritionSummary } from '../api';
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
import { startOfWeek, addDays, addWeeks, format } from 'date-fns';
import styles from './WeeklyNutritionPage.module.css';

function WeeklyNutritionPage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [data, setData] = useState<WeeklyNutritionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const summaryData = await fetchWeeklyNutritionSummary(weekStartStr);
        setData(summaryData);
      } catch (err) {
        console.error('Failed to load weekly nutrition data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekStart]);

  const handlePreviousWeek = () => {
    setWeekStart((prev) => addWeeks(prev, -1));
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => addWeeks(prev, 1));
  };

  const handleCurrentWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const formatWeekDisplay = () => {
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  // Format chart data for display
  const chartData =
    data?.dailyData.map((day) => ({
      ...day,
      dayOfWeek: format(new Date(day.date), 'EEE'), // Mon, Tue, etc.
      displayDate: format(new Date(day.date), 'MMM d'),
    })) || [];

  // Check if there's any data
  const hasWeightData = data?.dailyData.some((day) => day.weight !== null) || false;
  const hasCalorieData = data?.dailyData.some((day) => day.totalCalories !== null) || false;
  const hasAnyData = hasWeightData || hasCalorieData;

  return (
    <div className={styles.weeklyNutritionPage}>
      <div className={styles.pageHeader}>
        <h2>Weekly Nutrition Analytics</h2>
        <p className={styles.subtitle}>Track your weight and calorie trends throughout the week</p>
      </div>

      <div className={styles.weekNavigator}>
        <button onClick={handlePreviousWeek} className={styles.navButton}>
          ← Previous Week
        </button>
        <div className={styles.weekDisplay}>
          <span className={styles.weekText}>{formatWeekDisplay()}</span>
          <button onClick={handleCurrentWeek} className={styles.currentWeekButton}>
            Current Week
          </button>
        </div>
        <button onClick={handleNextWeek} className={styles.navButton}>
          Next Week →
        </button>
      </div>

      {!hasAnyData && (
        <div className={styles.emptyState}>
          <p>No data available for this week.</p>
          <p>Start logging meals and weight entries to see your progress!</p>
        </div>
      )}

      {hasAnyData && (
        <div className={styles.chartsContainer}>
          {/* Weight Chart */}
          {hasWeightData && (
            <div className={styles.chartCard}>
              <h3>Weight Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dayOfWeek"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Day of Week',
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
                    stroke="#8884d8"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                    name="Weight"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Calories Chart */}
          {hasCalorieData && (
            <div className={styles.chartCard}>
              <h3>Calorie Intake</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dayOfWeek"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Day of Week',
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
                        return (payload[0].payload as any).displayDate;
                      }
                      return label;
                    }}
                    contentStyle={{ fontSize: '12px', padding: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '5px' }} />
                  <Line
                    type="monotone"
                    dataKey="totalCalories"
                    stroke="#ff6b35"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                    name="Calories"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WeeklyNutritionPage;
