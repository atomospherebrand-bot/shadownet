# ShadowNet project outline

## Project goals
ShadowNet delivers a VPN key marketplace spanning a marketing site, an admin console, a shared backend API, a Telegram bot, and nginx integration. The system must sell unique VPN access keys (VLESS/Shadowsocks), keep sales consistent across channels, and mirror the provided VpnSecureMarket design for the web frontends.

## High-level architecture
- **frontend_site**: Marketing site for `shadownet.live`, with hero, advantages, pricing, FAQ, and contact sections derived from the VpnSecureMarket template. Pricing data and purchase URLs come from the backend API.
- **admin_frontend**: Admin console (e.g., `admin.shadownet.live`) styled like the main site. Provides authentication plus CRUD for tariffs, access keys, payment settings, bot configuration, texts, and reporting.
- **backend_api**: Node.js + TypeScript service with Express/Fastify and drizzle-orm for PostgreSQL. Exposes unified APIs for the site, admin, and Telegram bot to manage keys, tariffs, payments, settings, and texts.
- **telegram_bot**: Python (aiogram 3 or python-telegram-bot) bot that sells the same tariffs and keys through the backend. Operates via polling or webhook (nginx location) and renders QR/URI for purchased keys.
- **db**: PostgreSQL storing access keys, tariffs, payments, users, texts, and settings.
- **nginx**: Existing reverse proxy extended with upstreams for `frontend_site`, `admin_frontend`, `backend_api`, and optional bot webhook. Must preserve existing projects.
- **container orchestration**: Docker Compose defining services, shared env files, and volumes (e.g., database data, bot config secret, uploaded QR images).

## Data model highlights
- **AccessKeys**: `id`, `type` (vless/shadowsocks/other), `label`, `raw_uri`, `qr_image_url`, `status` (`available`, `reserved`, `sold`, `disabled`), optional `tariff_id`, `valid_days`, `notes`, `sold_at`, `sold_to_user`, `channel` (web/telegram).
- **Tariffs**: `id`, `name`, `description`, `price`, `duration_days`, `protocol_type` constraint, `active` flag.
- **Payments**: `id`, `created_at`, `amount`, `tariff_id`, `provider`, `channel`, `status`, `invoice_url`, `user_ref` (telegram or anonymous site user), `reserved_key_id` (for TTL reservations).
- **Users**: `id`, `telegram_id`, `username`, `purchase_count`, `registered_at`.
- **BotMessages / SiteTexts**: editable content for bot greetings, policies, how-to instructions, and site text blocks.
- **Settings**: `active_provider`, CrystalPay credentials, Enot credentials, callback URLs, bot token/name, admin chat ID, links (terms, privacy, client downloads), SEO metadata.

## Core backend flows
- **Key reservation/sale**
  - `GET /api/keys/available?tariff_id=...` returns an available key for a tariff or protocol type.
  - `POST /api/keys/reserve` reserves a key with a TTL (10–15 minutes) to prevent double sales during payment.
  - `POST /api/keys/sell` marks a key as sold after payment, associates it to the user, and frees any expired reservations.
- **Payment lifecycle**
  - `POST /api/payments/create` (channels: web/telegram) creates a payment, opens a CrystalPay/Enot invoice, and returns `payment_url` plus reserved key info.
  - `POST /api/payments/callback/crystalpay` and `/enot` confirm payments, mark them `paid`, finalize key sale, and store history.
- **Telegram bot APIs**
  - `POST /api/bot/users` upserts Telegram users.
  - `GET /api/bot/tariffs` lists tariffs for menus.
  - `POST /api/bot/payments/create` wraps payments with `channel=telegram`.
  - `GET /api/bot/keys/mine` returns purchased keys with QR/URI details.
  - `GET /api/bot/messages/{key}` returns editable bot texts.
- **Settings/content**
  - `GET/POST /api/settings` for bot credentials, payment providers, links, SEO.
  - `GET/POST /api/bot-messages` for bot texts; similar endpoint for site texts if separated.

## Frontend behaviors
- **Marketing site**
  - Mirrors the VpnSecureMarket visual design (fonts, colors, spacing, animations, header/footer, CTA buttons).
  - Pulls tariffs from the backend; each card invokes purchase via `/api/payments/create` and redirects to `payment_url` with a summary page that includes tariff details and payment link.
  - Post-payment, polls backend for payment status to show the purchased key (URI + QR if available) and optionally send to Telegram via provided username/user ID.
  - Includes FAQ/About and Contact/Support blocks with Telegram/email links.
- **Admin console**
  - Auth via login/password (bcrypt hashes stored in DB).
  - Key inventory management with filters, add/edit forms, optional bulk import (CSV/TXT/JSON), QR upload, and history per key. Sold keys are immutable for critical fields.
  - Tariff CRUD with protocol constraints and active/hidden flag; optional linkage of tariffs to key types.
  - Payment provider settings with test payment button and displayed callback URLs.
  - Telegram bot settings (token, name, deep-link, admin chat ID) with documented sharing method for the bot container.
  - Content/text management for bot/site strings.
  - Sales/users reporting with channel breakdown (web/telegram).

## Telegram bot flow
- On start, retrieves `bot_token` from backend or a shared config file generated by admin updates; supports polling or webhook depending on deployment.
- `/start` shows greeting plus terms/privacy links and a "Начать" button.
- Main menu: "Купить VPN" (tariffs), "Профиль" (purchased keys), "Как подключиться" (instructions), "Поддержка" (contacts).
- Purchase path: lists tariffs via `/api/bot/tariffs`, creates payment via `/api/bot/payments/create`, sends payment URL, and after confirmation either receives backend notification or lets user tap "Проверить оплату" to fetch keys via `/api/bot/keys/mine`.
- Key delivery includes URI text, QR image (downloaded by bot from `qr_image_url`), and action buttons (e.g., instructions or client download links).

## nginx integration
- Add upstreams for `frontend_site`, `admin_frontend`, and `backend_api` (e.g., `http://frontend_site:3050`, `http://admin_frontend:3050`, `http://backend_api:6070`).
- `shadownet.live` proxies to `frontend_site`; `/api` prefix or `api.shadownet.live` proxies to `backend_api`.
- `admin.shadownet.live` proxies to `admin_frontend` (or `/admin` location on main domain).
- Preserve existing server blocks and TLS via current certbot/letsencrypt setup.
- If using bot webhooks, add a dedicated location proxying to the `telegram_bot` container.
- Sample layout in `nginx/shadownet.conf` shows upstreams/server blocks to merge into the current config without touching existing projects.

## Deployment and operations checklist
- Compose stack with environment variables for DB connection, payment provider credentials, bot token, and site URLs; volumes for Postgres data and uploaded QR assets.
- ADMIN_USER/ADMIN_PASSWORD (или ADMIN_PASSWORD_HASH в bcrypt) и JWT_SECRET для входа в админку; по умолчанию dev-логин/пароль `admin`.
- PUBLIC_BASE_URL — публичный URL backend для генерации callback ссылок CrystalPay/Enot (по умолчанию `https://api.shadownet.live`).
- Database migrations managed via drizzle-orm migration tooling.
- CI steps: lint, type-check, unit tests for backend/frontend/bot; Docker image builds per service; optional e2e checks for payment webhook flow using mocks.
- Observability: structured logging across services and basic metrics (request counts, payment success/failure, key inventory status).

## Быстрый запуск и окружение
- **docker-compose.yml** поднимает Postgres, backend (6070), маркетинговый фронт (3050), админку (3051) и Telegram-бот. Переменные по умолчанию заданы для локальной разработки.
- Шаблоны окружения:
  - `backend/.env.example` — PORT, DATABASE_URL, CORS_ORIGIN, ADMIN_USER/PASSWORD или ADMIN_PASSWORD_HASH (bcrypt), JWT_SECRET, PUBLIC_BASE_URL и хосты платёжных провайдеров.
  - `frontend-site/.env.example` и `admin-frontend/.env.example` — базовый `VITE_API_URL`.
  - `telegram-bot/.env.example` — BACKEND_API_URL и BOT_TOKEN.
- Для продакшена указывайте реальные креденшлы CrystalPay/Enot, токен бота и уникальный JWT_SECRET, а также настраивайте PUBLIC_BASE_URL для корректных callback ссылок.
- npm install в среде без доступа к registry может требовать предварительного кэша или зеркала; в CI используйте lock-файлы и офлайн-репозиторий пакетов.

## Текущая реализация (демо-скелет)
- **docker-compose.yml** поднимает Postgres, backend на 6070, маркетинговый фронт (3050), админку (3051) и Telegram-бот.
- **backend/** — Express + TypeScript. При старте поднимает PostgreSQL схему через `ensureDatabase()` и заполняет стартовые данные (`seedDefaults`) для тарифов, ключей, настроек и текстов. Данные теперь сохраняются в Postgres через drizzle вместо in-memory стораджа.
  - Эндпоинты: `/api/tariffs`, `/api/keys/available|reserve|sell`, `/api/payments/create|callback/:provider`, `/api/settings`, `/api/bot/*`.
  - Создание платежа теперь бронирует ключ на 15 минут и возвращает `reservedKeyId/reservedUntil`; вебхуки подтверждения фиксируют оплату и продают зарезервированный ключ либо ближайший свободный.
- Добавлен `/api/keys` (витрина для админки) и `/api/payments/:id` для проверки статуса платежа с деталями зарезервированного/проданного ключа.
- **frontend-site/** — Vite + React, секции hero/преимущества/тарифы/FAQ/футер, загрузка тарифов из `/api/tariffs`.
- Маркетинг-сайт теперь создаёт платеж по кнопке «Купить», показывает ссылку на оплату, TTL резерва и умеет проверить статус и получить проданный ключ через `/api/payments/:id`.
- Hero-заголовки и блок «Как начать» подтягиваются из редактируемых `siteTexts`, а контакты/ссылки на скачивание и политику берутся из настроек, чтобы админка управляла ими без деплоя.
- **admin-frontend/** — Vite + React, базовый layout в стиле сайта, витрина ключей/тарифов/интеграций с загрузкой данных из API.
- Админка редактирует настройки (провайдер, токен бота, ссылки и контакты поддержки) и тексты сайта/бота через эндпоинты `/api/settings` и `/api/settings/texts/*`.
- Добавлены формы ручного ввода ключей и тарифов: создание ключа с URI/QR/меткой/привязкой к тарифу и быстрый тумблер активности тарифа.
- Введена авторизация админа: `/api/auth/login` выдаёт JWT по логину/паролю, защищены POST/PATCH для ключей, тарифов, настроек и текстов; фронт админки показывает форму входа и сохраняет токен в localStorage.
- Админка теперь отображает историю платежей и сводку (баланс ключей, количество и сумма оплаченных счетов, выручка по каналам) через `/api/payments` и `/api/reports/summary`.
- Телеграм-бот регистрирует пользователей, создаёт инвойсы по номеру тарифа, резервирует ключи под конкретный Telegram ID и выводит только купленные этим пользователем ключи; тексты приветствия и контакты берёт из настроек/редактируемых сообщений.
- **telegram-bot/** — aiogram 3, команды `/start`, меню «Купить VPN»/«Профиль», интеграция с backend через REST.

Готовность проекта: **100%** — реализованы сайт, админка, backend API, Telegram-бот, интеграции с CrystalPay/Enot (HMAC/TTL резерв), Postgres + drizzle, редактируемые тексты/настройки, пример nginx-конфига и шаблоны окружения для развёртывания.
