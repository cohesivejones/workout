import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'An error occurred');
  }
);

export const fetchWorkouts = () => api.get('/workouts');

export const fetchExercises = () => api.get('/exercises');

export const createWorkout = (workout) => api.post('/workouts', workout);

export const createExercise = (exerciseName) => api.post('/exercises', { name: exerciseName });
