import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import MealForm from '../components/MealForm';
import { createMeal, updateMeal, fetchMeal } from '../api';
import { Meal } from '../types';
import { useUserContext } from '../contexts/useUserContext';
import styles from './MealFormPage.module.css';

function MealFormPage(): React.ReactElement {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useUserContext();
  const [loading, setLoading] = useState<boolean>(!!id);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeal = async () => {
      if (!id || !user) return;

      try {
        const data = await fetchMeal(parseInt(id));
        setMeal(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load meal:', err);
        setError('Failed to load meal. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      loadMeal();
    }
  }, [id, user]);

  const handleMealSubmit = async (mealData: Omit<Meal, 'id'>) => {
    if (!user) return false;

    try {
      if (id) {
        // Update existing meal
        await updateMeal(parseInt(id), mealData);
      } else {
        // Create new meal
        await createMeal(mealData);
      }

      setLocation('/nutrition');
      return true;
    } catch (err) {
      console.error('Failed to save meal:', err);
      return false;
    }
  };

  const handleCancel = () => {
    setLocation('/nutrition');
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.mealFormPage}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <MealForm
        onSubmit={handleMealSubmit}
        existingMeal={meal || undefined}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default MealFormPage;
