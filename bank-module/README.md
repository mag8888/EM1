# 🏦 Банковский модуль - Рефакторенная архитектура

## 📋 Обзор

Банковский модуль был полностью рефакторен с применением принципов SOLID и модульной архитектуры. Новый дизайн обеспечивает лучшую поддерживаемость, тестируемость и расширяемость.

## 🏗️ Архитектура

### Слои приложения

```
┌─────────────────────────────────────┐
│           UI Layer                  │
│  ┌─────────────────────────────────┐│
│  │     AnimationManager            ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │       DomManager               ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│        Service Layer                │
│  ┌─────────────────────────────────┐│
│  │       ApiService               ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │    ValidationService           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │      StorageService            ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │      TransferService           ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         Core Layer                  │
│  ┌─────────────────────────────────┐│
│  │         BankConfig             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │          Logger                ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │       ErrorHandler             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 📁 Структура файлов

```
bank-module/
├── core/                    # Основные компоненты
│   ├── Config.js           # Конфигурация
│   ├── Logger.js           # Система логирования
│   └── ErrorHandler.js     # Обработка ошибок
├── services/               # Сервисы
│   ├── ApiService.js       # Работа с API
│   ├── ValidationService.js # Валидация данных
│   ├── StorageService.js   # Работа с хранилищем
│   └── TransferService.js  # Обработка переводов
├── ui/                     # UI компоненты
│   ├── DomManager.js       # Управление DOM
│   └── AnimationManager.js # Анимации
├── BankModule.js           # Основной модуль
├── bank.js                 # Файл совместимости
└── README.md              # Документация
```

## 🔧 Основные компоненты

### 1. BankConfig
Централизованное хранение всех настроек и констант.

```javascript
const config = new BankConfig();
config.get('minTransferAmount'); // 1
config.set('customSetting', 'value');
```

### 2. Logger
Система логирования с уровнями важности.

```javascript
const logger = new Logger('BankModule');
logger.error('Error message', data);
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');
```

### 3. ErrorHandler
Централизованная обработка и классификация ошибок.

```javascript
const errorHandler = new ErrorHandler(logger);
try {
    // risky operation
} catch (error) {
    errorHandler.handle(error, 'Operation context');
}
```

### 4. ApiService
Централизованная работа с API сервера.

```javascript
const apiService = new ApiService(config, logger, errorHandler);
const roomData = await apiService.getRoomData(roomId, userId);
```

### 5. ValidationService
Централизованная валидация данных.

```javascript
const validationService = new ValidationService(config, errorHandler);
const result = validationService.validateTransferAmount(amount, balance);
```

### 6. StorageService
Работа с localStorage и кэшированием.

```javascript
const storageService = new StorageService(config, logger, errorHandler);
const user = storageService.getUser();
storageService.setCache('key', data);
```

### 7. DomManager
Управление DOM элементами с кэшированием.

```javascript
const domManager = new DomManager(config, logger, errorHandler);
domManager.updateText('#balance', '$1000');
domManager.createElement('div', { className: 'item' });
```

### 8. AnimationManager
Управление анимациями UI.

```javascript
const animationManager = new AnimationManager(config, logger);
animationManager.animateBalanceChange(1000, 1500);
animationManager.showTransferAnimation(500, 'John');
```

## 🚀 Использование

### Базовое использование

```javascript
// Создание экземпляра
const bankModule = new BankModule();

// Инициализация
await bankModule.init();

// Использование
await bankModule.loadBankData(true);
bankModule.updateBankUI();
```

### Расширенное использование

```javascript
// Получение конфигурации
const config = bankModule.getConfig();

// Получение состояния
const state = bankModule.getState();

// Очистка ресурсов
bankModule.destroy();
```

## 🔄 Обратная совместимость

Старый код продолжает работать без изменений благодаря классу-обертке в `bank.js`:

```javascript
// Старый код продолжает работать
const bankModule = new BankModule();
await bankModule.init();
bankModule.updateBankUI();
```

## 🧪 Тестирование

### Модульное тестирование

```javascript
// Тестирование отдельных компонентов
const config = new BankConfig();
const logger = new Logger('Test');
const errorHandler = new ErrorHandler(logger);

// Тестирование сервисов
const apiService = new ApiService(config, logger, errorHandler);
const validationService = new ValidationService(config, errorHandler);
```

### Интеграционное тестирование

```javascript
// Тестирование полного модуля
const bankModule = new BankModule();
await bankModule.init();
// Проверка состояния и поведения
```

## 📈 Преимущества новой архитектуры

### 1. Разделение ответственности (SRP)
- Каждый класс имеет одну ответственность
- Легче понимать и поддерживать код

### 2. Открытость/закрытость (OCP)
- Легко добавлять новые функции
- Существующий код не изменяется

### 3. Подстановка Лисков (LSP)
- Компоненты взаимозаменяемы
- Легко создавать моки для тестирования

### 4. Разделение интерфейсов (ISP)
- Клиенты зависят только от нужных им интерфейсов
- Меньше связанности

### 5. Инверсия зависимостей (DIP)
- Зависимости инжектируются
- Легко тестировать и мокать

## 🔧 Конфигурация

### Настройки по умолчанию

```javascript
{
    // Финансовые настройки
    defaultIncome: 10000,
    defaultExpenses: 6200,
    defaultCashFlow: 3800,
    defaultCredit: 0,
    maxCredit: 10000,
    
    // Настройки переводов
    minTransferAmount: 1,
    maxTransferAmount: 1000000,
    
    // Настройки обновления
    updateInterval: 30000,
    animationDuration: 1000,
    
    // Настройки кредитов
    creditMultiplier: 1000,
    creditRate: 100,
    
    // Настройки UI
    balanceAnimationDuration: 500,
    notificationDuration: 3000
}
```

### Кастомизация

```javascript
const config = new BankConfig();
config.set('minTransferAmount', 100);
config.set('updateInterval', 60000);
```

## 🐛 Обработка ошибок

### Типы ошибок

- `NETWORK_ERROR` - Ошибки сети
- `VALIDATION_ERROR` - Ошибки валидации
- `API_ERROR` - Ошибки API
- `DOM_ERROR` - Ошибки DOM
- `BUSINESS_LOGIC_ERROR` - Ошибки бизнес-логики
- `UNKNOWN_ERROR` - Неизвестные ошибки

### Обработка ошибок

```javascript
try {
    await bankModule.processTransfer();
} catch (error) {
    if (error instanceof BankError) {
        console.error('Bank error:', error.message);
        console.error('Error code:', error.code);
    }
}
```

## 📊 Производительность

### Оптимизации

1. **Кэширование DOM элементов** - Избегаем повторных поисков
2. **Кэширование данных** - Избегаем повторных запросов к API
3. **Ленивая загрузка** - Загружаем только необходимые компоненты
4. **Дебаунсинг** - Избегаем избыточных обновлений

### Мониторинг

```javascript
// Включение отладочного логирования
const logger = new Logger('BankModule');
logger.setLevel('DEBUG');

// Группировка логов
logger.group('Operation', () => {
    logger.info('Step 1');
    logger.info('Step 2');
});
```

## 🔮 Будущие улучшения

### Планируемые функции

1. **TypeScript поддержка** - Добавление типизации
2. **Web Workers** - Вынос тяжелых операций в фоновые потоки
3. **Service Worker** - Кэширование и офлайн поддержка
4. **Метрики** - Сбор метрик производительности
5. **A/B тестирование** - Поддержка экспериментов

### Расширяемость

```javascript
// Добавление нового сервиса
class CustomService {
    constructor(config, logger, errorHandler) {
        // Реализация
    }
}

// Интеграция в основной модуль
bankModule.addService('custom', new CustomService(config, logger, errorHandler));
```

## 📝 Лицензия

MIT License - свободное использование и модификация.

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📞 Поддержка

При возникновении проблем или вопросов:

1. Проверьте документацию
2. Посмотрите примеры использования
3. Создайте Issue в репозитории
4. Обратитесь к команде разработки