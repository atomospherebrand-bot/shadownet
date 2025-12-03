import { and, eq, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accessKeys, payments } from '../db/schema.js';

export type DbAccessKey = typeof accessKeys.$inferSelect;

const RESERVATION_TTL_MINUTES = 15;

function now(): number {
  return Date.now();
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export async function cleanupExpiredReservations(currentTs: number = now()): Promise<void> {
  const expiresAt = new Date(currentTs);
  await db
    .update(accessKeys)
    .set({ status: 'available', reservedUntil: null, notes: null })
    .where(and(eq(accessKeys.status, 'reserved'), lte(accessKeys.reservedUntil, expiresAt)));

  await db
    .update(payments)
    .set({ reservedKeyId: null, reservedUntil: null })
    .where(and(eq(payments.status, 'pending'), lte(payments.reservedUntil, expiresAt)));
}

async function findAvailableByTariff(tariffId?: number): Promise<DbAccessKey | undefined> {
  await cleanupExpiredReservations();
  const keys = await db
    .select()
    .from(accessKeys)
    .where(
      tariffId
        ? and(eq(accessKeys.status, 'available'), eq(accessKeys.tariffId, tariffId))
        : eq(accessKeys.status, 'available'),
    )
    .orderBy(accessKeys.id)
    .limit(1);
  return keys[0];
}

export async function reserveKey(tariffId?: number): Promise<DbAccessKey | undefined> {
  const key = await findAvailableByTariff(tariffId);
  if (!key) return undefined;
  const expiresAtIso = toIso(now() + RESERVATION_TTL_MINUTES * 60 * 1000);
  const [updated] = await db
    .update(accessKeys)
    .set({ status: 'reserved', reservedUntil: new Date(expiresAtIso), notes: `Зарезервирован до ${expiresAtIso}` })
    .where(eq(accessKeys.id, key.id))
    .returning();
  return updated;
}

export async function sellKey(
  keyId: number,
  {
    userId,
    channel,
  }: {
    userId?: number;
    channel?: DbAccessKey['channel'];
  },
): Promise<DbAccessKey | undefined> {
  await cleanupExpiredReservations();
  const existing = await db
    .select()
    .from(accessKeys)
    .where(eq(accessKeys.id, keyId))
    .limit(1);
  if (!existing.length || existing[0].status === 'sold' || existing[0].status === 'disabled') return undefined;

  const [updated] = await db
    .update(accessKeys)
    .set({
      status: 'sold',
      channel,
      soldToUser: userId,
      soldAt: new Date(),
      reservedUntil: null,
      notes: null,
    })
    .where(eq(accessKeys.id, keyId))
    .returning();
  return updated;
}

export async function getAvailableKey(tariffId?: number): Promise<DbAccessKey | undefined> {
  return findAvailableByTariff(tariffId);
}

export async function releaseReservation(keyId: number): Promise<DbAccessKey | undefined> {
  await cleanupExpiredReservations();
  const key = await db
    .select()
    .from(accessKeys)
    .where(and(eq(accessKeys.id, keyId), eq(accessKeys.status, 'reserved')))
    .limit(1);
  if (!key.length) return undefined;
  const [updated] = await db
    .update(accessKeys)
    .set({ status: 'available', reservedUntil: null, notes: null })
    .where(eq(accessKeys.id, keyId))
    .returning();
  return updated;
}
