import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { fetchMealsByDate, deleteMeal } from '../api';
import { Meal } from '../types';
import { useUserContext } from '../contexts/useUserContext';
import styles from './NutritionPage.module.css';

function NutritionPage(): React.ReactElement {
  const [, setLocation] = useLocation();
  const { user } = useUserContext();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeals = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const data = await fetchMealsByDate(selectedDate);
        setMeals(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load meals:', err);
        setError('Failed to load meals. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadMeals();
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
    setSelectedDate(new Date().toISOString().split('T')[0]);
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
                        className={styles.editButton}
                        title="Edit meal"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className={styles.deleteButton}
                        title="Delete meal"
                      >
                        Delete
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
          <h3>Daily Totals</h3>
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
