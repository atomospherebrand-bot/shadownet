import { Router, Request, Response } from 'express';
import { getSettings, updateSettings, getBotMessages, getSiteTexts, saveBotMessages, saveSiteTexts } from '../services/settingsService.js';
import { requireAuth } from '../middleware/auth.js';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req: Request, res: Response) => {
  const data = await getSettings();
  res.json(data);
});

settingsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const updated = await updateSettings(req.body);
  res.json(updated);
});

settingsRouter.get('/texts', async (_req: Request, res: Response) => {
  const botMessages = await getBotMessages();
  const siteTexts = await getSiteTexts();
  res.json({ botMessages, siteTexts });
});

settingsRouter.post('/texts/bot', requireAuth, async (req: Request, res: Response) => {
  const saved = await saveBotMessages(req.body);
  res.json(saved);
});

settingsRouter.post('/texts/site', requireAuth, async (req: Request, res: Response) => {
  const saved = await saveSiteTexts(req.body);
  res.json(saved);
});
