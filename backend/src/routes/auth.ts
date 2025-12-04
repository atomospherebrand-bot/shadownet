import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createToken, requireAuth, verifyAdminCredentials } from '../middleware/auth.js';
import { createUser, findUserById, findUserByUsername } from '../services/userService.js';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Укажите логин, email и пароль' });
  }
  const existing = await findUserByUsername(username);
  if (existing) return res.status(409).json({ message: 'Пользователь уже существует' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ username, email, passwordHash, role: 'user' });
  const token = createToken({ id: user.id, username: user.username, role: user.role });
  res
    .cookie('token', token, { httpOnly: true, sameSite: 'lax' })
    .json({ id: user.id, username: user.username, email: user.email, role: user.role });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ message: 'Укажите логин и пароль' });
  }

  const isAdmin = await verifyAdminCredentials(username, password);
  if (isAdmin) {
    const token = createToken({ username, role: 'admin', isEnvAdmin: true });
    return res.cookie('token', token, { httpOnly: true, sameSite: 'lax' }).json({ username, role: 'admin', token });
  }

  const user = await findUserByUsername(username);
  if (!user?.passwordHash) {
    return res.status(401).json({ message: 'Неверные данные' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Неверные данные' });

  const token = createToken({ id: user.id, username: user.username, role: user.role });
  return res
    .cookie('token', token, { httpOnly: true, sameSite: 'lax' })
    .json({ id: user.id, username: user.username, email: user.email, role: user.role, token });
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userPayload = (req as any).user as { id?: number; username?: string; role?: string; isEnvAdmin?: boolean };
  if (userPayload?.isEnvAdmin) {
    return res.json({ username: userPayload.username, role: 'admin' });
  }
  if (!userPayload?.id) return res.status(401).json({ message: 'Не авторизован' });
  const user = await findUserById(userPayload.id);
  if (!user) return res.status(401).json({ message: 'Не авторизован' });
  return res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' }).json({ ok: true });
});
