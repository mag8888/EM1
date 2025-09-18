/**
 * Bank Module v4 - Integration with table.html
 * Интеграция нового банковского модуля с игровым полем
 */

// Переменные для совместимости
let currentBalance = 0;
let monthlyIncome = 0;
let monthlyExpenses = 0;
let totalCredit = 0;
let creditPayment = 0;
let expensesBreakdown = { base: 0, credit: 0 };

/**
 * Синхронизация данных из банковского модуля v4
 */
function syncDataFromBankV4() {
    if (!bankModuleV4) return;
    
    const data = bankModuleV4.getData();
    
    // Обновляем глобальные переменные
    currentBalance = data.balance;
    monthlyIncome = data.income;
    monthlyExpenses = data.expenses;
    totalCredit = data.credit;
    
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
        balanceEl.textContent = `$${currentBalance.toLocaleString()}`;
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
        const payday = Math.max(0, monthlyIncome - monthlyExpenses);
        incomeEl.textContent = `$${payday.toLocaleString()}/мес`;
    }
    
    console.log(`💰 PAYDAY: доход $${monthlyIncome.toLocaleString()} - расходы $${monthlyExpenses.toLocaleString()} = $${Math.max(0, monthlyIncome - monthlyExpenses).toLocaleString()}`);
}

/**
 * Обновление кредита в table.html
 */
function updateCreditDisplay() {
    const creditEl = document.getElementById('currentCredit');
    if (creditEl) {
        creditEl.textContent = `$${totalCredit.toLocaleString()}`;
    }
    
    const maxCreditEl = document.getElementById('maxCredit');
    if (maxCreditEl) {
        const maxCredit = Math.max(0, monthlyIncome * 10);
        maxCreditEl.textContent = `$${maxCredit.toLocaleString()}`;
    }
}

/**
 * Добавление баланса (совместимость с table.html)
 */
async function addBalance(amount, description) {
    console.log(`💰 Добавление баланса: $${amount.toLocaleString()} - ${description}`);
    
    // Обновляем локальную переменную
    currentBalance += amount;
    
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
    
    // Обновляем локальную переменную
    currentBalance = Math.max(0, currentBalance - amount);
    
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
    
    monthlyIncome += amount;
    
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
    currentBalance = currentBalance || 0;
    monthlyIncome = monthlyIncome || 0;
    monthlyExpenses = monthlyExpenses || 0;
    totalCredit = totalCredit || 0;
    creditPayment = creditPayment || 0;
    
    if (!expensesBreakdown) {
        expensesBreakdown = { base: 0, credit: 0 };
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
window.currentBalance = currentBalance;
window.monthlyIncome = monthlyIncome;
window.monthlyExpenses = monthlyExpenses;
window.totalCredit = totalCredit;
window.creditPayment = creditPayment;
window.expensesBreakdown = expensesBreakdown;

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
