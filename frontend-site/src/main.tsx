import "./index.css";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:6070/api";

type User = {
  id: number;
  username: string;
  email?: string;
  role?: string;
};

type Subscription = {
  id: number;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired";
};

type UserConfig = {
  id: number;
  name: string;
  type: string;
  configText: string;
  qrCodeUrl?: string | null;
};

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

type PaymentDetails = PaymentResponse & { key?: AccessKey | null };

type Settings = {
  termsUrl?: string;
  privacyUrl?: string;
  downloadsUrl?: string;
  supportEmail?: string;
  supportTelegram?: string;
  supportChatUrl?: string;
};

type SiteText = { key: string; content: string };

const Hero = ({ title, subtitle }: { title?: string; subtitle?: string }) => (
  <section className="hero">
    <div className="content">
      <p className="eyebrow">ShadowNet</p>
      <h1>{title || "Быстрый и безопасный VPN"}</h1>
      <p className="subtitle">{subtitle || "Простая покупка, выдача ключей сразу после оплаты."}</p>
      <div className="actions">
        <a className="btn primary" href="#pricing">
          Купить доступ
        </a>
        <a className="btn ghost" href="https://t.me/shadownet_live_bot">
          Открыть в Telegram
        </a>
      </div>
    </div>
  </section>
);

const AuthCard = ({
  mode,
  onSwitch,
  form,
  setForm,
  onSubmit,
  loading,
  error,
}: {
  mode: "login" | "register";
  onSwitch: () => void;
  form: { username: string; email: string; password: string };
  setForm: (v: { username: string; email: string; password: string }) => void;
  onSubmit: () => Promise<void>;
  loading: boolean;
  error?: string | null;
}) => (
  <section className="section auth-card">
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Личный кабинет</p>
          <h3>{mode === "login" ? "Вход" : "Регистрация"}</h3>
          <p className="meta">Используйте учётку, чтобы посмотреть подписку и конфиги.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Логин
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="username"
          />
        </label>
        {mode === "register" && (
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>
        )}
        <label>
          Пароль
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="******"
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn primary" onClick={onSubmit} disabled={loading}>
          {loading ? "Отправляем..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
        <button className="btn ghost" onClick={onSwitch}>
          {mode === "login" ? "Нет аккаунта? Регистрация" : "У меня уже есть аккаунт"}
        </button>
      </div>
    </div>
  </section>
);

const AccountCard = ({ user, subscription, configs, onLogout }: {
  user: User;
  subscription: Subscription | null;
  configs: UserConfig[];
  onLogout: () => Promise<void>;
}) => (
  <section className="section">
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Личный кабинет</p>
          <h3>{user.username}</h3>
          <p className="meta">Роль: {user.role || "user"}</p>
        </div>
        <button className="btn ghost" onClick={onLogout}>
          Выйти
        </button>
      </div>
      <div className="grid">
        <div className="pill">
          <strong>Подписка</strong>
          {!subscription && <p className="meta">Нет активных платежей</p>}
          {subscription && (
            <>
              <p>{subscription.planName}</p>
              <p className="meta">
                {subscription.amount} ₽ • {subscription.status === "active" ? "активна" : "истекла"}
              </p>
              <p className="meta">
                {new Date(subscription.startDate).toLocaleDateString()} — {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
        <div className="pill">
          <strong>Конфиги</strong>
          {configs.length === 0 && <p className="meta">Ключи ещё не куплены</p>}
          {configs.length > 0 && (
            <ul className="config-list">
              {configs.map((c) => (
                <li key={c.id}>
                  <p>{c.name}</p>
                  <code>{c.configText}</code>
                  {c.qrCodeUrl && (
                    <a className="text-link" href={c.qrCodeUrl} target="_blank" rel="noreferrer">
                      QR
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  </section>
);

const TariffCard = ({ tariff, onBuy }: { tariff: Tariff; onBuy: (tariff: Tariff) => void }) => (
  <div className="card">
    <h3>{tariff.name}</h3>
    <p>{tariff.description}</p>
    <p className="price">{tariff.price} ₽</p>
    <p className="meta">{tariff.validDays} дней</p>
    <button className="btn primary" onClick={() => onBuy(tariff)}>
      Купить
    </button>
  </div>
);

const PaymentPanel = ({
  tariff,
  payment,
  details,
  onCheck,
  loading,
  error,
}: {
  tariff: Tariff;
  payment: PaymentResponse;
  details?: PaymentDetails | null;
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
      <p className="meta">Резерв до: {payment.reservedUntil || "—"}</p>
      <div className="actions">
        <a className="btn primary" href={payment.paymentUrl} target="_blank" rel="noreferrer">
          Открыть ссылку оплаты
        </a>
        <button className="btn" onClick={onCheck} disabled={loading}>
          {loading ? "Проверяем..." : "Проверить оплату"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {details?.key && (
        <div className="info">
          <p className="eyebrow">Ключ выдан</p>
          <p>{details.key.label || "Ключ"}</p>
          <code>{details.key.rawUri}</code>
          {details.key.qrImageUrl && <p>QR: {details.key.qrImageUrl}</p>}
        </div>
      )}
    </div>
  </section>
);

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
        <p>После оплаты ключ резервируется и продаётся через backend API.</p>
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
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "" });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTariff, setActiveTariff] = useState<Tariff | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentResponse | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [siteTexts, setSiteTexts] = useState<SiteText[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [configs, setConfigs] = useState<UserConfig[]>([]);

  useEffect(() => {
    fetch(`${apiUrl}/settings/texts`)
      .then((res) => res.json())
      .then((payload) => setSiteTexts(payload.siteTexts || []))
      .catch(() => setSiteTexts([]));
    fetch(`${apiUrl}/settings`)
      .then((res) => res.json())
      .then(setSettings)
      .catch(() => setSettings(null));
    fetch(`${apiUrl}/tariffs`)
      .then((res) => res.json())
      .then((data: Tariff[]) => setTariffs(data))
      .catch(() => setTariffs([]));
    fetchMe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setConfigs([]);
      return;
    }
    fetch(`${apiUrl}/subscriptions/current`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSubscription(data))
      .catch(() => setSubscription(null));
    fetch(`${apiUrl}/configs/user`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: UserConfig[]) => setConfigs(data))
      .catch(() => setConfigs([]));
  }, [user]);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });
      if (!res.ok) return setUser(null);
      const payload = (await res.json()) as User;
      setUser(payload);
    } catch (e) {
      setUser(null);
    }
  };

  const handleAuth = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const url = `${apiUrl}/auth/${authMode === "login" ? "login" : "register"}`;
      const body = authMode === "login"
        ? { username: authForm.username, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.message || "Ошибка авторизации");
      }
      await fetchMe();
    } catch (e) {
      setAuthError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    setSubscription(null);
    setConfigs([]);
  };

  const createPayment = async (tariff: Tariff) => {
    setError(undefined);
    setPaymentDetails(null);
    setActiveTariff(tariff);
    try {
      const res = await fetch(`${apiUrl}/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tariffId: tariff.id, channel: "web" }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.message || "Не удалось создать платёж");
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
      const res = await fetch(`${apiUrl}/payments/${activePayment.id}`, { credentials: "include" });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.message || "Ошибка проверки платежа");
      }
      const data = (await res.json()) as PaymentDetails;
      setPaymentDetails(data);
      if (data.key) {
        fetchMe();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  const heroTitle = siteTexts.find((t) => t.key === "hero_title")?.content;
  const heroSubtitle = siteTexts.find((t) => t.key === "hero_subtitle")?.content;

  const supportEmail = settings?.supportEmail || "support@shadownet.live";
  const supportTelegram = settings?.supportTelegram;
  const supportChatUrl = settings?.supportChatUrl;
  const downloadsUrl = settings?.downloadsUrl;
  const termsUrl = settings?.termsUrl || "/terms";
  const privacyUrl = settings?.privacyUrl || "/privacy";

  return (
    <div className="page">
      <Hero title={heroTitle} subtitle={heroSubtitle} />
      {user ? (
        <AccountCard user={user} subscription={subscription} configs={configs} onLogout={handleLogout} />
      ) : (
        <AuthCard
          mode={authMode}
          onSwitch={() => setAuthMode(authMode === "login" ? "register" : "login")}
          form={authForm}
          setForm={setAuthForm}
          onSubmit={handleAuth}
          loading={authLoading}
          error={authError}
        />
      )}
      <Features />
      <section id="pricing" className="section">
        <div className="section-header">
          <p className="eyebrow">Тарифы</p>
          <h2>Выбери подходящий план</h2>
        </div>
        <div className="grid">
          {tariffs.map((tariff) => (
            <TariffCard tariff={tariff} key={tariff.id} onBuy={createPayment} />
          ))}
        </div>
      </section>
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
                "Скачайте клиент и импортируйте URI или QR."
              )}
            </p>
          </div>
        </div>
      </section>
      {activePayment && activeTariff && (
        <PaymentPanel
          tariff={activeTariff}
          payment={activePayment}
          details={paymentDetails}
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
              <a href={supportTelegram} target="_blank" rel="noreferrer">
                {supportTelegram}
              </a>
            </div>
          )}
          {supportChatUrl && (
            <div className="card">
              <p className="eyebrow">Чат поддержки</p>
              <a href={supportChatUrl} target="_blank" rel="noreferrer">
                Открыть чат
              </a>
            </div>
          )}
        </div>
      </section>
      <Footer supportEmail={supportEmail} termsUrl={termsUrl} privacyUrl={privacyUrl} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
