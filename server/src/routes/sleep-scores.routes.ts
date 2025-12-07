import { Router, Request, Response } from 'express';
import dataSource from '../data-source';
import { SleepScore } from '../entities';
import { authenticateToken } from '../middleware/auth';
import { CreateSleepScoreRequest, DatabaseError } from '../types';
import logger from '../logger';

const router = Router();

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const sleepScore = await dataSource.getRepository(SleepScore).findOne({ where: { id } });
    if (!sleepScore) return res.status(404).json({ error: 'Sleep score not found' });
    res.json(sleepScore);
  } catch (err) {
    logger.error('Get sleep score error', {
      error: err,
      sleepScoreId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { date, score, notes } = req.body as CreateSleepScoreRequest;
    const userId = req.user!.id;
    if (score < 1 || score > 5)
      return res.status(400).json({ error: 'Sleep score must be between 1 and 5' });
    const repo = dataSource.getRepository(SleepScore);
    const sleepScore = repo.create({ userId, date, score, notes: notes || null });
    await repo.save(sleepScore);
    logger.info('Sleep score created', {
      sleepScoreId: sleepScore.id,
      date: sleepScore.date,
      score: sleepScore.score,
      userId: req.user?.id,
    });
    res.json(sleepScore);
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Create sleep score error', { error: err, userId: req.user?.id });
    if (error.code === '23505' && error.constraint === 'UQ_sleep_scores_userId_date') {
      res.status(400).json({ error: 'A sleep score already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { date, score, notes } = req.body as Omit<CreateSleepScoreRequest, 'userId'>;
    if (score < 1 || score > 5)
      return res.status(400).json({ error: 'Sleep score must be between 1 and 5' });
    const repo = dataSource.getRepository(SleepScore);
    const sleepScore = await repo.findOne({ where: { id } });
    if (!sleepScore) return res.status(404).json({ error: 'Sleep score not found' });
    sleepScore.date = date;
    sleepScore.score = score;
    sleepScore.notes = notes || null;
    await repo.save(sleepScore);
    logger.info('Sleep score updated', {
      sleepScoreId: sleepScore.id,
      date: sleepScore.date,
      score: sleepScore.score,
      userId: req.user?.id,
    });
    res.json(sleepScore);
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Update sleep score error', {
      error: err,
      sleepScoreId: req.params.id,
      userId: req.user?.id,
    });
    if (error.code === '23505' && error.constraint === 'UQ_sleep_scores_userId_date') {
      res.status(400).json({ error: 'A sleep score already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repo = dataSource.getRepository(SleepScore);
    const sleepScore = await repo.findOne({ where: { id } });
    if (!sleepScore) return res.status(404).json({ error: 'Sleep score not found' });
    await repo.remove(sleepScore);
    logger.info('Sleep score deleted', { sleepScoreId: id, userId: req.user?.id });
    res.json({ id });
  } catch (err) {
    logger.error('Delete sleep score error', {
      error: err,
      sleepScoreId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
