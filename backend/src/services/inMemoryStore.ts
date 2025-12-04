import { channelEnum, paymentStatusEnum } from '../db/schema.js';

export type Tariff = {
  id: number;
  name: string;
  description: string;
  price: number;
  validDays: number;
  protocolType: string;
  active: boolean;
};

export type AccessKey = {
  id: number;
  type: string;
  label?: string;
  rawUri: string;
  qrImageUrl?: string;
  status: 'available' | 'reserved' | 'sold' | 'disabled';
  tariffId?: number;
  validDays?: number;
  notes?: string;
  soldAt?: string;
  soldToUser?: number;
  channel?: typeof channelEnum['enumValues'][number];
  reservedUntil?: string;
};

export type Payment = {
  id: number;
  userId?: number;
  tariffId: number;
  amount: number;
  provider: 'crystalpay' | 'enot';
  status: typeof paymentStatusEnum['enumValues'][number];
  channel: typeof channelEnum['enumValues'][number];
  externalId?: string;
  reservedKeyId?: number;
  reservedUntil?: string;
  soldKeyId?: number;
};

export type BotMessage = { key: string; content: string };
export type SiteText = { key: string; content: string };

export type User = {
  id: number;
  telegramId?: number;
  username?: string;
  purchaseCount: number;
  registeredAt: string;
};

export type Setting = {
  activeProvider: 'crystalpay' | 'enot';
  crystalpayShopId?: string;
  crystalpaySecret?: string;
  enotShopId?: string;
  enotSecret?: string;
  botToken?: string;
  botName?: string;
  adminChatId?: string;
  termsUrl?: string;
  privacyUrl?: string;
  downloadsUrl?: string;
};

export const store = {
  tariffs: [
    {
      id: 1,
      name: 'Shadow Basic',
      description: 'VLESS, 7 дней, один регион',
      price: 299,
      validDays: 7,
      protocolType: 'vless',
      active: true,
    },
    {
      id: 2,
      name: 'Shadow Pro',
      description: 'VLESS или Shadowsocks, 30 дней, все регионы',
      price: 999,
      validDays: 30,
      protocolType: 'any',
      active: true,
    },
  ] as Tariff[],
  accessKeys: [
    {
      id: 1,
      type: 'vless',
      label: 'VLESS NL #1',
      rawUri: 'vless://example@nl.server:443?security=tls',
      status: 'available',
      tariffId: 2,
    },
    {
      id: 2,
      type: 'shadowsocks',
      label: 'SS SG #1',
      rawUri: 'ss://base64@sg.server:8388',
      status: 'available',
      tariffId: 2,
    },
  ] as AccessKey[],
  payments: [] as Payment[],
  botMessages: [
    { key: 'start', content: 'Добро пожаловать в ShadowNet!' },
    { key: 'faq', content: 'Оплата через CrystalPay или Enot, выдача ключа сразу.' },
  ] as BotMessage[],
  siteTexts: [
    { key: 'hero_title', content: 'ShadowNet — быстрый и безопасный VPN' },
    { key: 'hero_subtitle', content: 'Простая покупка, моментальная выдача ключей.' },
  ] as SiteText[],
  users: [] as User[],
  settings: {
    activeProvider: 'crystalpay',
    crystalpayShopId: 'demo-shop',
    botName: 'ShadowNetBot',
    termsUrl: 'https://shadownet.live/terms',
    privacyUrl: 'https://shadownet.live/privacy',
  } as Setting,
};
