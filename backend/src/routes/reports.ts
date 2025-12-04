import { Router, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accessKeys, payments } from '../db/schema.js';
import { requireAdmin } from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', requireAdmin, async (_req: Request, res: Response) => {
  const keyStats = await db.execute(
    sql`SELECT status, COUNT(*)::int AS total FROM ${accessKeys} GROUP BY status;`,
  );
  const paymentsStats = await db.execute(
    sql`SELECT status, COUNT(*)::int AS total, SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)::int AS revenue FROM ${payments} GROUP BY status;`,
  );
  const revenueByChannel = await db.execute(
    sql`SELECT channel, SUM(amount)::int AS revenue FROM ${payments} WHERE status = 'paid' GROUP BY channel;`,
  );
  res.json({
    keys: Object.fromEntries(keyStats.rows.map((r: any) => [r.status, r.total])),
    payments: Object.fromEntries(paymentsStats.rows.map((r: any) => [r.status, r.total])),
    revenueByChannel: Object.fromEntries(revenueByChannel.rows.map((r: any) => [r.channel, r.revenue])),
    totalRevenue: paymentsStats.rows.reduce((acc: number, r: any) => acc + (r.revenue || 0), 0),
  });
});
