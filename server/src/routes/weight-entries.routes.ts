import { Router, Request, Response } from 'express';
import dataSource from '../data-source';
import { WeightEntry } from '../entities';
import { authenticateToken } from '../middleware/auth';
import { DatabaseError } from '../types';
import logger from '../logger';

const router = Router();

interface CreateWeightEntryRequest {
  date: string;
  weight: number;
}

// Get weight entry by date
router.get('/by-date', authenticateToken, async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const userId = req.user!.id;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const repo = dataSource.getRepository(WeightEntry);
    const weightEntry = await repo.findOne({ where: { userId, date } });

    if (!weightEntry) {
      return res.status(404).json({ error: 'Weight entry not found for this date' });
    }

    res.json({
      ...weightEntry,
      weight: Number(weightEntry.weight),
    });
  } catch (err) {
    logger.error('Get weight entry by date error', {
      error: err,
      date: req.query.date,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get latest weight entry
router.get('/latest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const repo = dataSource.getRepository(WeightEntry);

    const weightEntry = await repo.findOne({
      where: { userId },
      order: { date: 'DESC' },
    });

    if (!weightEntry) {
      return res.status(404).json({ error: 'No weight entries found' });
    }

    res.json({
      ...weightEntry,
      weight: Number(weightEntry.weight),
    });
  } catch (err) {
    logger.error('Get latest weight entry error', {
      error: err,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create weight entry
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { date, weight } = req.body as CreateWeightEntryRequest;
    const userId = req.user!.id;

    if (weight <= 0) {
      return res.status(400).json({ error: 'Weight must be a positive number' });
    }

    const repo = dataSource.getRepository(WeightEntry);
    const weightEntry = repo.create({ userId, date, weight });
    await repo.save(weightEntry);

    logger.info('Weight entry created', {
      weightEntryId: weightEntry.id,
      date: weightEntry.date,
      weight: weightEntry.weight,
      userId: req.user?.id,
    });
    res.json({
      ...weightEntry,
      weight: Number(weightEntry.weight),
    });
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Create weight entry error', { error: err, userId: req.user?.id });

    if (error.code === '23505' && error.constraint === 'UQ_weight_entries_userId_date') {
      res.status(400).json({ error: 'A weight entry already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

// Update weight entry
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { date, weight } = req.body as CreateWeightEntryRequest;

    if (weight <= 0) {
      return res.status(400).json({ error: 'Weight must be a positive number' });
    }

    const repo = dataSource.getRepository(WeightEntry);
    const weightEntry = await repo.findOne({ where: { id } });

    if (!weightEntry) {
      return res.status(404).json({ error: 'Weight entry not found' });
    }

    weightEntry.date = date;
    weightEntry.weight = weight;
    await repo.save(weightEntry);

    logger.info('Weight entry updated', {
      weightEntryId: weightEntry.id,
      date: weightEntry.date,
      weight: weightEntry.weight,
      userId: req.user?.id,
    });
    res.json({
      ...weightEntry,
      weight: Number(weightEntry.weight),
    });
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Update weight entry error', {
      error: err,
      weightEntryId: req.params.id,
      userId: req.user?.id,
    });

    if (error.code === '23505' && error.constraint === 'UQ_weight_entries_userId_date') {
      res.status(400).json({ error: 'A weight entry already exists for this date' });
    } else {
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

// Delete weight entry
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repo = dataSource.getRepository(WeightEntry);
    const weightEntry = await repo.findOne({ where: { id } });

    if (!weightEntry) {
      return res.status(404).json({ error: 'Weight entry not found' });
    }

    await repo.remove(weightEntry);
    logger.info('Weight entry deleted', { weightEntryId: id, userId: req.user?.id });
    res.json({ id });
  } catch (err) {
    logger.error('Delete weight entry error', {
      error: err,
      weightEntryId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
