import { eq, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

export type DbUser = typeof users.$inferSelect;

export async function createUser(payload: { username: string; email: string; passwordHash: string; role?: string }) {
  const [user] = await db
    .insert(users)
    .values({
      username: payload.username,
      email: payload.email,
      passwordHash: payload.passwordHash,
      role: payload.role ?? 'user',
    })
    .returning();
  return user;
}

export async function findUserByUsername(username: string): Promise<DbUser | undefined> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0];
}

export async function findUserById(id: number): Promise<DbUser | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function upsertTelegramUser(telegramId?: number, username?: string): Promise<DbUser> {
  if (!telegramId && !username) {
    const [user] = await db
      .insert(users)
      .values({ telegramId: undefined, username: username ?? null })
      .returning();
    return user;
  }

  const existing = await db
    .select()
    .from(users)
    .where(
      telegramId && username
        ? or(eq(users.telegramId, String(telegramId)), eq(users.username, username))
        : telegramId
          ? eq(users.telegramId, String(telegramId))
          : username
            ? eq(users.username, username)
            : undefined!,
    )
    .limit(1);

  if (existing.length) {
    const [user] = await db
      .update(users)
      .set({ username: username ?? existing[0].username })
      .where(eq(users.id, existing[0].id))
      .returning();
    return user;
  }

  const [created] = await db
    .insert(users)
    .values({ telegramId: telegramId ? String(telegramId) : null, username: username ?? null })
    .returning();
  return created;
}

export async function getUserByTelegram(telegramId?: number, username?: string): Promise<DbUser | undefined> {
  if (!telegramId && !username) return undefined;
  const existing = await db
    .select()
    .from(users)
    .where(
      telegramId && username
        ? or(eq(users.telegramId, String(telegramId)), eq(users.username, username))
        : telegramId
          ? eq(users.telegramId, String(telegramId))
          : username
            ? eq(users.username, username)
            : undefined!,
    )
    .limit(1);
  return existing[0];
}

export async function incrementPurchases(userId?: number): Promise<void> {
  if (!userId) return;
  await db
    .update(users)
    .set({ purchaseCount: users.purchaseCount.plus(1) })
    .where(eq(users.id, userId));
}

export async function listUsers(): Promise<DbUser[]> {
  return db.select().from(users);
}
