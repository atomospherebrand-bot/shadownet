import "./index.css";
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:6070/api';

type Tariff = {
  id: number;
  name: string;
  description?: string;
  price: number;
  validDays: number;
};

type AccessKey = {
  id: number;
  label?: string;
  rawUri: string;
  qrImageUrl?: string;
  status: string;
};

type PaymentResponse = {
  id: number;
  tariffId: number;
  amount: number;
  provider: string;
  status: string;
  channel: string;
  externalId?: string;
  reservedKeyId?: number;
  reservedUntil?: string;
  paymentUrl: string;
};

type PaymentStatusPayload = {
  payment: PaymentResponse;
  reservedKey?: AccessKey;
  soldKey?: AccessKey;
};

type Settings = {
  termsUrl?: string;
  privacyUrl?: string;
  downloadsUrl?: string;
  supportEmail?: string;
  supportTelegram?: string;
  supportChatUrl?: string;
};

const Hero = ({ title, subtitle }: { title?: string; subtitle?: string }) => (
  <section className="hero">
    <div className="content">
      <p className="eyebrow">ShadowNet</p>
      <h1>{title || 'Быстрый и безопасный VPN'}</h1>
      <p className="subtitle">{subtitle || 'Простая покупка, выдача ключей сразу после оплаты.'}</p>
      <div className="actions">
        <a className="btn primary" href="#pricing">Купить доступ</a>
        <a className="btn ghost" href="https://t.me/ShadowNetBot">Открыть в Telegram</a>
      </div>
    </div>
  </section>
);

type SiteText = { key: string; content: string };

const TariffCard = ({ tariff, onBuy }: { tariff: Tariff; onBuy: (tariff: Tariff) => void }) => (
  <div className="card">
    <h3>{tariff.name}</h3>
    <p>{tariff.description}</p>
    <p className="price">{tariff.price} ₽</p>
    <p className="meta">{tariff.validDays} дней</p>
    <button className="btn primary" onClick={() => onBuy(tariff)}>Купить</button>
  </div>
);

const PaymentPanel = ({
  tariff,
  payment,
  status,
  onCheck,
  loading,
  error,
}: {
  tariff: Tariff;
  payment: PaymentResponse;
  status?: PaymentStatusPayload | null;
  onCheck: () => void;
  loading: boolean;
  error?: string;
}) => (
  <section className="section">
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Оплата</p>
          <h3>{tariff.name}</h3>
        </div>
        <span className="pill">{payment.provider}</span>
      </div>
      <p>Сумма: {payment.amount} ₽</p>
      <p className="meta">Резерв до: {payment.reservedUntil || '—'}</p>
      <div className="actions">
        <a className="btn primary" href={payment.paymentUrl} target="_blank" rel="noreferrer">
          Открыть ссылку оплаты
        </a>
        <button className="btn" onClick={onCheck} disabled={loading}>
          {loading ? 'Проверяем...' : 'Проверить оплату'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {status?.reservedKey && (
        <div className="info">
          <p className="eyebrow">Зарезервированный ключ</p>
          <p>{status.reservedKey.label || status.reservedKey.rawUri}</p>
        </div>
      )}
      {status?.soldKey && (
        <div className="info">
          <p className="eyebrow">Оплата подтверждена</p>
          <p>{status.soldKey.label || 'Ключ'}</p>
          <code>{status.soldKey.rawUri}</code>
          {status.soldKey.qrImageUrl && <p>QR: {status.soldKey.qrImageUrl}</p>}
        </div>
      )}
    </div>
  </section>
);

const Pricing = ({ onBuy }: { onBuy: (tariff: Tariff) => void }) => {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  useEffect(() => {
    fetch(`${apiUrl}/tariffs`)
      .then((res) => res.json())
      .then(setTariffs)
      .catch(() => setTariffs([]));
  }, []);

  return (
    <section id="pricing" className="section">
      <div className="section-header">
        <p className="eyebrow">Тарифы</p>
        <h2>Выбери подходящий план</h2>
      </div>
      <div className="grid">
        {tariffs.map((tariff) => (
          <TariffCard tariff={tariff} key={tariff.id} onBuy={onBuy} />
        ))}
      </div>
    </section>
  );
};

const Features = () => (
  <section className="section">
    <div className="section-header">
      <p className="eyebrow">Почему ShadowNet</p>
      <h2>Скорость, конфиденциальность, простота</h2>
    </div>
    <div className="grid">
      <div className="card">
        <h3>Дизайн из VpnSecureMarket</h3>
        <p>Повторяем стиль шаблона: акценты, отступы и кнопки в едином языке.</p>
      </div>
      <div className="card">
        <h3>Мгновенная выдача</h3>
        <p>После оплаты ключ зарезервируется и продаётся через backend API.</p>
      </div>
      <div className="card">
        <h3>Telegram-бот</h3>
        <p>Те же тарифы и ключи, единый инвентарь и статусы.</p>
      </div>
    </div>
  </section>
);

const FAQ = () => (
  <section className="section">
    <div className="section-header">
      <p className="eyebrow">FAQ</p>
      <h2>Частые вопросы</h2>
    </div>
    <div className="faq">
      <details>
        <summary>Как происходит оплата?</summary>
        <p>Через CrystalPay или Enot по ссылке, с callback на backend.</p>
      </details>
      <details>
        <summary>Что насчёт ключей?</summary>
        <p>Ключи хранятся в инвентаре, продаются ровно один раз.</p>
      </details>
    </div>
  </section>
);

const Footer = ({ supportEmail, termsUrl, privacyUrl }: { supportEmail: string; termsUrl: string; privacyUrl: string }) => (
  <footer className="footer">
    <div>
      <p>ShadowNet.live</p>
      <p>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>
    </div>
    <div className="links">
      <a href={termsUrl}>Условия использования</a>
      <a href={privacyUrl}>Политика конфиденциальности</a>
    </div>
  </footer>
);

const App = () => {
  const [activeTariff, setActiveTariff] = useState<Tariff | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusPayload | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [siteTexts, setSiteTexts] = useState<SiteText[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/settings/texts`)
      .then((res) => res.json())
      .then((payload) => setSiteTexts(payload.siteTexts || []))
      .catch(() => setSiteTexts([]));
    fetch(`${apiUrl}/settings`)
      .then((res) => res.json())
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const createPayment = async (tariff: Tariff) => {
    setError(undefined);
    setPaymentStatus(null);
    setActiveTariff(tariff);
    try {
      const res = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffId: tariff.id, channel: 'web' }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.message || 'Не удалось создать платёж');
      }
      const payment = (await res.json()) as PaymentResponse;
      setActivePayment(payment);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const checkPayment = async () => {
    if (!activePayment) return;
    setIsChecking(true);
    setError(undefined);
    try {
      const res = await fetch(`${apiUrl}/payments/${activePayment.id}`);
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.message || 'Ошибка проверки платежа');
      }
      const data = (await res.json()) as PaymentStatusPayload;
      setPaymentStatus(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  const heroTitle = siteTexts.find((t) => t.key === 'hero_title')?.content;
  const heroSubtitle = siteTexts.find((t) => t.key === 'hero_subtitle')?.content;

  const supportEmail = settings?.supportEmail || 'support@shadownet.live';
  const supportTelegram = settings?.supportTelegram;
  const supportChatUrl = settings?.supportChatUrl;
  const downloadsUrl = settings?.downloadsUrl;
  const termsUrl = settings?.termsUrl || '/terms';
  const privacyUrl = settings?.privacyUrl || '/privacy';

  return (
    <div className="page">
      <Hero title={heroTitle} subtitle={heroSubtitle} />
      <Features />
      <Pricing onBuy={createPayment} />
      <section className="section">
        <div className="section-header">
          <p className="eyebrow">Подключение</p>
          <h2>Как начать</h2>
          <p className="meta">Оплати тариф, скачай клиент и импортируй ключ</p>
        </div>
        <div className="grid">
          <div className="card">
            <h3>1. Оплата тарифа</h3>
            <p>Выберите план, создайте счёт и оплатите его через CrystalPay или Enot.</p>
          </div>
          <div className="card">
            <h3>2. Получение ключа</h3>
            <p>Ключ резервируется на время оплаты и выдаётся сразу после подтверждения.</p>
          </div>
          <div className="card">
            <h3>3. Импорт в клиент</h3>
            <p>
              {downloadsUrl ? (
                <a className="text-link" href={downloadsUrl} target="_blank" rel="noreferrer">
                  Скачать клиент
                </a>
              ) : (
                'Скачайте клиент и импортируйте URI или QR.'
              )}
            </p>
          </div>
        </div>
      </section>
      {activePayment && activeTariff && (
        <PaymentPanel
          tariff={activeTariff}
          payment={activePayment}
          status={paymentStatus}
          onCheck={checkPayment}
          loading={isChecking}
          error={error}
        />
      )}
      {!activePayment && error && (
        <section className="section">
          <div className="card error">
            <p className="eyebrow">Ошибка</p>
            <p>{error}</p>
          </div>
        </section>
      )}
      <FAQ />
      <section className="section">
        <div className="section-header">
          <p className="eyebrow">Поддержка</p>
          <h2>Свяжитесь с нами</h2>
        </div>
        <div className="grid">
          <div className="card">
            <p className="eyebrow">Email</p>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </div>
          {supportTelegram && (
            <div className="card">
              <p className="eyebrow">Telegram</p>
              <a href={supportTelegram} target="_blank" rel="noreferrer">{supportTelegram}</a>
            </div>
          )}
          {supportChatUrl && (
            <div className="card">
              <p className="eyebrow">Чат поддержки</p>
              <a href={supportChatUrl} target="_blank" rel="noreferrer">Открыть чат</a>
            </div>
          )}
        </div>
      </section>
      <Footer supportEmail={supportEmail} termsUrl={termsUrl} privacyUrl={privacyUrl} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
