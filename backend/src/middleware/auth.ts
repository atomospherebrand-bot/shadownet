import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

export type AuthenticatedRequest = Request & { user?: { username: string } };

export function createToken(username: string) {
  return jwt.sign({ username }, config.jwtSecret, { expiresIn: '7d' });
}

export async function verifyCredentials(username: string, password: string) {
  if (username !== config.adminUser) return false;
  if (config.adminPasswordHash) {
    return bcrypt.compare(password, config.adminPasswordHash);
  }
  return password === config.adminPassword;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { username: string };
    req.user = { username: payload.username };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
}
