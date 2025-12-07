import { Router, Request, Response } from 'express';
import { Between } from 'typeorm';
import dataSource from '../data-source';
import { Workout, PainScore, SleepScore } from '../entities';
import { authenticateToken } from '../middleware/auth';
import { openai } from '../services/openai';
import logger from '../logger';

const router = Router();

router.get('/data', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const workoutRepository = dataSource.getRepository(Workout);
    const painScoreRepository = dataSource.getRepository(PainScore);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    const [workouts, painScores, sleepScores] = await Promise.all([
      workoutRepository.find({
        where: { userId: Number(userId), date: Between(startDateStr, endDateStr) },
        relations: { workoutExercises: { exercise: true } },
        order: { date: 'ASC' },
      }),
      painScoreRepository.find({
        where: { userId: Number(userId), date: Between(startDateStr, endDateStr) },
        order: { date: 'ASC' },
      }),
      sleepScoreRepository.find({
        where: { userId: Number(userId), date: Between(startDateStr, endDateStr) },
        order: { date: 'ASC' },
      }),
    ]);

    const diagnosticData = {
      workouts: workouts.map((workout) => ({
        id: workout.id,
        date: workout.date,
        exercises: workout.workoutExercises.map((we) => ({
          name: we.exercise.name,
          reps: we.reps,
          weight: we.weight,
        })),
      })),
      painScores,
      sleepScores,
      dateRange: { start: startDateStr, end: endDateStr },
    };

    res.json(diagnosticData);
  } catch (err) {
    logger.error('Get diagnostic data error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/analyze', authenticateToken, async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { diagnosticData } = req.body as { diagnosticData: any };
    if (!diagnosticData) return res.status(400).json({ error: 'Diagnostic data is required' });

    const systemPrompt = `You are a fitness and health analysis assistant. Your task is to analyze workout and pain data to identify potential correlations between specific exercises and reported pain. Focus on patterns where pain scores increase after certain exercises are performed. Consider frequency, intensity, and timing of exercises relative to pain reports.`;

    const userPrompt = `I'm providing two months of workout, pain, and sleep data. Please analyze this data to identify which exercises might be causing recurring pain and how sleep quality might be affecting pain levels.\n\nWorkout Data:\n${JSON.stringify(diagnosticData.workouts, null, 2)}\n\nPain Score Data:\n${JSON.stringify(diagnosticData.painScores, null, 2)}\n\nSleep Score Data:\n${JSON.stringify(diagnosticData.sleepScores, null, 2)}\n\nDate Range: ${diagnosticData.dateRange.start} to ${diagnosticData.dateRange.end}\n\nPlease provide a detailed analysis of potential correlations between specific exercises, sleep quality, and pain, with recommendations for exercises that might need modification or should be avoided.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    logger.info('Diagnostic analysis completed', { userId: req.user?.id });
    res.json({ analysis: response.choices[0].message.content });
  } catch (err) {
    logger.error('OpenAI API error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to analyze diagnostic data' });
  }
});

export default router;
