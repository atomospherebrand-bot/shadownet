import crypto from 'crypto';
import { config } from '../config/index.js';
import { getSettings, SettingsRow } from './settingsService.js';

type Provider = 'crystalpay' | 'enot';

type InvoiceRequest = {
  amount: number;
  tariffName: string;
  externalId: string;
  provider: Provider;
};

export type InvoiceResult = {
  paymentUrl: string;
  payload: Record<string, string | number>;
  signature?: string;
};

const defaultHosts: Record<Provider, string> = {
  crystalpay: process.env.CRYSTALPAY_HOST || 'https://pay.crystalpay.io/invoice',
  enot: process.env.ENOT_HOST || 'https://enot.io/pay',
};

function buildSignature(secret: string | null | undefined, data: string): string | undefined {
  if (!secret) return undefined;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export async function createInvoice({
  amount,
  tariffName,
  externalId,
  provider,
}: InvoiceRequest): Promise<InvoiceResult> {
  const settings = await getSettings();
  const host =
    provider === 'crystalpay'
      ? settings.crystalpayHost || defaultHosts.crystalpay
      : settings.enotHost || defaultHosts.enot;
  const payload = buildPayload(provider, { amount, tariffName, externalId }, settings);
  const signature = buildSignature(getSecret(provider, settings), `${externalId}:${amount}`);
  const query = new URLSearchParams({
    order: externalId,
    amount: amount.toString(),
    desc: tariffName,
  });
  if (signature) {
    query.append('signature', signature);
  }
  const paymentUrl = `${host}?${query.toString()}`;

  return { paymentUrl, payload, signature };
}

function buildPayload(
  provider: Provider,
  data: { amount: number; tariffName: string; externalId: string },
  settings: SettingsRow,
) {
  if (provider === 'crystalpay') {
    return {
      shopId: settings.crystalpayShopId ?? 'demo-shop',
      amount: data.amount,
      order: data.externalId,
      description: data.tariffName,
      callback: `${config.publicBaseUrl ?? 'https://api.shadownet.live'}/api/payments/callback/crystalpay`,
    };
  }
  return {
    shopId: settings.enotShopId ?? 'demo-shop',
    amount: data.amount,
    order: data.externalId,
    description: data.tariffName,
    callback: `${config.publicBaseUrl ?? 'https://api.shadownet.live'}/api/payments/callback/enot`,
  };
}

function getSecret(provider: Provider, settings: SettingsRow): string | null | undefined {
  return provider === 'crystalpay' ? settings.crystalpaySecret : settings.enotSecret;
}

export async function verifyCallback(
  provider: Provider,
  payload: { externalId?: string; amount?: number; signature?: string },
): Promise<boolean> {
  const settings = await getSettings();
  const secret = getSecret(provider, settings);
  if (!payload.externalId || !payload.amount) return false;
  const expected = buildSignature(secret, `${payload.externalId}:${payload.amount}`);
  if (!expected) return true; // если секрет не указан, пропускаем проверку для dev
  return expected === payload.signature;
}
