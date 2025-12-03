import { and, desc, eq, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { payments, tariffs } from '../db/schema.js';
import { reserveKey, sellKey } from './keyService.js';
import { getSettings } from './settingsService.js';
import { createInvoice } from './paymentProviderService.js';
import { incrementPurchases } from './userService.js';

export type DbPayment = typeof payments.$inferSelect;

export async function listPayments(): Promise<DbPayment[]> {
  return db.select().from(payments).orderBy(desc(payments.id));
}

export async function findPayment(id: number): Promise<DbPayment | undefined> {
  const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return rows[0];
}

export async function findPaymentByExternalId(externalId: string): Promise<DbPayment | undefined> {
  const rows = await db.select().from(payments).where(eq(payments.externalId, externalId)).limit(1);
  return rows[0];
}

export async function createPayment({
  tariffId,
  channel,
  userId,
}: {
  tariffId: number;
  channel: 'web' | 'telegram';
  userId?: number;
}): Promise<{ payment: DbPayment; reservedKeyId?: number; reservedUntil?: string; paymentUrl: string }> {
  const tariffRow = await db.select().from(tariffs).where(eq(tariffs.id, tariffId)).limit(1);
  if (!tariffRow.length) {
    throw new Error('Тариф не найден');
  }
  const tariff = tariffRow[0];
  const settings = await getSettings();
  const activeProvider = settings.activeProvider ?? 'crystalpay';
  const reservedKey = await reserveKey(tariffId);
  const reservedUntil = reservedKey?.reservedUntil?.toISOString();
  const externalId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const invoice = await createInvoice({
    amount: tariff.price,
    tariffName: tariff.name,
    externalId,
    provider: (activeProvider as 'crystalpay' | 'enot') ?? 'crystalpay',
  });

  const [payment] = await db
    .insert(payments)
    .values({
      tariffId,
      amount: tariff.price,
      provider: activeProvider,
      status: 'pending',
      channel,
      externalId,
      payload: JSON.stringify(invoice.payload),
      userId,
      reservedKeyId: reservedKey?.id,
      reservedUntil: reservedKey?.reservedUntil,
    })
    .returning();

  return { payment, reservedKeyId: reservedKey?.id, reservedUntil, paymentUrl: invoice.paymentUrl };
}

export async function markPaymentPaid(paymentId: number): Promise<{ payment?: DbPayment; soldKeyId?: number }> {
  const payment = await findPayment(paymentId);
  if (!payment) return {};
  if (payment.status === 'paid') return { payment };

  const soldKey = payment.reservedKeyId
    ? await sellKey(payment.reservedKeyId, { userId: payment.userId, channel: payment.channel ?? undefined })
    : undefined;

  const [updated] = await db
    .update(payments)
    .set({ status: 'paid', soldKeyId: soldKey?.id ?? payment.soldKeyId })
    .where(eq(payments.id, paymentId))
    .returning();

  await incrementPurchases(payment.userId);

  return { payment: updated, soldKeyId: soldKey?.id ?? payment.soldKeyId };
}

export async function markPaymentPaidByExternalId(externalId: string): Promise<{ payment?: DbPayment; soldKeyId?: number }> {
  const payment = await findPaymentByExternalId(externalId);
  if (!payment) return {};
  return markPaymentPaid(payment.id);
}

export async function cleanupExpiredPaymentReservations(nowTs: number): Promise<void> {
  const cutoff = new Date(nowTs);
  await db
    .update(payments)
    .set({ reservedKeyId: null, reservedUntil: null })
    .where(and(eq(payments.status, 'pending'), lte(payments.reservedUntil, cutoff)));
}
