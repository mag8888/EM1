# Telegram Bot + MongoDB Integration

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
cd telegram-bot
npm install
```

### 2. Настройка переменных окружения
В Railway Dashboard добавьте:
```bash
MONGODB_URI=mongodb+srv://xqrmedia_db_user:9URUHWBY91UQPOsj@cluster0.wVumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=em_bot
JWT_SECRET=em1-production-secret-key-2024-railway
BOT_TOKEN=your_bot_token_here
```

### 3. Тестирование подключения
```bash
node test-mongodb.js
```

### 4. Запуск бота
```bash
npm start
```

## 📁 Структура проекта

```
telegram-bot/
├── models/                 # MongoDB модели
│   ├── UserModel.js       # Пользователи
│   ├── TransactionModel.js # Транзакции
│   └── ReferralModel.js   # Рефералы
├── config/
│   └── database-mongodb.js # Конфигурация MongoDB
├── api/
│   └── auth-api.js        # API авторизации
├── database-mongodb.js    # Основной класс Database
├── test-mongodb.js        # Тест подключения
└── README-MONGODB.md      # Эта документация
```

## 🔧 Функциональность

### ✅ Реализовано
- [x] Подключение к MongoDB Atlas
- [x] Модели для пользователей, транзакций, рефералов
- [x] API для авторизации через Telegram
- [x] JWT токены для безопасной авторизации
- [x] Синхронизация с основным приложением
- [x] Реферальная система
- [x] Система транзакций

### 🚧 В разработке
- [ ] Webhook для получения обновлений
- [ ] Интеграция с игровыми событиями
- [ ] Уведомления о выигрышах
- [ ] Статистика и аналитика

## 📡 API Endpoints

### Авторизация
- `POST /api/auth/telegram` - Вход через Telegram
- `GET /api/auth/me` - Информация о пользователе
- `POST /api/auth/link-game` - Связывание с игрой
- `GET /api/auth/stats/:telegramId` - Статистика

### Пример использования
```javascript
// Авторизация через Telegram
const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        telegramId: 123456789,
        username: 'username',
        firstName: 'Имя',
        lastName: 'Фамилия'
    })
});

const { success, token, user } = await response.json();
```

## 🔒 Безопасность

- JWT токены с 30-дневным сроком действия
- Валидация Telegram ID
- Защита от дублирования пользователей
- Логирование всех операций

## 📊 Мониторинг

### Логи подключения
```
✅ Bot connected to MongoDB Atlas
✅ User creation successful!
✅ User retrieval successful!
```

### Ошибки
```
❌ MongoDB connection failed!
❌ User creation failed: [error details]
```

## 🚀 Деплой

### Railway
1. Подключите репозиторий к Railway
2. Настройте переменные окружения
3. Деплой автоматически запустится

### Локально
```bash
npm start
```

## 🔄 Интеграция с игрой

Бот интегрирован с основным приложением через:
- Общую MongoDB базу данных
- JWT токены для авторизации
- API для синхронизации пользователей
- Реферальную систему

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `npm start`
2. Запустите тест: `node test-mongodb.js`
3. Проверьте переменные окружения
4. Убедитесь в доступности MongoDB

---

**Готово!** Бот готов к работе с MongoDB! 🎉
