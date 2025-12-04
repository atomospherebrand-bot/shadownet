import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)

API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:6070/api')
BOT_TOKEN = os.getenv('BOT_TOKEN', '')

if not BOT_TOKEN:
    raise RuntimeError('BOT_TOKEN is required')

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


async def fetch_settings_and_texts():
    async with httpx.AsyncClient() as client:
        settings_resp = await client.get(f"{API_URL}/settings")
        texts_resp = await client.get(f"{API_URL}/settings/texts")
    settings_resp.raise_for_status()
    texts_resp.raise_for_status()
    return settings_resp.json(), texts_resp.json()


def render_support(settings: dict) -> str:
    lines = []
    if settings.get('supportEmail'):
        lines.append(f"Email: {settings['supportEmail']}")
    if settings.get('supportTelegram'):
        lines.append(f"Telegram: {settings['supportTelegram']}")
    if settings.get('supportChatUrl'):
        lines.append(f"Чат: {settings['supportChatUrl']}")
    return "\n".join(lines) or 'support@shadownet.live'


@dp.message(CommandStart())
async def start(message: types.Message):
    settings_payload, texts_payload = await fetch_settings_and_texts()
    start_payload = next((m for m in texts_payload.get('botMessages', []) if m['key'] == 'start'), None)
    start_text = start_payload['content'] if start_payload else 'Добро пожаловать в ShadowNet!'
    support_text = render_support(settings_payload)
    async with httpx.AsyncClient() as client:
        await client.post(f"{API_URL}/bot/users", json={
            "telegram_id": message.from_user.id,
            "username": message.from_user.username,
        })
    keyboard = [
        [types.KeyboardButton(text='Купить VPN')],
        [types.KeyboardButton(text='Профиль')],
        [types.KeyboardButton(text='Поддержка')],
    ]
    if start_payload and start_payload.get('imageUrl'):
        await message.answer_photo(
            photo=start_payload['imageUrl'],
            caption=f"{start_text}\nТарифы и ключи доступны через общий backend.\n{support_text}",
            reply_markup=types.ReplyKeyboardMarkup(keyboard=keyboard, resize_keyboard=True),
        )
    else:
        await message.answer(
            f"{start_text}\nТарифы и ключи доступны через общий backend.\n{support_text}",
            reply_markup=types.ReplyKeyboardMarkup(keyboard=keyboard, resize_keyboard=True),
        )


@dp.message()
async def echo(message: types.Message):
    if message.text == 'Купить VPN':
        async with httpx.AsyncClient() as client:
            tariffs = (await client.get(f"{API_URL}/bot/tariffs")).json()
        lines = [f"{t['id']}. {t['name']} — {t['price']} ₽" for t in tariffs]
        await message.answer(
            ('\n'.join(lines) or 'Тарифы не найдены') +
            '\nНапишите номер тарифа, чтобы получить ссылку на оплату.'
        )
    elif message.text == 'Профиль':
        async with httpx.AsyncClient() as client:
            keys = (
                await client.get(
                    f"{API_URL}/bot/keys/mine",
                    params={"telegram_id": message.from_user.id, "username": message.from_user.username},
                )
            ).json()
        if not keys:
            await message.answer('Пока нет купленных ключей')
        else:
            rendered = [f"{k['label'] or k['type']} — {k['rawUri']}" for k in keys]
            await message.answer('\n'.join(rendered))
    elif message.text == 'Поддержка':
        settings_payload, _ = await fetch_settings_and_texts()
        await message.answer(render_support(settings_payload))
    else:
        if message.text and message.text.strip().isdigit():
            tariff_id = int(message.text.strip())
            async with httpx.AsyncClient() as client:
                payment_resp = (
                    await client.post(
                        f"{API_URL}/bot/payments/create",
                        json={
                            "tariffId": tariff_id,
                            "telegramId": message.from_user.id,
                            "username": message.from_user.username,
                        },
                    )
                )
            if payment_resp.status_code != 200:
                await message.answer('Не удалось создать платёж, попробуйте другой тариф или позже.')
            else:
                payload = payment_resp.json()
                await message.answer(
                    f"Счёт #{payload['id']} на {payload['amount']} ₽. Оплатите по ссылке: {payload['paymentUrl']}\n"
                    f"Резерв ключа действует до {payload.get('reservedUntil', '—')}"
                )
        else:
            await message.answer('Используйте меню, чтобы купить VPN или открыть профиль.')


async def main():
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())
