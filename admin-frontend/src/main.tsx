import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:6070/api';

type AccessKey = {
  id: number;
  label?: string;
  type: string;
  status: string;
  tariffId?: number;
  rawUri?: string;
};

type Tariff = {
  id: number;
  name: string;
  description?: string;
  price: number;
  validDays: number;
  protocolType: string;
  active?: boolean;
};

type Setting = {
  activeProvider: string;
  botToken?: string;
  botName?: string;
  adminChatId?: string;
  termsUrl?: string;
  privacyUrl?: string;
  downloadsUrl?: string;
  supportEmail?: string;
  supportTelegram?: string;
  supportChatUrl?: string;
};

type TextItem = { key: string; content: string };

type Payment = {
  id: number;
  tariffId: number;
  amount: number;
  status: string;
  provider: string;
  channel: string;
  reservedUntil?: string;
  reservedKey?: AccessKey;
  soldKey?: AccessKey;
  tariff?: Tariff;
};

type Summary = {
  keys: Record<string, number>;
  payments: Record<string, number>;
  revenueByChannel: Record<string, number>;
};

const TopBar = ({ onLogout, loggedIn }: { onLogout?: () => void; loggedIn?: boolean }) => (
  <header className="topbar">
    <h1>ShadowNet Admin</h1>
    <div className="topbar-actions">
      <span>Единый стиль с маркетинговым сайтом</span>
      {loggedIn && (
        <button className="text-btn" onClick={onLogout}>
          Выйти
        </button>
      )}
    </div>
  </header>
);

const KeysTable = ({ keys }: { keys: AccessKey[] }) => (
  <section className="card">
    <div className="card-header">
      <div>
        <p className="eyebrow">Ключи</p>
        <h3>Инвентарь доступа</h3>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Метка</th>
          <th>Тип</th>
          <th>Статус</th>
          <th>Тариф</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k.id}>
            <td>{k.id}</td>
            <td>{k.label}</td>
            <td>{k.type}</td>
            <td className={`status ${k.status}`}>{k.status}</td>
            <td>{k.tariffId || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const TariffList = ({ tariffs, onToggle }: { tariffs: Tariff[]; onToggle: (tariff: Tariff) => void }) => (
  <section className="card">
    <div className="card-header">
      <div>
        <p className="eyebrow">Тарифы</p>
        <h3>Управление ценами</h3>
      </div>
    </div>
    <div className="tariff-grid">
      {tariffs.map((tariff) => (
        <div key={tariff.id} className="pill">
          <div>
            <strong>{tariff.name}</strong>
            <p>{tariff.price} ₽ / {tariff.validDays} дней</p>
            <p className="meta">{tariff.description}</p>
          </div>
          <div className="pill-actions">
            <span className={`badge ${tariff.active ? 'success' : 'muted'}`}>
              {tariff.active ? 'Активен' : 'Скрыт'} · {tariff.protocolType}
            </span>
            <button className="text-btn" onClick={() => onToggle(tariff)}>
              {tariff.active ? 'Скрыть' : 'Опубликовать'}
            </button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const Settings = ({ settings, onChange, onSave, saving }: {
  settings: Setting;
  onChange: (key: keyof Setting, value: string) => void;
  onSave: () => void;
  saving: boolean;
}) => (
  <section className="card">
    <div className="card-header">
      <div>
        <p className="eyebrow">Интеграции</p>
        <h3>Платёжки и бот</h3>
      </div>
      <button className="btn" onClick={onSave} disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
    </div>
    <div className="form-grid">
      <label>
        Активный провайдер
        <input value={settings.activeProvider} onChange={(e) => onChange('activeProvider', e.target.value)} />
      </label>
      <label>
        Bot token
        <input value={settings.botToken || ''} onChange={(e) => onChange('botToken', e.target.value)} />
      </label>
      <label>
        Bot name
        <input value={settings.botName || ''} onChange={(e) => onChange('botName', e.target.value)} />
      </label>
      <label>
        Admin chat id
        <input value={settings.adminChatId || ''} onChange={(e) => onChange('adminChatId', e.target.value)} />
      </label>
      <label>
        Terms URL
        <input value={settings.termsUrl || ''} onChange={(e) => onChange('termsUrl', e.target.value)} />
      </label>
      <label>
        Privacy URL
        <input value={settings.privacyUrl || ''} onChange={(e) => onChange('privacyUrl', e.target.value)} />
      </label>
      <label>
        Downloads URL
        <input value={settings.downloadsUrl || ''} onChange={(e) => onChange('downloadsUrl', e.target.value)} />
      </label>
      <label>
        Поддержка (email)
        <input value={settings.supportEmail || ''} onChange={(e) => onChange('supportEmail', e.target.value)} />
      </label>
      <label>
        Поддержка (Telegram ссылка)
        <input value={settings.supportTelegram || ''} onChange={(e) => onChange('supportTelegram', e.target.value)} />
      </label>
      <label>
        Поддержка (чат/тикеты)
        <input value={settings.supportChatUrl || ''} onChange={(e) => onChange('supportChatUrl', e.target.value)} />
      </label>
    </div>
  </section>
);

const TextsCard = ({
  title,
  description,
  texts,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  description: string;
  texts: TextItem[];
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
}) => (
  <section className="card">
    <div className="card-header">
      <div>
        <p className="eyebrow">Контент</p>
        <h3>{title}</h3>
        <p className="meta">{description}</p>
      </div>
      <button className="btn" onClick={onSave} disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
    </div>
    <div className="form-grid">
      {texts.map((text) => (
        <label key={text.key}>
          {text.key}
          <textarea
            value={text.content}
            onChange={(e) => onChange(text.key, e.target.value)}
            rows={3}
          />
        </label>
      ))}
    </div>
  </section>
);

const SummaryCard = ({ summary }: { summary: Summary | null }) => (
  <section className="card">
    <div className="card-header">
      <div>
        <p className="eyebrow">Статистика</p>
        <h3>Сводка продаж</h3>
        <p className="meta">Ключи, платежи и выручка по каналам</p>
      </div>
    </div>
    {!summary ? (
      <p className="meta">Загрузка…</p>
    ) : (
      <div className="pill-grid">
        <div className="pill">
          <strong>Ключи</strong>
          <p className="meta">available: {summary.keys['available'] || 0}</p>
          <p className="meta">reserved: {summary.keys['reserved'] || 0}</p>
          <p className="meta">sold: {summary.keys['sold'] || 0}</p>
        </div>
        <div className="pill">
          <strong>Платежи</strong>
          <p className="meta">pending: {summary.payments['pending'] || 0}</p>
          <p className="meta">paid: {summary.payments['paid'] || 0}</p>
          <p className="meta">total ₽: {summary.payments['total'] || 0}</p>
        </div>
        <div className="pill">
          <strong>Выручка</strong>
          <p className="meta">web: {summary.revenueByChannel['web'] || 0} ₽</p>
          <p className="meta">telegram: {summary.revenueByChannel['telegram'] || 0} ₽</p>
        </div>
      </div>
    )}
  </section>
);

const PaymentsTable = ({ payments }: { payments: Payment[] }) => (
  <section className="card">
    <div className="card-header">
      <div>
        <p className="eyebrow">Платежи</p>
        <h3>История оплат</h3>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Тариф</th>
          <th>Сумма</th>
          <th>Статус</th>
          <th>Канал</th>
          <th>Ключ</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{p.id}</td>
            <td>{p.tariff?.name || p.tariffId}</td>
            <td>{p.amount} ₽</td>
            <td className={`status ${p.status}`}>{p.status}</td>
            <td>{p.channel}</td>
            <td>{p.soldKey?.label || p.reservedKey?.label || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const App = () => {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [settings, setSettings] = useState<Setting>({ activeProvider: 'crystalpay' });
  const [siteTexts, setSiteTexts] = useState<TextItem[]>([]);
  const [botTexts, setBotTexts] = useState<TextItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [newKey, setNewKey] = useState<Partial<AccessKey>>({ status: 'available', type: 'vless' });
  const [newTariff, setNewTariff] = useState<Partial<Tariff>>({ protocolType: 'any', active: true, validDays: 30 });
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isCreatingTariff, setIsCreatingTariff] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [isSavingBot, setIsSavingBot] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [login, setLogin] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) return;

    fetch(`${apiUrl}/keys`, { headers: { ...authHeaders } })
      .then((res) => (res.status === 401 ? [] : res.json()))
      .then((data) => setKeys(Array.isArray(data) ? data : []))
      .catch(() => setKeys([]));
    fetch(`${apiUrl}/tariffs?all=1`, { headers: { ...authHeaders } })
      .then((res) => (res.status === 401 ? [] : res.json()))
      .then((data) => setTariffs(Array.isArray(data) ? data : []))
      .catch(() => setTariffs([]));
    fetch(`${apiUrl}/settings`, { headers: { ...authHeaders } })
      .then((res) => (res.status === 401 ? null : res.json()))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => setSettings({ activeProvider: 'crystalpay' }));
    fetch(`${apiUrl}/settings/texts`)
      .then((res) => res.json())
      .then((payload) => {
        setBotTexts(payload.botMessages || []);
        setSiteTexts(payload.siteTexts || []);
      })
      .catch(() => {
        setBotTexts([]);
        setSiteTexts([]);
      });
    fetch(`${apiUrl}/payments`, { headers: { ...authHeaders } })
      .then((res) => (res.status === 401 ? [] : res.json()))
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch(() => setPayments([]));
    fetch(`${apiUrl}/reports/summary`, { headers: { ...authHeaders } })
      .then((res) => (res.status === 401 ? null : res.json()))
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [token]);

  const handleLogin = async () => {
    setLoginError('');
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(login),
    });
    if (!res.ok) {
      setLoginError('Неверный логин или пароль');
      return;
    }
    const payload = await res.json();
    localStorage.setItem('adminToken', payload.token);
    setToken(payload.token);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  const updateSettingField = (key: keyof Setting, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateKey = async () => {
    setIsCreatingKey(true);
    await fetch(`${apiUrl}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(newKey),
    })
      .then((res) => res.json())
      .then((created) => {
        setKeys((prev) => [...prev, created]);
        setNewKey({ status: 'available', type: 'vless' });
      })
      .finally(() => setIsCreatingKey(false));
  };

  const toggleTariff = async (tariff: Tariff) => {
    const updated = { ...tariff, active: !tariff.active };
    await fetch(`${apiUrl}/tariffs/${tariff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ active: updated.active }),
    });
    setTariffs((prev) => prev.map((t) => (t.id === tariff.id ? updated : t)));
  };

  const handleCreateTariff = async () => {
    setIsCreatingTariff(true);
    await fetch(`${apiUrl}/tariffs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(newTariff),
    })
      .then((res) => res.json())
      .then((created) => {
        setTariffs((prev) => [...prev, created]);
        setNewTariff({ protocolType: 'any', active: true, validDays: 30 });
      })
      .finally(() => setIsCreatingTariff(false));
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    await fetch(`${apiUrl}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(settings),
    }).finally(() => setIsSavingSettings(false));
  };

  const changeSiteText = (key: string, value: string) => {
    setSiteTexts((prev) => prev.map((t) => (t.key === key ? { ...t, content: value } : t)));
  };

  const changeBotText = (key: string, value: string) => {
    setBotTexts((prev) => prev.map((t) => (t.key === key ? { ...t, content: value } : t)));
  };

  const saveSiteTexts = async () => {
    setIsSavingSite(true);
    await fetch(`${apiUrl}/settings/texts/site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(siteTexts),
    }).finally(() => setIsSavingSite(false));
  };

  const saveBotTexts = async () => {
    setIsSavingBot(true);
    await fetch(`${apiUrl}/settings/texts/bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(botTexts),
    }).finally(() => setIsSavingBot(false));
  };

  if (!token) {
    return (
      <div className="layout">
        <TopBar />
        <main>
          <section className="card narrow">
            <div className="card-header">
              <div>
                <p className="eyebrow">Авторизация</p>
                <h3>Вход в админку</h3>
                <p className="meta">Введите логин и пароль администратора</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Логин
                <input
                  value={login.username}
                  onChange={(e) => setLogin((p) => ({ ...p, username: e.target.value }))}
                />
              </label>
              <label>
                Пароль
                <input
                  type="password"
                  value={login.password}
                  onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
                />
              </label>
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button className="btn" onClick={handleLogin}>Войти</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <TopBar onLogout={handleLogout} loggedIn={!!token} />
      <main>
        <SummaryCard summary={summary} />
        <div className="columns">
          <div className="column">
            <section className="card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Ключи</p>
                  <h3>Добавление вручную</h3>
                </div>
                <button className="btn" onClick={handleCreateKey} disabled={isCreatingKey}>
                  {isCreatingKey ? 'Сохраняем…' : 'Сохранить ключ'}
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Метка
                  <input value={newKey.label || ''} onChange={(e) => setNewKey((p) => ({ ...p, label: e.target.value }))} />
                </label>
                <label>
                  Тип
                  <input value={newKey.type || ''} onChange={(e) => setNewKey((p) => ({ ...p, type: e.target.value }))} />
                </label>
                <label>
                  URI
                  <input value={newKey.rawUri || ''} onChange={(e) => setNewKey((p) => ({ ...p, rawUri: e.target.value }))} />
                </label>
                <label>
                  QR URL
                  <input value={newKey.qrImageUrl || ''} onChange={(e) => setNewKey((p) => ({ ...p, qrImageUrl: e.target.value }))} />
                </label>
                <label>
                  Тариф ID
                  <input
                    type="number"
                    value={newKey.tariffId || ''}
                    onChange={(e) => setNewKey((p) => ({ ...p, tariffId: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Статус
                  <select value={newKey.status} onChange={(e) => setNewKey((p) => ({ ...p, status: e.target.value }))}>
                    <option value="available">available</option>
                    <option value="reserved">reserved</option>
                    <option value="sold">sold</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
              </div>
            </section>

            <KeysTable keys={keys} />
            <section className="card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Тарифы</p>
                  <h3>Создание</h3>
                </div>
                <button className="btn" onClick={handleCreateTariff} disabled={isCreatingTariff}>
                  {isCreatingTariff ? 'Сохраняем…' : 'Сохранить тариф'}
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Название
                  <input value={newTariff.name || ''} onChange={(e) => setNewTariff((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label>
                  Описание
                  <input
                    value={newTariff.description || ''}
                    onChange={(e) => setNewTariff((p) => ({ ...p, description: e.target.value }))}
                  />
                </label>
                <label>
                  Цена
                  <input
                    type="number"
                    value={newTariff.price || ''}
                    onChange={(e) => setNewTariff((p) => ({ ...p, price: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Дней действия
                  <input
                    type="number"
                    value={newTariff.validDays || ''}
                    onChange={(e) => setNewTariff((p) => ({ ...p, validDays: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Протокол
                  <input
                    value={newTariff.protocolType || ''}
                    onChange={(e) => setNewTariff((p) => ({ ...p, protocolType: e.target.value }))}
                  />
                </label>
                <label>
                  Статус
                  <select
                    value={newTariff.active ? 'active' : 'hidden'}
                    onChange={(e) => setNewTariff((p) => ({ ...p, active: e.target.value === 'active' }))}
                  >
                    <option value="active">Активен</option>
                    <option value="hidden">Скрыт</option>
                  </select>
                </label>
              </div>
            </section>
            <TariffList tariffs={tariffs} onToggle={toggleTariff} />
          </div>
          <div className="column">
            <PaymentsTable payments={payments} />
            <Settings settings={settings} onChange={updateSettingField} onSave={saveSettings} saving={isSavingSettings} />
            <TextsCard
              title="Тексты сайта"
              description="Hero, подзаголовки и другие тексты с фронта"
              texts={siteTexts}
              onChange={changeSiteText}
              onSave={saveSiteTexts}
              saving={isSavingSite}
            />
            <TextsCard
              title="Тексты бота"
              description="Приветствия и подсказки из API"
              texts={botTexts}
              onChange={changeBotText}
              onSave={saveBotTexts}
              saving={isSavingBot}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
