import { db } from '../db/client.js';
import { botMessages, settings, siteTexts } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export type SettingsRow = typeof settings.$inferSelect;
export type BotMessageRow = typeof botMessages.$inferSelect;
export type SiteTextRow = typeof siteTexts.$inferSelect;

export async function getSettings(): Promise<SettingsRow> {
  const rows = await db.select().from(settings).limit(1);
  if (rows.length) return rows[0];
  const [created] = await db.insert(settings).values({ activeProvider: 'crystalpay' }).returning();
  return created;
}

export async function updateSettings(payload: Partial<SettingsRow>): Promise<SettingsRow> {
  const current = await getSettings();
  const [updated] = await db.update(settings).set(payload).where(eq(settings.id, current.id)).returning();
  return updated;
}

export async function getBotMessages(): Promise<BotMessageRow[]> {
  return db.select().from(botMessages);
}

export async function saveBotMessages(next: { key: string; content: string }[]): Promise<BotMessageRow[]> {
  await db.delete(botMessages);
  if (!next.length) return [];
  const inserted = await db.insert(botMessages).values(next).returning();
  return inserted;
}

export async function getSiteTexts(): Promise<SiteTextRow[]> {
  return db.select().from(siteTexts);
}

export async function saveSiteTexts(next: { key: string; content: string }[]): Promise<SiteTextRow[]> {
  await db.delete(siteTexts);
  if (!next.length) return [];
  const inserted = await db.insert(siteTexts).values(next).returning();
  return inserted;
}
