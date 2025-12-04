import { pgEnum, pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const keyStatusEnum = pgEnum('key_status', ['available', 'reserved', 'sold', 'disabled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed']);
export const channelEnum = pgEnum('channel', ['web', 'telegram']);

export const tariffs = pgTable('tariffs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  validDays: integer('valid_days').default(30),
  protocolType: text('protocol_type').default('any'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const accessKeys = pgTable('access_keys', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  label: text('label'),
  rawUri: text('raw_uri').notNull(),
  qrImageUrl: text('qr_image_url'),
  status: keyStatusEnum('status').default('available').notNull(),
  tariffId: integer('tariff_id').references(() => tariffs.id),
  validDays: integer('valid_days'),
  notes: text('notes'),
  reservedUntil: timestamp('reserved_until'),
  soldAt: timestamp('sold_at'),
  soldToUser: integer('sold_to_user'),
  channel: channelEnum('channel'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  tariffId: integer('tariff_id').references(() => tariffs.id),
  amount: integer('amount').notNull(),
  provider: text('provider').default('crystalpay'),
  status: paymentStatusEnum('status').default('pending').notNull(),
  channel: channelEnum('channel').default('web'),
  externalId: text('external_id'),
  reservedKeyId: integer('reserved_key_id').references(() => accessKeys.id),
  reservedUntil: timestamp('reserved_until'),
  soldKeyId: integer('sold_key_id').references(() => accessKeys.id),
  payload: text('payload'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id'),
  username: text('username'),
  purchaseCount: integer('purchase_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const botMessages = pgTable('bot_messages', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  content: text('content').notNull(),
});

export const siteTexts = pgTable('site_texts', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  content: text('content').notNull(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  activeProvider: text('active_provider').default('crystalpay'),
  crystalpayShopId: text('crystalpay_shop_id'),
  crystalpaySecret: text('crystalpay_secret'),
  enotShopId: text('enot_shop_id'),
  enotSecret: text('enot_secret'),
  botToken: text('bot_token'),
  botName: text('bot_name'),
  adminChatId: text('admin_chat_id'),
  termsUrl: text('terms_url'),
  privacyUrl: text('privacy_url'),
  downloadsUrl: text('downloads_url'),
  supportEmail: text('support_email'),
  supportTelegram: text('support_telegram'),
  supportChatUrl: text('support_chat_url'),
});
