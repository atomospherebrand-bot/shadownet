import { Router, Request, Response } from 'express';
import { createToken, verifyCredentials } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ message: 'Укажите логин и пароль' });
  }

  const ok = await verifyCredentials(username, password);
  if (!ok) {
    return res.status(401).json({ message: 'Неверные данные' });
  }

  const token = createToken(username);
  return res.json({ token });
});
