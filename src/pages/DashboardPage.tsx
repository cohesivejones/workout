import { useState, useEffect, useMemo } from "react";
import {
  fetchWeightProgressionData,
  fetchPainProgressionData,
  fetchSleepProgressionData,
  ExerciseWeightProgression,
  PainScoreProgression,
  SleepScoreProgression,
} from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, eachDayOfInterval } from "date-fns";
import styles from "./DashboardPage.module.css";

// Utility function to get standard 12-week date range
const getStandardDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 84); // 12 weeks = 84 days

  // Format dates as ISO strings (YYYY-MM-DD)
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

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
    (date) => date.toISOString().split("T")[0]
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
  payload?: { weight: number | null; new_reps?: boolean; new_weight?: boolean };
}) => {
  const { cx, cy, payload } = props;

  if (!payload || payload.weight === null) {
    return null;
  }

  // Determine color and size based on PR flags
  let fill = "#8884d8"; // Default blue
  let r = 4; // Default radius

  if (payload.new_reps && payload.new_weight) {
    fill = "#ff6b35"; // Orange for both PRs
    r = 6;
  } else if (payload.new_reps) {
    fill = "#ffd700"; // Gold for new reps
    r = 6;
  } else if (payload.new_weight) {
    fill = "#4caf50"; // Green for new weight
    r = 6;
  }

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={fill} strokeWidth={2} />;
};

// Custom tooltip formatter
const formatTooltip = (
  value: number | string,
  name: string,
  props: { payload?: { weight: number; reps: number; new_reps?: boolean; new_weight?: boolean } }
) => {
  if (name === "Weight" && props.payload) {
    const { weight, reps, new_reps, new_weight } = props.payload;

    const tooltipContent = [`${weight} lbs • ${reps} reps`, "Weight & Reps"];

    // Add PR indicators
    const prIndicators = [];
    if (new_reps) prIndicators.push("🎉 New Rep PR!");
    if (new_weight) prIndicators.push("⭐ New Weight PR!");

    if (prIndicators.length > 0) {
      tooltipContent[0] += ` • ${prIndicators.join(" • ")}`;
    }

    return tooltipContent;
  }

  return [`${value} lbs`, "Weight"];
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
            "weight" as keyof (typeof exercise.dataPoints)[0]
          ),
        }));

        // Normalize pain data if it exists and has data points
        const normalizedPainData =
          painData && painData.dataPoints.length > 0
            ? {
                ...painData,
                dataPoints: normalizeDataToStandardRange(
                  painData.dataPoints,
                  "score" as keyof (typeof painData.dataPoints)[0]
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
                  "score" as keyof (typeof sleepData.dataPoints)[0]
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
        console.error("Failed to load data:", err);
        setError("Failed to load dashboard data. Please try again later.");
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
    <div>
      <div className={styles.pageHeader}>
        <h2>Exercise Weight Progression</h2>
        <p className={styles.subtitle}>Tracking your strength gains over the past 12 weeks</p>
      </div>

      <div className={styles.chartsContainer}>
        {progressionData.map((exercise) => (
          <div key={exercise.exerciseName} className={styles.chartCard}>
            <h3>{exercise.exerciseName}</h3>
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
                    return weekDate.toISOString().split("T")[0];
                  })}
                />
                <YAxis
                  label={{
                    value: "Weight (lbs)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fontSize: 12 },
                  }}
                  domain={["dataMin - 10", "dataMax + 10"]}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  formatter={formatTooltip}
                  labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                  contentStyle={{ fontSize: "12px", padding: "8px" }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: "12px", marginTop: "5px" }} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  connectNulls={true}
                  name="Weight"
                  dot={<CustomDot />}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className={styles.prLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: "#8884d8" }}></div>
                <span>Previous Rep</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: "#ffd700" }}></div>
                <span>New Rep PR</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pain Score Chart */}
      {!painLoading && painData && painData.dataPoints.length > 0 && (
        <>
          <div className={styles.pageHeader}>
            <h2>Pain Score Progression</h2>
            <p className={styles.subtitle}>Tracking your pain levels over the past 12 weeks</p>
          </div>

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
                    return weekDate.toISOString().split("T")[0];
                  })}
                />
                <YAxis
                  label={{
                    value: "Pain Score (0-10)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fontSize: 12 },
                  }}
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [`${value}/10`, "Pain Level"]}
                  labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                  contentStyle={{ fontSize: "12px", padding: "8px" }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: "12px", marginTop: "5px" }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#ff5252"
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
          <div className={styles.pageHeader}>
            <h2>Sleep Quality Progression</h2>
            <p className={styles.subtitle}>Tracking your sleep quality over the past 12 weeks</p>
          </div>

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
                    return weekDate.toISOString().split("T")[0];
                  })}
                />
                <YAxis
                  label={{
                    value: "Sleep Score (1-5)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fontSize: 12 },
                  }}
                  domain={[1, 5]}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [`${value}/5`, "Sleep Quality"]}
                  labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                  contentStyle={{ fontSize: "12px", padding: "8px" }}
                  wrapperStyle={{ zIndex: 1000 }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: "12px", marginTop: "5px" }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4caf50"
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
  );
}

export default DashboardPage;
