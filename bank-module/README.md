# БАНКОВСКИЙ МОДУЛЬ

Полная реализация всех банковских операций в отдельном модуле.

## 📁 Структура

```
bank-module/
├── bank.js          # Основная логика банковского модуля
├── bank.css         # Стили для банковских операций
├── bank.html        # HTML разметка для модальных окон
└── README.md        # Документация
```

## 🚀 Использование

### 1. Подключение к table.html

```html
<!-- Подключаем CSS -->
<link rel="stylesheet" href="bank-module/bank.css">

<!-- Подключаем интеграцию -->
<script src="bank-integration.js"></script>

<!-- Включаем HTML в body -->
<!--#include file="bank-module/bank.html"-->
```

### 2. Инициализация

```javascript
// Автоматически инициализируется при загрузке страницы
// Или вручную:
initBankModule();
```

### 3. Основные функции

```javascript
// Открыть банк
openBank();

// Закрыть банк
closeBankModal();

// Загрузить данные банка
loadBankData(forceUpdate);

// Обновить баланс локально
updateLocalBalance(amount, description);

// Обработать перевод
processTransfer();
```

## 🏦 Функциональность

### ✅ Реализовано

- **Управление балансом**: отображение, обновление, анимации
- **Переводы средств**: между игроками с валидацией
- **История операций**: фильтрация только своих операций
- **Финансовая сводка**: доходы, расходы, денежный поток
- **Кредитные операции**: взятие и погашение кредитов
- **Анимации**: переводы, изменения баланса, уведомления
- **Адаптивный дизайн**: работает на всех устройствах

### 🔧 API

#### BankModule Class

```javascript
class BankModule {
    constructor()
    async init()
    async loadBankData(forceUpdate)
    async loadFinancialData(roomId, playerIndex)
    updateBankUI()
    updateBalanceDisplay()
    updateFinancialSummary()
    updateTransfersHistory()
    updateCreditInfo()
    async openBank()
    closeBankModal()
    async loadRecipients()
    async processTransfer()
    validateTransferForm()
    prepareTransferData()
    async sendTransferRequest(transferData)
    resetTransferForm()
    showTransferAnimation(amount, recipientName)
    animateBalanceChange(oldBalance, newBalance)
    showLoadingIndicator()
    hideLoadingIndicator()
    showError(message)
    showSuccess(message)
    showNotification(message, type)
    getRoomIdFromURL()
    getCurrentPlayerIndex()
    getTimeAgo(date)
}
```

## 🎨 Стили

### Основные классы

- `.bank-modal` - модальное окно банка
- `.bank-card` - карточки с информацией
- `.transfer-item` - элемент истории операций
- `.bank-btn` - кнопки банковских операций
- `.balance-updated` - анимация обновления баланса

### Анимации

- `pulse` - пульсация для анимаций
- `slideIn` - появление уведомлений
- `balanceUpdated` - обновление баланса

## 🔄 Интеграция

### Замена функций в table.html

Все банковские функции из `table.html` заменены на вызовы банковского модуля:

```javascript
// Старые функции (удалить из table.html)
function loadBankData() { ... }
function openBank() { ... }
function processTransfer() { ... }
// и т.д.

// Новые функции (через банковский модуль)
window.loadBankData = loadBankData;
window.openBank = openBank;
window.processTransfer = processTransfer;
// и т.д.
```

### Глобальные переменные

```javascript
// Удалить из table.html:
let currentBalance = 0;
let transfersHistory = [];
let totalIncome = 0;
// и т.д.

// Использовать через банковский модуль:
bankModule.currentBalance
bankModule.transfersHistory
bankModule.totalIncome
// и т.д.
```

## 📱 Адаптивность

- **Desktop**: полная функциональность с двумя панелями
- **Tablet**: адаптивная компоновка
- **Mobile**: вертикальная компоновка, оптимизированные кнопки

## 🎯 Преимущества

1. **Модульность**: вся банковская логика в одном месте
2. **Переиспользование**: можно использовать в других проектах
3. **Тестируемость**: легко тестировать отдельно
4. **Поддержка**: проще поддерживать и обновлять
5. **Производительность**: оптимизированный код
6. **Читаемость**: четкая структура и документация

## 🔧 Настройка

### Конфигурация

```javascript
this.config = {
    minTransferAmount: 1,
    maxTransferAmount: 1000000,
    updateInterval: 30000, // 30 секунд
    animationDuration: 1000
};
```

### Кастомизация

- **Стили**: изменить `bank.css`
- **Логика**: изменить `bank.js`
- **UI**: изменить `bank.html`
- **Интеграция**: изменить `bank-integration.js`

## 📝 Логирование

Модуль использует подробное логирование для отладки:

```javascript
console.log('=== LOADING BANK DATA ===');
console.log('Balance updated to:', this.currentBalance);
console.log('Transfer validation passed');
// и т.д.
```

## 🚨 Обработка ошибок

- Валидация форм
- Проверка API ответов
- Обработка сетевых ошибок
- Пользовательские уведомления
- Fallback для старых данных

## 🔄 Обновления

### Версия 1.0.0
- Базовая функциональность банка
- Переводы между игроками
- История операций
- Кредитные операции
- Анимации и уведомления
- Адаптивный дизайн