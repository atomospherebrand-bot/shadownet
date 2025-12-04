import { Router, Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { accessKeys, payments, tariffs } from '../db/schema.js';

export const userRouter = Router();

userRouter.get('/subscriptions/current', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Не авторизован' });

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.status, 'paid')))
    .orderBy(desc(payments.updatedAt), desc(payments.createdAt))
    .limit(1);

  if (!payment) return res.json(null);

  const [tariff] = await db.select().from(tariffs).where(eq(tariffs.id, payment.tariffId ?? 0)).limit(1);
  if (!tariff) return res.json(null);

  const startDate = payment.updatedAt ?? payment.createdAt ?? new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (tariff.validDays ?? 0));

  res.json({
    id: payment.id,
    planName: tariff.name,
    amount: payment.amount,
    startDate,
    endDate,
    status: endDate > new Date() ? 'active' : 'expired',
  });
});

userRouter.get('/configs/user', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Не авторизован' });

  const rows = await db.select().from(accessKeys).where(eq(accessKeys.soldToUser, userId));
  const mapped = rows.map((k) => ({
    id: k.id,
    name: k.label ?? `Конфиг #${k.id}`,
    type: k.type,
    configText: k.rawUri,
    qrCodeUrl: k.qrImageUrl,
  }));
  res.json(mapped);
});
