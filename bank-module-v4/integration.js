/**
 * Bank Module v4 - Integration with table.html
 * Интеграция нового банковского модуля с игровым полем
 */

// Переменные для совместимости (если они еще не объявлены)
if (typeof window.currentBalance === 'undefined') window.currentBalance = 0;
if (typeof window.monthlyIncome === 'undefined') window.monthlyIncome = 0;
if (typeof window.monthlyExpenses === 'undefined') window.monthlyExpenses = 0;
if (typeof window.totalCredit === 'undefined') window.totalCredit = 0;
if (typeof window.creditPayment === 'undefined') window.creditPayment = 0;
if (typeof window.expensesBreakdown === 'undefined') window.expensesBreakdown = { base: 0, credit: 0 };

// Локальные ссылки для удобства (без объявления новых переменных)
// Используем прямое обращение к window объекту

/**
 * Синхронизация данных из банковского модуля v4
 */
function syncDataFromBankV4() {
    if (!bankModuleV4) return;
    
    const data = bankModuleV4.getData();
    
    // Обновляем глобальные переменные
    window.currentBalance = data.balance;
    window.monthlyIncome = data.income;
    window.monthlyExpenses = data.expenses;
    window.totalCredit = data.credit;
    
    // Обновляем отображение в table.html
    updateBalanceDisplay();
    updateFinancesDisplay();
    updateCreditDisplay();
    
    console.log('🔄 Данные синхронизированы из BankModuleV4:', data);
}

/**
 * Обновление баланса в table.html
 */
function updateBalanceDisplay() {
    const balanceEl = document.getElementById('currentBalance');
    if (balanceEl) {
        balanceEl.textContent = `$${window.currentBalance.toLocaleString()}`;
    }
    
    // Обновляем в банковском модуле
    if (bankModuleV4) {
        bankModuleV4.updateUI();
    }
}

/**
 * Обновление финансов в table.html
 */
function updateFinancesDisplay() {
    const incomeEl = document.getElementById('monthlyIncome');
    if (incomeEl) {
        const payday = Math.max(0, window.monthlyIncome - window.monthlyExpenses);
        incomeEl.textContent = `$${payday.toLocaleString()}/мес`;
    }
    
    console.log(`💰 PAYDAY: доход $${window.monthlyIncome.toLocaleString()} - расходы $${window.monthlyExpenses.toLocaleString()} = $${Math.max(0, window.monthlyIncome - window.monthlyExpenses).toLocaleString()}`);
}

/**
 * Обновление кредита в table.html
 */
function updateCreditDisplay() {
    const creditEl = document.getElementById('currentCredit');
    if (creditEl) {
        creditEl.textContent = `$${window.totalCredit.toLocaleString()}`;
    }
    
    const maxCreditEl = document.getElementById('maxCredit');
    if (maxCreditEl) {
        const maxCredit = Math.max(0, window.payday * 10);
        maxCreditEl.textContent = `$${maxCredit.toLocaleString()}`;
    }
}

/**
 * Добавление баланса (совместимость с table.html)
 */
async function addBalance(amount, description) {
    console.log(`💰 Добавление баланса: $${amount.toLocaleString()} - ${description}`);
    
    // Обновляем глобальную переменную
    window.currentBalance += amount;
    
    // Обновляем отображение
    updateBalanceDisplay();
    
    // Синхронизируем с банковским модулем
    if (bankModuleV4) {
        await bankModuleV4.loadData();
    }
}

/**
 * Вычитание баланса (совместимость с table.html)
 */
async function subtractBalance(amount, description) {
    console.log(`💸 Вычитание баланса: $${amount.toLocaleString()} - ${description}`);
    
    // Обновляем глобальную переменную
    window.currentBalance = Math.max(0, window.currentBalance - amount);
    
    // Обновляем отображение
    updateBalanceDisplay();
    
    // Синхронизируем с банковским модулем
    if (bankModuleV4) {
        await bankModuleV4.loadData();
    }
}

/**
 * Добавление месячного дохода (совместимость с table.html)
 */
function addMonthlyIncome(amount, description) {
    console.log(`📈 Добавление месячного дохода: $${amount.toLocaleString()} - ${description}`);
    
    window.monthlyIncome += amount;
    
    // Обновляем отображение
    updateFinancesDisplay();
    updateCreditDisplay();
    
    // Синхронизируем с банковским модулем
    if (bankModuleV4) {
        bankModuleV4.loadData();
    }
}

/**
 * Запрос кредита (совместимость с table.html)
 */
async function requestCreditLocal(amount = 1000) {
    console.log(`📄 Запрос кредита: $${amount.toLocaleString()}`);
    
    if (bankModuleV4) {
        const success = await bankModuleV4.requestCredit(amount);
        if (success) {
            // Синхронизируем данные
            syncDataFromBankV4();
        }
        return success;
    }
    
    return false;
}

/**
 * Погашение кредита (совместимость с table.html)
 */
async function payoffCredit() {
    console.log('📄 Погашение кредита');
    
    if (bankModuleV4) {
        const success = await bankModuleV4.payoffCredit();
        if (success) {
            // Синхронизируем данные
            syncDataFromBankV4();
        }
        return success;
    }
    
    return false;
}

/**
 * Открытие банка (совместимость с table.html)
 */
async function openBankModal() {
    console.log('🏦 Открытие банковского модального окна');
    
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        bankModuleV4.openBank();
    }
}

/**
 * Закрытие банка (совместимость с table.html)
 */
function closeBankModal() {
    console.log('🏦 Закрытие банковского модального окна');
    
    if (bankModuleV4) {
        bankModuleV4.closeBank();
    }
}

/**
 * Инициализация финансов (совместимость с table.html)
 */
function initializeFinances() {
    console.log('💰 Инициализация финансов');
    
    // Инициализируем переменные
    window.currentBalance = window.currentBalance || 0;
    window.monthlyIncome = window.monthlyIncome || 0;
    window.monthlyExpenses = window.monthlyExpenses || 0;
    window.totalCredit = window.totalCredit || 0;
    window.creditPayment = window.creditPayment || 0;
    
    if (!window.expensesBreakdown) {
        window.expensesBreakdown = { base: 0, credit: 0 };
    }
    
    // Синхронизируем с банковским модулем
    if (bankModuleV4) {
        syncDataFromBankV4();
    }
    
    // Обновляем отображение
    updateBalanceDisplay();
    updateFinancesDisplay();
    updateCreditDisplay();
}

/**
 * Безопасный вызов банковских функций
 */
function safeCallBankFunction(functionName, ...args) {
    try {
        if (window[functionName] && typeof window[functionName] === 'function') {
            return window[functionName](...args);
        } else {
            console.warn(`Банковская функция ${functionName} не найдена`);
            return null;
        }
    } catch (error) {
        console.error(`Ошибка при вызове банковской функции ${functionName}:`, error);
        return null;
    }
}

// Экспорт функций в глобальную область для совместимости
// Переменные уже объявлены выше

window.updateBalanceDisplay = updateBalanceDisplay;
window.updateFinancesDisplay = updateFinancesDisplay;
window.updateCreditDisplay = updateCreditDisplay;
window.addBalance = addBalance;
window.subtractBalance = subtractBalance;
window.addMonthlyIncome = addMonthlyIncome;
window.requestCreditLocal = requestCreditLocal;
window.payoffCredit = payoffCredit;
window.openBankModal = openBankModal;
window.closeBankModal = closeBankModal;
window.initializeFinances = initializeFinances;
window.safeCallBankFunction = safeCallBankFunction;
window.syncDataFromBankV4 = syncDataFromBankV4;

// Автоматическая синхронизация каждые 10 секунд
setInterval(() => {
    if (bankModuleV4) {
        syncDataFromBankV4();
    }
}, 10000);

console.log('🔗 Bank Module v4 Integration загружен');
