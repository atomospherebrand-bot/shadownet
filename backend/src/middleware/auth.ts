import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

export type AuthenticatedUser = { id?: number; username?: string; role?: string; isEnvAdmin?: boolean };
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

export function createToken(payload: AuthenticatedUser) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export async function verifyAdminCredentials(username: string, password: string) {
  if (username !== config.adminUser) return false;
  if (config.adminPasswordHash) {
    return bcrypt.compare(password, config.adminPasswordHash);
  }
  return password === config.adminPassword;
}

function parseTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.replace('Bearer ', '');
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = Object.fromEntries(cookieHeader.split(';').map((c) => c.trim().split('=')));
    if (cookies.token) return cookies.token;
  }
  return null;
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = parseTokenFromRequest(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    req.user = payload;
  } catch (err) {
    // ignore invalid token and continue unauthenticated
  }
  return next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = parseTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = parseTokenFromRequest(req);
  if (!token) return res.status(401).json({ message: 'Требуется авторизация' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    if (payload.role === 'admin' || payload.isEnvAdmin) {
      req.user = payload;
      return next();
    }
  } catch (err) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
  return res.status(403).json({ message: 'Недостаточно прав' });
}
