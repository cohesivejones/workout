import { Router, Request, Response } from "express";
import dataSource from "../data-source";
import { Exercise, WorkoutExercise } from "../entities";
import { authenticateToken } from "../middleware/auth";
import logger from "../logger";

const router = Router();

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercises = await exerciseRepository.find({ where: { userId }, order: { name: "ASC" } });
    res.json(exercises);
  } catch (err) {
    logger.error("Get exercises error", { error: err, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/recent", authenticateToken, async (req: Request, res: Response) => {
  const { exerciseId } = req.query;
  const userId = req.user!.id;
  if (!exerciseId) return res.status(400).json({ error: "Exercise ID is required" });

  try {
    const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);
    const result = await workoutExerciseRepository.query(
      `\n      WITH latest_workout AS (\n        SELECT w.id\n        FROM workouts w\n        JOIN workout_exercises we ON w.id = we.workout_id\n        WHERE we.exercise_id = $1\n        AND w."userId" = $2\n        ORDER BY w.date DESC\n        LIMIT 1\n      )\n      SELECT we.reps, we.weight, we.time_seconds\n      FROM workout_exercises we\n      WHERE we.workout_id = (SELECT id FROM latest_workout)\n      AND we.exercise_id = $1\n    `,
      [Number(exerciseId), Number(userId)]
    );
    if (!result || result.length === 0) return res.status(404).json({ error: "No workout found with this exercise" });
    res.json({ reps: result[0].reps, weight: result[0].weight, time_seconds: result[0].time_seconds });
  } catch (err) {
    logger.error("Get recent exercise error", { error: err, exerciseId: req.query.exerciseId, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    let exercise = await exerciseRepository.findOne({ where: { name, userId } });
    if (!exercise) exercise = exerciseRepository.create({ name, userId });
    await exerciseRepository.save(exercise);
    logger.info("Exercise created/updated", { exerciseId: exercise.id, name: exercise.name, userId: req.user?.id });
    res.json(exercise);
  } catch (err) {
    logger.error("Create exercise error", { error: err, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Exercise name is required" });
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({ where: { id: exerciseId } });
    if (!exercise) return res.status(404).json({ error: "Exercise not found" });
    exercise.name = name;
    await exerciseRepository.save(exercise);
    logger.info("Exercise updated", { exerciseId: exercise.id, name: exercise.name, userId: req.user?.id });
    res.json(exercise);
  } catch (err) {
    logger.error("Update exercise error", { error: err, exerciseId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/suggest", authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({ where: { id: exerciseId, userId } });
    
    if (!exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    // AI suggestion logic: generate variations of the exercise name
    const suggestions = generateExerciseSuggestions(exercise.name);
    const suggestedName = suggestions[0]; // Return the first suggestion

    logger.info("Exercise name suggestion generated", { 
      exerciseId: exercise.id, 
      originalName: exercise.name, 
      suggestedName,
      userId 
    });

    res.json({ suggestedName });
  } catch (err) {
    logger.error("Suggest exercise name error", { error: err, exerciseId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

// Helper function to generate exercise name suggestions
function generateExerciseSuggestions(currentName: string): string[] {
  const name = currentName.toLowerCase().trim();
  
  // Common exercise variations and improvements
  const variations: Record<string, string[]> = {
    'bench': ['Barbell Bench Press', 'Flat Bench Press', 'Bench Press (Barbell)'],
    'squat': ['Barbell Back Squat', 'Back Squat', 'Squat (Barbell)'],
    'deadlift': ['Conventional Deadlift', 'Barbell Deadlift', 'Deadlift (Barbell)'],
    'press': ['Overhead Press', 'Military Press', 'Shoulder Press'],
    'row': ['Barbell Row', 'Bent Over Row', 'Barbell Bent Over Row'],
    'curl': ['Barbell Curl', 'Bicep Curl (Barbell)', 'Standing Barbell Curl'],
    'pullup': ['Pull-Up', 'Bodyweight Pull-Up', 'Wide Grip Pull-Up'],
    'chinup': ['Chin-Up', 'Bodyweight Chin-Up', 'Close Grip Chin-Up'],
    'dip': ['Parallel Bar Dips', 'Bodyweight Dips', 'Chest Dips'],
    'lunge': ['Walking Lunges', 'Dumbbell Lunges', 'Forward Lunges'],
  };

  // Check if the name contains any keywords
  for (const [keyword, suggestions] of Object.entries(variations)) {
    if (name.includes(keyword)) {
      // Filter out suggestions that are too similar to current name
      const filtered = suggestions.filter(s => s.toLowerCase() !== name);
      if (filtered.length > 0) return filtered;
    }
  }

  // Generic improvements if no specific match
  if (name.length < 3) {
    return [currentName]; // Too short, don't modify
  }

  // Capitalize properly
  const words = currentName.split(' ');
  const capitalized = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  // If already well-formatted, add descriptive modifiers
  if (capitalized === currentName) {
    return [
      `Barbell ${currentName}`,
      `Dumbbell ${currentName}`,
      `${currentName} (Machine)`,
    ];
  }

  return [capitalized];
}

export default router;
