import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  fetchMealsByDate,
  deleteMeal,
  fetchWeightEntryByDate,
  fetchLatestWeightEntry,
  createWeightEntry,
  updateWeightEntry,
} from '../api';
import { Meal, WeightEntry } from '../types';
import { useUserContext } from '../contexts/useUserContext';
import { format } from 'date-fns';
import { MdOutlineEdit } from 'react-icons/md';
import classNames from 'classnames';
import styles from './NutritionPage.module.css';
import buttonStyles from '../styles/common/buttons.module.css';

function NutritionPage(): React.ReactElement {
  const [, setLocation] = useLocation();
  const { user } = useUserContext();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weightEntry, setWeightEntry] = useState<WeightEntry | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [weightInput, setWeightInput] = useState<string>('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [savingWeight, setSavingWeight] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const [mealsData, latestWeightData] = await Promise.all([
          fetchMealsByDate(selectedDate),
          fetchLatestWeightEntry().catch(() => null),
        ]);

        setMeals(mealsData);
        setLatestWeight(latestWeightData);

        // Fetch weight entry for selected date
        try {
          const weightData = await fetchWeightEntryByDate(selectedDate);
          setWeightEntry(weightData);
          setWeightInput(weightData.weight.toString());
        } catch {
          // No weight entry for this date
          setWeightEntry(null);
          setWeightInput('');
        }

        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate, user]);

  const handleAddMeal = () => {
    setLocation(`/nutrition/meals/new?date=${selectedDate}`);
  };

  const handleEditMeal = (mealId: number) => {
    setLocation(`/nutrition/meals/${mealId}/edit`);
  };

  const handleDeleteMeal = async (mealId: number) => {
    if (!window.confirm('Are you sure you want to delete this meal?')) {
      return;
    }

    try {
      await deleteMeal(mealId);
      setMeals(meals.filter((meal) => meal.id !== mealId));
    } catch (err) {
      console.error('Failed to delete meal:', err);
      setError('Failed to delete meal. Please try again.');
    }
  };

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSaveWeight = async () => {
    if (!user || !weightInput.trim()) return;

    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      setWeightError('Please enter a valid weight');
      return;
    }

    try {
      setSavingWeight(true);
      setWeightError(null);

      const weightData = { date: selectedDate, weight };

      if (weightEntry) {
        // Update existing entry
        const updated = await updateWeightEntry(weightEntry.id, weightData);
        setWeightEntry(updated);
        setLatestWeight(updated);
      } else {
        // Create new entry
        const created = await createWeightEntry(weightData);
        setWeightEntry(created);
        setLatestWeight(created);
      }
    } catch (err) {
      console.error('Failed to save weight:', err);
      setWeightError('Failed to save weight. Please try again.');
    } finally {
      setSavingWeight(false);
    }
  };

  // Calculate daily totals
  const dailyTotals = meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + Number(meal.calories),
      protein: totals.protein + Number(meal.protein),
      carbs: totals.carbs + Number(meal.carbs),
      fat: totals.fat + Number(meal.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && meals.length === 0) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.nutritionPage}>
      <div className={styles.pageHeader}>
        <h2>Nutrition</h2>
      </div>

      <div className={styles.dateNavigator}>
        <button onClick={() => handleDateChange(-1)} className={styles.navButton}>
          ← Previous Day
        </button>
        <div className={styles.dateDisplay}>
          <span className={styles.dateText}>{formatDate(selectedDate)}</span>
          <button onClick={handleToday} className={styles.todayButton}>
            Today
          </button>
        </div>
        <button onClick={() => handleDateChange(1)} className={styles.navButton}>
          Next Day →
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.contentContainer}>
        <div className={styles.mealsSection}>
          <div className={styles.sectionHeader}>
            <h3>Meals</h3>
            <button onClick={handleAddMeal} className={styles.addMealButton}>
              + Add Meal
            </button>
          </div>

          {meals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No meals logged for this date.</p>
              <button onClick={handleAddMeal} className={styles.addMealButtonLarge}>
                Add Your First Meal
              </button>
            </div>
          ) : (
            <div className={styles.mealsList}>
              {meals.map((meal) => (
                <div key={meal.id} className={styles.mealCard}>
                  <div className={styles.mealHeader}>
                    <h4 className={styles.mealDescription}>{meal.description}</h4>
                    <div className={styles.mealActions}>
                      <button
                        onClick={() => handleEditMeal(meal.id)}
                        className={classNames(styles.editBtn, buttonStyles.tertiaryIconBtn)}
                        title="Edit meal"
                      >
                        <MdOutlineEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className={classNames(styles.deleteBtn, buttonStyles.secondaryIconBtn)}
                        title="Delete meal"
                        aria-label="Delete meal"
                      >
                        x
                      </button>
                    </div>
                  </div>
                  <div className={styles.mealMacros}>
                    <span className={styles.macroItem}>
                      <strong>{Number(meal.calories).toFixed(0)}</strong> cal
                    </span>
                    <span className={styles.macroItem}>
                      <strong>{Number(meal.protein).toFixed(1)}</strong>g protein
                    </span>
                    <span className={styles.macroItem}>
                      <strong>{Number(meal.carbs).toFixed(1)}</strong>g carbs
                    </span>
                    <span className={styles.macroItem}>
                      <strong>{Number(meal.fat).toFixed(1)}</strong>g fat
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.summarySection}>
          <h3>Daily Summary</h3>

          {/* Weight Tracking Section */}
          <div className={styles.weightSection}>
            <h4>Weight Tracking</h4>
            {latestWeight && (
              <div className={styles.lastKnownWeight}>
                <span className={styles.weightLabel}>Last Known Weight:</span>
                <span className={styles.weightValue}>{latestWeight.weight.toFixed(1)} kg</span>
                <span className={styles.weightDate}>(as of {formatDate(latestWeight.date)})</span>
              </div>
            )}
            <div className={styles.weightInputGroup}>
              <label htmlFor="weight-input">Weight (kg) for {formatDate(selectedDate)}:</label>
              <div className={styles.weightInputRow}>
                <input
                  id="weight-input"
                  name="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="Enter weight"
                  className={styles.weightInput}
                  aria-label="Weight (kg)"
                />
                <button
                  onClick={handleSaveWeight}
                  disabled={savingWeight || !weightInput.trim()}
                  className={styles.saveWeightButton}
                >
                  {savingWeight ? 'Saving...' : 'Save Weight'}
                </button>
              </div>
              {weightError && <div className={styles.weightError}>{weightError}</div>}
              {weightEntry && (
                <div className={styles.currentWeight}>
                  Current weight: {weightEntry.weight.toFixed(1)} kg
                </div>
              )}
            </div>
          </div>

          {/* Daily Totals Section */}
          <h4>Daily Totals</h4>
          <div className={styles.totalsCard}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Calories:</span>
              <span className={styles.totalValue}>{dailyTotals.calories.toFixed(0)}</span>
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Protein:</span>
              <span className={styles.totalValue}>{dailyTotals.protein.toFixed(1)}g</span>
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Carbs:</span>
              <span className={styles.totalValue}>{dailyTotals.carbs.toFixed(1)}g</span>
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Fat:</span>
              <span className={styles.totalValue}>{dailyTotals.fat.toFixed(1)}g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NutritionPage;
