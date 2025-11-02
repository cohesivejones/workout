import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import CalendarView from '../components/CalendarView';
import { fetchTimeline, deletePainScore, deleteSleepScore } from '../api';
import { Workout, PainScore, SleepScore } from '../types';
import classNames from 'classnames';
import styles from './TimelinePage.module.css';
import { useUserContext } from '../contexts/useUserContext';
import { ListView } from '../components/ListView';

function TimelinePage(): ReactElement {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [painScores, setPainScores] = useState<PainScore[]>([]);
  const [sleepScores, setSleepScores] = useState<SleepScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUserContext();
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get view mode from URL or default to "calendar"
  const viewMode = searchParams.get('view') === 'list' ? 'list' : 'calendar';

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Calculate initial date range (last 3 months to next 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
        const threeMonthsAhead = new Date();
        threeMonthsAhead.setDate(threeMonthsAhead.getDate() + 90);

        const startDateStr = threeMonthsAgo.toISOString().split('T')[0];
        const endDateStr = threeMonthsAhead.toISOString().split('T')[0];

        setStartDate(startDateStr);
        setEndDate(endDateStr);

        const timelineData = await fetchTimeline(startDateStr, endDateStr);
        setWorkouts(timelineData.workouts);
        setPainScores(timelineData.painScores);
        setSleepScores(timelineData.sleepScores);
        setHasMore(timelineData.hasMore);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    loadData();
  }, [user, searchParams]);

  const handleLoadMore = async () => {
    if (!user || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      // Extend the date range by another 3 months backward
      const newStartDate = new Date(startDate);
      newStartDate.setDate(newStartDate.getDate() - 90);
      const newStartDateStr = newStartDate.toISOString().split('T')[0];

      setStartDate(newStartDateStr);

      // Fetch data with extended date range
      const timelineData = await fetchTimeline(newStartDateStr, endDate);
      setWorkouts(timelineData.workouts);
      setPainScores(timelineData.painScores);
      setSleepScores(timelineData.sleepScores);
      setHasMore(timelineData.hasMore);
    } catch (err) {
      console.error('Failed to load more data:', err);
      setError('Failed to load more data. Please try again later.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleWorkoutDeleted = (workoutId: number) => {
    setWorkouts((prevWorkouts) => prevWorkouts.filter((w) => w.id !== workoutId));
  };

  const handlePainScoreDelete = async (painScoreId: number) => {
    if (window.confirm('Are you sure you want to delete this pain score?')) {
      try {
        await deletePainScore(painScoreId);
        setPainScores((prev) => prev.filter((ps) => ps.id !== painScoreId));
      } catch (err) {
        console.error('Failed to delete pain score:', err);
      }
    }
  };

  const handleSleepScoreDelete = async (sleepScoreId: number) => {
    if (window.confirm('Are you sure you want to delete this sleep score?')) {
      try {
        await deleteSleepScore(sleepScoreId);
        setSleepScores((prev) => prev.filter((ss) => ss.id !== sleepScoreId));
      } catch (err) {
        console.error('Failed to delete sleep score:', err);
      }
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h2>Activity Timeline</h2>
        <div className={styles.pageActions}>
          <div className={styles.viewToggle}>
            <button
              className={classNames({
                [styles.active]: viewMode === 'calendar',
              })}
              onClick={() => setSearchParams({ view: 'calendar' })}
            >
              Calendar
            </button>
            <button
              className={classNames({
                [styles.active]: viewMode === 'list',
              })}
              onClick={() => setSearchParams({ view: 'list' })}
            >
              List
            </button>
          </div>
        </div>
      </div>
      {error && <div className={styles.errorMessage}>{error}</div>}

      {viewMode === 'calendar' ? (
        <CalendarView workouts={workouts} painScores={painScores} sleepScores={sleepScores} />
      ) : (
        <ListView
          workouts={workouts}
          painScores={painScores}
          sleepScores={sleepScores}
          handleWorkoutDeleted={handleWorkoutDeleted}
          handlePainScoreDelete={handlePainScoreDelete}
          handleSleepScoreDelete={handleSleepScoreDelete}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
        />
      )}
    </div>
  );
}

export default TimelinePage;
