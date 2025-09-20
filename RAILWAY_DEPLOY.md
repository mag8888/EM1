# 🚀 Развертывание EM1 Game Board v2.0 на Railway

## 📋 Обзор

Данное руководство описывает процесс развертывания обновленной игровой логики EM1 Game Board v2.0 на платформе Railway.

## 🎯 Что нового в v2.0

### ✅ Реализованные компоненты:
- **Генерация клеток (леток)** - Полная система создания игрового поля
- **Система ходов** - Управление очередностью и фазами ходов
- **Бросок кубика и движение** - Интегрированная система броска и перемещения
- **Обработка событий** - Автоматическая обработка всех типов событий на клетках
- **Статистика и отладка** - Подробная аналитика игрового процесса

## 🛠️ Предварительные требования

### 1. Установка Railway CLI
```bash
# Вариант 1: через npm
npm install -g @railway/cli

# Вариант 2: через curl (Linux/macOS)
curl -fsSL https://railway.app/install.sh | sh

# Вариант 3: через Homebrew (macOS)
brew install railway
```

### 2. Авторизация в Railway
```bash
railway login
```

### 3. Проверка установки
```bash
railway whoami
```

## 📦 Подготовка к развертыванию

### 1. Проверка файлов
Убедитесь, что в проекте есть следующие файлы:
- ✅ `package.json` - обновлен для v2.0
- ✅ `railway.json` - конфигурация Railway
- ✅ `Procfile` - команда запуска
- ✅ `server.js` - основной сервер
- ✅ `assets/js/modules/game/` - новые игровые модули

### 2. Установка зависимостей
```bash
npm install
```

### 3. Локальное тестирование
```bash
npm start
# Откройте http://localhost:8080/api/health
```

## 🚀 Развертывание

### Автоматическое развертывание (рекомендуется)
```bash
./deploy-railway.sh
```

### Ручное развертывание

#### 1. Инициализация проекта в Railway
```bash
railway init
```

#### 2. Развертывание
```bash
railway up
```

#### 3. Получение URL
```bash
railway domain
```

## 🔧 Конфигурация

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

### package.json (ключевые части)
```json
{
  "name": "em1-game-board",
  "version": "2.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "mongodb": "^6.0.0",
    "mongoose": "^7.5.0"
  }
}
```

## 📊 Мониторинг и отладка

### 1. Проверка статуса
```bash
railway status
```

### 2. Просмотр логов
```bash
railway logs
```

### 3. Health check
```bash
curl $(railway domain)/api/health
```

### 4. Тестирование игровой логики
```bash
curl $(railway domain)/test
```

## 🎮 API Endpoints

### Основные endpoints:
- `GET /` - Главная страница
- `GET /game-board` - Игровое поле
- `GET /test` - Тестовая страница интеграции
- `GET /api/health` - Проверка состояния
- `GET /api/game-cells` - Игровые клетки
- `GET /api/cards` - Карты игры
- `GET /api/dreams` - Мечты игроков
- `GET /api/rooms` - Комнаты игры

### WebSocket события:
- `registerUser` - Регистрация пользователя
- `createRoom` - Создание комнаты
- `joinRoom` - Присоединение к комнате
- `leaveRoom` - Покидание комнаты

## 🔍 Отладка проблем

### 1. Проблемы с развертыванием
```bash
# Проверка логов сборки
railway logs --build

# Проверка статуса
railway status
```

### 2. Проблемы с базой данных
- Railway автоматически предоставляет MongoDB
- Проверьте переменные окружения: `railway variables`

### 3. Проблемы с WebSocket
- Убедитесь, что порт настроен правильно
- Проверьте CORS настройки

### 4. Проблемы с игровой логикой
- Откройте `/test` для тестирования компонентов
- Проверьте консоль браузера на ошибки

## 📈 Производительность

### Рекомендации:
- Используйте кэширование для статических файлов
- Оптимизируйте размеры изображений
- Настройте мониторинг производительности

### Мониторинг:
- Railway Dashboard предоставляет метрики
- Используйте `/api/health` для проверки состояния
- Логи доступны через Railway CLI

## 🔄 Обновления

### Обновление существующего развертывания:
```bash
git add .
git commit -m "Обновление до v2.1"
git push
railway up
```

### Откат к предыдущей версии:
```bash
railway rollback
```

## 🎯 Тестирование после развертывания

### 1. Базовое тестирование
```bash
# Health check
curl $(railway domain)/api/health

# Проверка игровых клеток
curl $(railway domain)/api/game-cells

# Проверка карт
curl $(railway domain)/api/cards
```

### 2. Тестирование игровой логики
1. Откройте `$(railway domain)/test`
2. Нажмите "Инициализировать систему"
3. Выполните все тесты компонентов
4. Проверьте статистику и логи

### 3. Тестирование WebSocket
1. Откройте `$(railway domain)/game-board`
2. Проверьте подключение к WebSocket
3. Создайте комнату и присоединитесь к ней

## 📞 Поддержка

### Полезные команды Railway:
```bash
railway help                    # Справка по командам
railway docs                    # Документация
railway support                 # Поддержка
```

### Логи и отладка:
```bash
railway logs --follow          # Следить за логами в реальном времени
railway logs --tail 100        # Последние 100 строк логов
railway status --json          # Статус в JSON формате
```

## 🎉 Заключение

После успешного развертывания у вас будет:

✅ **Работающая игровая логика v2.0** с генерацией клеток, системой ходов и обработкой событий
✅ **Масштабируемое развертывание** на Railway
✅ **Мониторинг и отладка** через Railway Dashboard
✅ **API для интеграции** с другими системами
✅ **WebSocket поддержка** для реального времени

Игровая система готова к использованию и дальнейшему развитию!
