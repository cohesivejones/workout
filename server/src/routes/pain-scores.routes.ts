import { Router, Request, Response } from 'express';
import dataSource from '../data-source';
import { PainScore } from '../entities';
import { authenticateToken } from '../middleware/auth';
import { CreatePainScoreRequest, DatabaseError } from '../types';
import logger from '../logger';

const router = Router();

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repo = dataSource.getRepository(PainScore);
    const painScore = await repo.findOne({ where: { id } });
    if (!painScore) return res.status(404).json({ error: 'Pain score not found' });
    res.json(painScore);
  } catch (err) {
    logger.error('Get pain score error', {
      error: err,
      painScoreId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { date, score, notes } = req.body as CreatePainScoreRequest;
    const userId = req.user!.id;
    if (score < 0 || score > 10)
      return res.status(400).json({ error: 'Pain score must be between 0 and 10' });
    const repo = dataSource.getRepository(PainScore);
    const painScore = repo.create({ userId, date, score, notes: notes || null });
    await repo.save(painScore);
    logger.info('Pain score created', {
      painScoreId: painScore.id,
      date: painScore.date,
      score: painScore.score,
      userId: req.user?.id,
    });
    res.json(painScore);
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Create pain score error', { error: err, userId: req.user?.id });
    if (error.code === '23505' && error.constraint === 'UQ_pain_scores_userId_date') {
      res.status(400).json({ error: 'A pain score already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { date, score, notes } = req.body as Omit<CreatePainScoreRequest, 'userId'>;
    if (score < 0 || score > 10)
      return res.status(400).json({ error: 'Pain score must be between 0 and 10' });
    const repo = dataSource.getRepository(PainScore);
    const painScore = await repo.findOne({ where: { id } });
    if (!painScore) return res.status(404).json({ error: 'Pain score not found' });
    painScore.date = date;
    painScore.score = score;
    painScore.notes = notes || null;
    await repo.save(painScore);
    logger.info('Pain score updated', {
      painScoreId: painScore.id,
      date: painScore.date,
      score: painScore.score,
      userId: req.user?.id,
    });
    res.json(painScore);
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Update pain score error', {
      error: err,
      painScoreId: req.params.id,
      userId: req.user?.id,
    });
    if (error.code === '23505' && error.constraint === 'UQ_pain_scores_userId_date') {
      res.status(400).json({ error: 'A pain score already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repo = dataSource.getRepository(PainScore);
    const painScore = await repo.findOne({ where: { id } });
    if (!painScore) return res.status(404).json({ error: 'Pain score not found' });
    await repo.remove(painScore);
    logger.info('Pain score deleted', { painScoreId: id, userId: req.user?.id });
    res.json({ id });
  } catch (err) {
    logger.error('Delete pain score error', {
      error: err,
      painScoreId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
