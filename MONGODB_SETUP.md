# MongoDB Atlas Setup для EM1 Game

## 🎯 Цель
Настроить постоянное хранение комнат в MongoDB Atlas, чтобы они не терялись при перезапуске сервера.

## 🔧 Настройка MongoDB Atlas

### 1. Создание кластера
1. Перейдите на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Войдите в аккаунт или создайте новый
3. Создайте новый кластер (бесплатный M0)
4. Выберите регион (рекомендуется ближайший к Railway)

### 2. Настройка доступа
1. **Database Access:**
   - Создайте пользователя базы данных
   - Username: `em1-game-user`
   - Password: сгенерируйте надежный пароль
   - Database User Privileges: `Read and write to any database`

2. **Network Access:**
   - Добавьте IP адрес: `0.0.0.0/0` (для доступа с любого IP)
   - Или добавьте IP Railway: `0.0.0.0/0`

### 3. Получение строки подключения
1. Нажмите "Connect" на вашем кластере
2. Выберите "Connect your application"
3. Скопируйте строку подключения
4. Замените `<password>` на пароль пользователя
5. Замените `<dbname>` на `em2_game`

Пример строки подключения:
```
mongodb+srv://em1-game-user:<password>@cluster0.xxxxx.mongodb.net/em2_game?retryWrites=true&w=majority
```

## ⚙️ Настройка переменных окружения

### В Railway Dashboard:
1. Перейдите в настройки проекта
2. Добавьте переменные окружения:

```bash
MONGODB_URI=mongodb+srv://em1-game-user:<password>@cluster0.xxxxx.mongodb.net/em2_game?retryWrites=true&w=majority
MONGODB_DB_NAME=em2_game
```

### Локально (для разработки):
Создайте файл `.env` в корне проекта:

```bash
MONGODB_URI=mongodb+srv://em1-game-user:<password>@cluster0.xxxxx.mongodb.net/em2_game?retryWrites=true&w=majority
MONGODB_DB_NAME=em2_game
```

## 🏗️ Структура базы данных

### Коллекция `rooms`
```javascript
{
  _id: ObjectId,
  id: String,           // ID комнаты
  name: String,         // Название комнаты
  creatorId: String,    // ID создателя
  creatorName: String,  // Имя создателя
  creatorEmail: String, // Email создателя
  maxPlayers: Number,   // Максимум игроков
  minPlayers: Number,   // Минимум игроков
  turnTime: Number,     // Время хода в секундах
  status: String,       // Статус комнаты
  players: Array,       // Массив игроков
  gameState: Object,    // Полное состояние игры
  createdAt: Date,      // Дата создания
  updatedAt: Date       // Дата обновления
}
```

## 🔄 Как это работает

### При создании комнаты:
1. Комната создается в памяти сервера
2. Сохраняется в SQLite (резервная копия)
3. **Сохраняется в MongoDB Atlas** (основное хранилище)

### При загрузке сервера:
1. Сервер подключается к MongoDB Atlas
2. Загружает все комнаты из MongoDB
3. Восстанавливает их в памяти
4. Если MongoDB недоступен, загружает из SQLite

### При изменении комнаты:
1. Изменения сохраняются в памяти
2. **Автоматически синхронизируются с MongoDB**
3. Также сохраняются в SQLite (резервная копия)

## 🧪 Тестирование

### 1. Проверка подключения
После деплоя проверьте логи Railway:
```
✅ Connected to MongoDB Atlas
✅ Loaded X rooms from MongoDB
```

### 2. Тест персистентности
1. Создайте комнату в игре
2. Перезапустите сервер на Railway
3. Проверьте, что комната сохранилась

### 3. Проверка в MongoDB Atlas
1. Откройте MongoDB Atlas Dashboard
2. Перейдите в Database → Browse Collections
3. Выберите коллекцию `rooms`
4. Убедитесь, что комнаты сохраняются

## 🚨 Устранение неполадок

### Ошибка подключения к MongoDB
```
❌ Failed to connect to MongoDB Atlas
```
**Решение:**
- Проверьте правильность MONGODB_URI
- Убедитесь, что IP адрес добавлен в Network Access
- Проверьте пароль пользователя

### Комнаты не загружаются
```
❌ Failed to load rooms from MongoDB
```
**Решение:**
- Проверьте права доступа пользователя
- Убедитесь, что база данных `em2_game` существует
- Проверьте логи MongoDB Atlas

### Fallback на SQLite
Если MongoDB недоступен, сервер автоматически переключится на SQLite:
```
⚠️ MongoDB not available, using SQLite fallback
```

## 📊 Мониторинг

### В MongoDB Atlas:
1. **Metrics** - мониторинг производительности
2. **Logs** - логи подключений и запросов
3. **Alerts** - уведомления о проблемах

### В Railway:
1. **Logs** - логи приложения
2. **Metrics** - использование ресурсов
3. **Deployments** - история деплоев

## 🔒 Безопасность

### Рекомендации:
1. Используйте надежные пароли
2. Ограничьте доступ по IP (если возможно)
3. Регулярно обновляйте пароли
4. Мониторьте доступ к базе данных

### Backup:
- MongoDB Atlas автоматически создает резервные копии
- SQLite файл также служит дополнительной резервной копией

## ✅ Результат

После настройки:
- ✅ Комнаты сохраняются в MongoDB Atlas
- ✅ Данные не теряются при перезапуске сервера
- ✅ Автоматический fallback на SQLite
- ✅ Высокая доступность и надежность
- ✅ Масштабируемость для будущего роста

---

**Важно:** Убедитесь, что переменные окружения настроены правильно перед деплоем на Railway!
