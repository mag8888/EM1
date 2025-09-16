# Конфигурация финансовых данных

## Описание

Централизованная конфигурация всех финансовых параметров игры для устранения хардкода.

## Файлы

- `financial-config.js` - Основной конфигурационный файл

## Использование

```javascript
// Создание экземпляра конфигурации
const config = new FinancialConfig();

// Получение стартового баланса
const startingBalance = config.getStartingBalance(); // 3000

// Получение данных профессии по умолчанию
const defaultProfession = config.getDefaultProfession();
// { salary: 10000, expenses: 6200, cashFlow: 3800, credit: 0 }

// Получение данных конкретной профессии
const doctorData = config.getProfessionData('Врач');
// { salary: 12000, expenses: 7000, cashFlow: 5000 }

// Получение настроек переводов
const transferConfig = config.getTransferConfig();
// { minAmount: 1, maxAmount: 1000000, fee: 0 }
```

## Конфигурация

### Стартовые значения
- `startingBalance`: 3000 - Начальный баланс игрока

### Профессии
- **Врач**: salary: 12000, expenses: 7000, cashFlow: 5000
- **Инженер**: salary: 10000, expenses: 6200, cashFlow: 3800
- **Учитель**: salary: 8000, expenses: 5000, cashFlow: 3000
- **Предприниматель**: salary: 15000, expenses: 8000, cashFlow: 7000
- **Программист**: salary: 11000, expenses: 6500, cashFlow: 4500

### Переводы
- `minAmount`: 1 - Минимальная сумма перевода
- `maxAmount`: 1000000 - Максимальная сумма перевода
- `fee`: 0 - Комиссия за перевод (в процентах)

### Кредиты
- `maxAmount`: 50000 - Максимальная сумма кредита
- `interestRate`: 0.15 - Процентная ставка (15% годовых)
- `minPayment`: 100 - Минимальный платеж

## Преимущества

1. **Централизация** - Все финансовые параметры в одном месте
2. **Гибкость** - Легко изменять значения без поиска по коду
3. **Консистентность** - Одинаковые значения во всех частях приложения
4. **Масштабируемость** - Легко добавлять новые профессии и параметры
5. **Тестируемость** - Легко тестировать с разными конфигурациями

## Миграция

Все хардкодные значения заменены на вызовы методов конфигурации:

- `3800` → `this.financialConfig.getDefaultProfession().cashFlow`
- `10000` → `this.financialConfig.getDefaultProfession().salary`
- `6200` → `this.financialConfig.getDefaultProfession().expenses`
- `3000` → `this.financialConfig.getStartingBalance()`
