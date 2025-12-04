import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accessKeys, tariffs } from '../db/schema.js';
import { createPayment } from '../services/paymentService.js';
import { upsertTelegramUser, getUserByTelegram } from '../services/userService.js';
import { getBotMessages } from '../services/settingsService.js';

export const botRouter = Router();

botRouter.post('/users', async (req: Request, res: Response) => {
  const { telegram_id: telegramId, username } = req.body as { telegram_id?: number; username?: string };
  const user = await upsertTelegramUser(telegramId, username);
  res.json({ message: 'Пользователь зарегистрирован', user });
});

botRouter.get('/tariffs', async (_req: Request, res: Response) => {
  const data = await db.select().from(tariffs).where(eq(tariffs.active, true));
  res.json(data);
});

botRouter.post('/payments/create', async (req: Request, res: Response) => {
  const { tariffId, telegramId, username } = req.body as {
    tariffId: number;
    telegramId?: number;
    username?: string;
  };
  try {
    const user = await upsertTelegramUser(telegramId, username);
    const result = await createPayment({ tariffId, channel: 'telegram', userId: user.id });
    res.json({
      ...result.payment,
      reservedKeyId: result.reservedKeyId,
      reservedUntil: result.reservedUntil,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

botRouter.get('/keys/mine', async (req: Request, res: Response) => {
  const telegramId = req.query.telegram_id ? Number(req.query.telegram_id) : undefined;
  const username = req.query.username as string | undefined;
  const user = await getUserByTelegram(telegramId, username);
  if (!user) return res.json([]);
  const keys = await db
    .select()
    .from(accessKeys)
    .where(eq(accessKeys.soldToUser, user.id));
  res.json(keys);
});

botRouter.get('/messages/:key', async (req: Request, res: Response) => {
  const messages = await getBotMessages();
  const message = messages.find((m) => m.key === req.params.key);
  if (!message) {
    return res.status(404).json({ message: 'Текст не найден' });
  }
  res.json(message);
});
