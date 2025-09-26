# Настройка кнопки "Играть" в Telegram боте

## 🎯 Цель
Настроить кнопку "Играть" в Telegram боте для прямого входа в игру через авторизацию.

## ✅ Что реализовано

### 1. **Генерация ссылок с JWT токенами**
- Кнопка "Играть" теперь генерирует уникальную ссылку для каждого пользователя
- Ссылка содержит JWT токен с `telegramId` пользователя
- Токен действителен 1 час для безопасности

### 2. **Авторизация через Telegram**
- Добавлен endpoint `/auth/telegram` в основном сервере
- Автоматическое создание пользователей из Telegram
- Установка сессионных cookies для входа в игру

### 3. **Обновленные клавиатуры**
- `Keyboards.getPlayGameKeyboard(telegramId)` - принимает ID пользователя
- Автоматическая генерация ссылок с токенами
- Fallback на обычную ссылку при ошибках

## 🔧 Как это работает

### 1. **Пользователь нажимает "Играть"**
```javascript
// В keyboards.js
static getPlayGameKeyboard(telegramId = null, gameUrl = null) {
    let gameLink = gameUrl || process.env.GAME_SERVER_URL || 'https://em1-production.up.railway.app';
    
    if (telegramId) {
        // Создаем JWT токен
        const token = jwt.sign(
            { 
                telegramId: telegramId,
                type: 'telegram',
                timestamp: Date.now()
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        gameLink = `${gameLink}/auth/telegram?token=${token}`;
    }
    
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎮 Начать игру', url: gameLink }]
            ]
        }
    };
}
```

### 2. **Пользователь переходит по ссылке**
```
https://em1-production.up.railway.app/auth/telegram?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. **Сервер проверяет токен и авторизует**
```javascript
// В server.js
app.get('/auth/telegram', async (req, res) => {
    const { token } = req.query;
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Создаем или находим пользователя
    let user = findUserByTelegramId(decoded.telegramId);
    if (!user) {
        user = createTelegramUser(decoded.telegramId);
    }
    
    // Устанавливаем сессию и перенаправляем в игру
    res.cookie('authToken', sessionToken);
    res.redirect('/game.html?auth=telegram');
});
```

## 📋 Настройка

### 1. **Переменные окружения**
В Railway Dashboard добавьте:
```bash
GAME_SERVER_URL=https://em1-production.up.railway.app
JWT_SECRET=em1-production-secret-key-2024-railway
```

### 2. **Зависимости**
Убедитесь, что в `telegram-bot/package.json` есть:
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2"
  }
}
```

### 3. **Тестирование**
```bash
cd telegram-bot
node test-game-link.js
```

## 🎮 Примеры ссылок

### Без авторизации:
```
https://em1-production.up.railway.app/game.html
```

### С авторизацией через Telegram:
```
https://em1-production.up.railway.app/auth/telegram?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWxlZ3JhbUlkIjoxMjM0NTY3ODksInR5cGUiOiJ0ZWxlZ3JhbSIsInRpbWVzdGFtcCI6MTc1ODg2NDgzMTExNCwiaWF0IjoxNzU4ODY0ODMxLCJleHAiOjE3NTg4Njg0MzF9.dIQwHmYTZqQ2jotGiKnTELqsEs04lV9IG2GJWjR-l9I
```

## 🔒 Безопасность

### JWT токены:
- **Секретный ключ**: `JWT_SECRET` (одинаковый для бота и сервера)
- **Время жизни**: 1 час
- **Содержимое**: `telegramId`, `type`, `timestamp`

### Валидация:
- Проверка типа токена (`telegram`)
- Проверка времени жизни
- Автоматическое создание пользователей

## 📊 Логи

### Успешная авторизация:
```
🔐 Telegram auth attempt: 123456789
✅ New Telegram user created: 123456789
✅ Telegram user authenticated: 123456789
```

### Ошибки:
```
❌ Telegram auth error: [error details]
```

## 🚀 Деплой

### 1. **Обновление бота**
```bash
cd telegram-bot
git add .
git commit -m "Add game link with JWT authentication"
git push origin main
```

### 2. **Обновление основного сервера**
```bash
git add server.js
git commit -m "Add Telegram auth endpoint"
git push origin main
```

### 3. **Проверка в Railway**
- Убедитесь, что переменные окружения настроены
- Проверьте логи на ошибки
- Протестируйте кнопку "Играть" в боте

## 🧪 Тестирование

### 1. **Тест генерации ссылок**
```bash
cd telegram-bot
node test-game-link.js
```

### 2. **Тест авторизации**
1. Откройте бота в Telegram
2. Нажмите "Играть"
3. Перейдите по ссылке
4. Проверьте, что вы авторизованы в игре

### 3. **Проверка логов**
```bash
# В Railway Dashboard
# Проверьте логи основного приложения
# Проверьте логи бота
```

## ✅ Результат

После настройки:
- ✅ Кнопка "Играть" генерирует уникальные ссылки
- ✅ Пользователи авторизуются автоматически
- ✅ Создаются игровые аккаунты из Telegram
- ✅ Безопасная передача данных через JWT
- ✅ Логирование всех операций

---

**Готово!** Пользователи могут теперь входить в игру прямо из Telegram бота! 🎉
