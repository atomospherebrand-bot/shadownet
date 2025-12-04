import { sql } from 'drizzle-orm';
import { db } from './client.js';

export async function ensureDatabase() {
  await db.execute(sql`CREATE TYPE IF NOT EXISTS key_status AS ENUM ('available', 'reserved', 'sold', 'disabled');`);
  await db.execute(sql`CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'paid', 'failed');`);
  await db.execute(sql`CREATE TYPE IF NOT EXISTS channel AS ENUM ('web', 'telegram');`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tariffs (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      valid_days INTEGER DEFAULT 30,
      protocol_type TEXT DEFAULT 'any',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS access_keys (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT,
      raw_uri TEXT NOT NULL,
      qr_image_url TEXT,
      status key_status DEFAULT 'available' NOT NULL,
      tariff_id INTEGER REFERENCES tariffs(id),
      valid_days INTEGER,
      notes TEXT,
      reserved_until TIMESTAMP,
      sold_at TIMESTAMP,
      sold_to_user INTEGER,
      channel channel,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      tariff_id INTEGER REFERENCES tariffs(id),
      amount INTEGER NOT NULL,
      provider TEXT DEFAULT 'crystalpay',
      status payment_status DEFAULT 'pending' NOT NULL,
      channel channel DEFAULT 'web',
      external_id TEXT,
      reserved_key_id INTEGER REFERENCES access_keys(id),
      reserved_until TIMESTAMP,
      sold_key_id INTEGER REFERENCES access_keys(id),
      payload TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT,
      username TEXT,
      purchase_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bot_messages (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_texts (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      active_provider TEXT DEFAULT 'crystalpay',
      crystalpay_shop_id TEXT,
      crystalpay_secret TEXT,
      enot_shop_id TEXT,
      enot_secret TEXT,
      bot_token TEXT,
      bot_name TEXT,
      admin_chat_id TEXT,
      terms_url TEXT,
      privacy_url TEXT,
      downloads_url TEXT,
      support_email TEXT,
      support_telegram TEXT,
      support_chat_url TEXT
    );
  `);
}

export async function seedDefaults() {
  const [{ count: tariffCount }] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM tariffs;`)).rows as { count: number }[];
  if (tariffCount === 0) {
    await db.execute(sql`INSERT INTO tariffs (name, description, price, valid_days, protocol_type, active) VALUES
      ('Shadow Basic', 'VLESS, 7 дней, один регион', 299, 7, 'vless', true),
      ('Shadow Pro', 'VLESS или Shadowsocks, 30 дней, все регионы', 999, 30, 'any', true)
    ;`);
  }

  const [{ count: keyCount }] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM access_keys;`)).rows as { count: number }[];
  if (keyCount === 0) {
    await db.execute(sql`INSERT INTO access_keys (type, label, raw_uri, status, tariff_id) VALUES
      ('vless', 'VLESS NL #1', 'vless://example@nl.server:443?security=tls', 'available', 2),
      ('shadowsocks', 'SS SG #1', 'ss://base64@sg.server:8388', 'available', 2)
    ;`);
  }

  const [{ count: settingsCount }] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM settings;`)).rows as { count: number }[];
  if (settingsCount === 0) {
    await db.execute(sql`INSERT INTO settings (active_provider, crystalpay_shop_id, bot_name, terms_url, privacy_url, downloads_url, support_email, support_telegram)
      VALUES ('crystalpay', 'demo-shop', 'ShadowNetBot', 'https://shadownet.live/terms', 'https://shadownet.live/privacy', 'https://hiddify.com/download', 'support@shadownet.live', 'https://t.me/ShadowNetSupport');`);
  }

  const [{ count: botMessagesCount }] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM bot_messages;`)).rows as { count: number }[];
  if (botMessagesCount === 0) {
    await db.execute(sql`INSERT INTO bot_messages (key, content) VALUES
      ('start', 'Добро пожаловать в ShadowNet!'),
      ('faq', 'Оплата через CrystalPay или Enot, выдача ключа сразу.')
    ;`);
  }

  const [{ count: siteTextsCount }] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM site_texts;`)).rows as { count: number }[];
  if (siteTextsCount === 0) {
    await db.execute(sql`INSERT INTO site_texts (key, content) VALUES
      ('hero_title', 'ShadowNet — быстрый и безопасный VPN'),
      ('hero_subtitle', 'Простая покупка, моментальная выдача ключей.')
    ;`);
  }
}
