# 🚀 Быстрое развертывание Telegram бота на Railway

## Шаги для развертывания:

### 1. Создать проект на Railway
- Перейти на [railway.app](https://railway.app)
- Нажать "New Project" → "Deploy from GitHub repo"
- Выбрать репозиторий и ветку `telegram-bot`

### 2. Настроить переменные окружения
В Railway Dashboard → Settings → Variables добавить:

```
BOT_TOKEN=8480976603:AAEGRcUo1KrjRpK7G4qqT93JllxYEL1rxMQ
GAME_SERVER_URL=https://your-main-app.railway.app
DATABASE_URL=/app/data/bot.sqlite
NODE_ENV=production
```

### 3. Получить домен
- В Settings → Domains скопировать домен
- Обновить переменную:
```
WEBHOOK_URL=https://your-bot-app.railway.app/webhook
```

### 4. Проверить работу
- Найти бота: `@energy_m_bot`
- Отправить `/start`
- Проверить меню и функции

## ✅ Готово!

Бот будет доступен по адресу `@energy_m_bot` в Telegram.

**Важно:** Бот развернут в отдельной ветке и изолирован от основной партнерки.






















