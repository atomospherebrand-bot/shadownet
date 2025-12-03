import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tariffs } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const tariffsRouter = Router();

tariffsRouter.get('/', async (_req: Request, res: Response) => {
  const includeInactive = Boolean(_req.query.all);
  const rows = await db.select().from(tariffs);
  const data = includeInactive ? rows : rows.filter((t) => t.active);
  res.json(data);
});

tariffsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const [tariff] = await db.insert(tariffs).values(req.body).returning();
  res.status(201).json(tariff);
});

tariffsRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await db.select().from(tariffs).where(eq(tariffs.id, id)).limit(1);
  if (!existing.length) {
    return res.status(404).json({ message: 'Тариф не найден' });
  }

  const [updated] = await db
    .update(tariffs)
    .set({
      name: req.body.name ?? existing[0].name,
      description: req.body.description ?? existing[0].description,
      price: req.body.price ?? existing[0].price,
      validDays: req.body.validDays ?? existing[0].validDays,
      protocolType: req.body.protocolType ?? existing[0].protocolType,
      active: req.body.active ?? existing[0].active,
    })
    .where(eq(tariffs.id, id))
    .returning();

  res.json(updated);
});
