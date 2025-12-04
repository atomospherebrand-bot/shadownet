import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { config } from './config/index.js';
import { tariffsRouter } from './routes/tariffs.js';
import { keysRouter } from './routes/keys.js';
import { paymentsRouter } from './routes/payments.js';
import { settingsRouter } from './routes/settings.js';
import { botRouter } from './routes/bot.js';
import { authRouter } from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import { cleanupExpiredReservations } from './services/keyService.js';
import { reportsRouter } from './routes/reports.js';
import { ensureDatabase, seedDefaults } from './db/bootstrap.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('dev'));
app.use(bodyParser.json());

app.get('/api/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/tariffs', tariffsRouter);
app.use('/api/keys', keysRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/bot', botRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin/check', requireAuth, (_req: Request, res: Response) => res.json({ ok: true }));

await ensureDatabase();
await seedDefaults();

app.listen(config.port, () => {
  console.log(`Backend API запущен на порту ${config.port}`);
});

setInterval(() => cleanupExpiredReservations(), 60 * 1000);
