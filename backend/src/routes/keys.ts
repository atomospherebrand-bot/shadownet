import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accessKeys } from '../db/schema.js';
import { getAvailableKey, releaseReservation, reserveKey, sellKey } from '../services/keyService.js';
import { requireAuth } from '../middleware/auth.js';

export const keysRouter = Router();

keysRouter.get('/', requireAuth, async (_req: Request, res: Response) => {
  const keys = await db.select().from(accessKeys);
  res.json(keys);
});

keysRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const [key] = await db.insert(accessKeys).values({ status: 'available', ...req.body }).returning();
  res.status(201).json(key);
});

keysRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const current = await db.select().from(accessKeys).where(eq(accessKeys.id, id)).limit(1);
  if (!current.length) {
    return res.status(404).json({ message: 'Ключ не найден' });
  }
  if (current[0].status === 'sold' && req.body.status && req.body.status !== 'sold') {
    return res.status(400).json({ message: 'Проданные ключи нельзя возвращать в оборот' });
  }

  const [updated] = await db
    .update(accessKeys)
    .set({
      type: req.body.type ?? current[0].type,
      label: req.body.label ?? current[0].label,
      rawUri: req.body.rawUri ?? current[0].rawUri,
      qrImageUrl: req.body.qrImageUrl ?? current[0].qrImageUrl,
      tariffId: req.body.tariffId ?? current[0].tariffId,
      validDays: req.body.validDays ?? current[0].validDays,
      notes: req.body.notes ?? current[0].notes,
      status: req.body.status ?? current[0].status,
    })
    .where(eq(accessKeys.id, id))
    .returning();
  res.json(updated);
});

keysRouter.get('/available', async (req: Request, res: Response) => {
  const tariffId = req.query.tariff_id ? Number(req.query.tariff_id) : undefined;
  const key = await getAvailableKey(tariffId);
  if (!key) {
    return res.status(404).json({ message: 'Нет свободных ключей' });
  }
  res.json(key);
});

keysRouter.post('/reserve', async (req: Request, res: Response) => {
  const { tariffId } = req.body as { tariffId: number };
  const key = await reserveKey(tariffId);
  if (!key) {
    return res.status(404).json({ message: 'Нет свободных ключей' });
  }
  res.json(key);
});

keysRouter.post('/sell', async (req: Request, res: Response) => {
  const { keyId, userId, channel } = req.body as {
    keyId: number;
    userId?: number;
    channel?: 'web' | 'telegram';
  };
  const key = await sellKey(keyId, { userId, channel });
  if (!key) {
    return res.status(404).json({ message: 'Ключ не найден' });
  }
  res.json(key);
});

keysRouter.post('/release', async (req: Request, res: Response) => {
  const { keyId } = req.body as { keyId: number };
  const released = await releaseReservation(keyId);
  if (!released) {
    return res.status(404).json({ message: 'Нет брони' });
  }
  res.json(released);
});
