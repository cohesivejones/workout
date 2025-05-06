import { useState, useEffect } from "react";
import { fetchWeightProgressionData, ExerciseWeightProgression } from "../api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import styles from "./DashboardPage.module.css";

function DashboardPage() {
  const [progressionData, setProgressionData] = useState<ExerciseWeightProgression[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchWeightProgressionData();
        setProgressionData(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setLoading(false);
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
                  tickFormatter={(date) => format(new Date(date), 'MM/dd')}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12 } }} 
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip 
                  formatter={(value) => [`${value} lbs`, 'Weight']}
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
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
