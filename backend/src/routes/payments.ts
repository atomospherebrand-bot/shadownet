import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accessKeys, tariffs } from '../db/schema.js';
import { cleanupExpiredReservations } from '../services/keyService.js';
import {
  createPayment,
  findPayment,
  listPayments,
  markPaymentPaid,
  markPaymentPaidByExternalId,
} from '../services/paymentService.js';
import { verifyCallback } from '../services/paymentProviderService.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

export const paymentsRouter = Router();

paymentsRouter.get('/', requireAdmin, async (_req: Request, res: Response) => {
  const data = await listPayments();
  res.json(data);
});

paymentsRouter.post('/create', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { tariffId, channel = 'web', userId } = req.body as {
      tariffId: number;
      channel?: 'web' | 'telegram';
      userId?: number;
    };
    const resolvedUserId = userId ?? (req as any).user?.id;
    const result = await createPayment({ tariffId, channel, userId: resolvedUserId });
    res.status(201).json({
      ...result.payment,
      reservedKeyId: result.reservedKeyId,
      reservedUntil: result.reservedUntil,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

paymentsRouter.get('/:id', async (req: Request, res: Response) => {
  await cleanupExpiredReservations();
  const paymentId = Number(req.params.id);
  const payment = await findPayment(paymentId);
  if (!payment) {
    return res.status(404).json({ message: 'Платёж не найден' });
  }
  const key = payment.soldKeyId
    ? await db.select().from(accessKeys).where(eq(accessKeys.id, payment.soldKeyId)).limit(1)
    : payment.reservedKeyId
      ? await db.select().from(accessKeys).where(eq(accessKeys.id, payment.reservedKeyId)).limit(1)
      : [];
  const tariff = payment.tariffId
    ? await db.select().from(tariffs).where(eq(tariffs.id, payment.tariffId)).limit(1)
    : [];
  res.json({
    ...payment,
    key: key[0],
    tariff: tariff[0],
  });
});

paymentsRouter.post('/callback/:provider', async (req: Request, res: Response) => {
  const provider = req.params.provider as 'crystalpay' | 'enot';
  const { externalId, amount, signature } = req.body as { externalId?: string; amount?: number; signature?: string };
  const isValid = await verifyCallback(provider, { externalId, amount, signature });
  if (!isValid) {
    return res.status(400).json({ message: 'Некорректная подпись callback' });
  }
  const paymentId = req.body.paymentId || req.query.paymentId;
  const result = paymentId
    ? await markPaymentPaid(Number(paymentId))
    : await markPaymentPaidByExternalId(externalId ?? '');
  if (!result.payment) {
    return res.status(404).json({ message: 'Платёж не найден' });
  }
  res.json({ message: 'OK', payment: result.payment, soldKeyId: result.soldKeyId });
});

paymentsRouter.post('/simulate/success/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await markPaymentPaid(id);
  if (!result.payment) return res.status(404).json({ message: 'Платёж не найден' });
  res.json({ message: 'Оплата подтверждена', payment: result.payment, soldKeyId: result.soldKeyId });
});
