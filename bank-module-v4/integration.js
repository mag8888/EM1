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
    
    // Обновляем только PlayerSummary - единственный источник истины
    updatePlayerSummary();
    
    console.log('🔄 Данные синхронизированы из BankModuleV4:', data);
}

// Удалены функции updateBalanceDisplay, updateFinancesDisplay, updateCreditDisplay
// Теперь все обновления происходят только через BankModuleV4 и PlayerSummary

/**
 * Обновление PlayerSummary из банковского модуля
 */
function updatePlayerSummary() {
    // Ищем PlayerSummary в глобальных модулях игры
    if (window.gameState && window.gameState.modules) {
        const playerSummary = window.gameState.modules.find(module => 
            module.constructor.name === 'PlayerSummary'
        );
        if (playerSummary && typeof playerSummary.render === 'function') {
            playerSummary.render();
        }
    }
    
    // Альтернативный способ - через прямой поиск в DOM
    const incomeEl = document.getElementById('incomeValue');
    const expenseEl = document.getElementById('expenseValue');
    const paydayEl = document.getElementById('paydayValue');
    const loanEl = document.getElementById('loanValue');
    const passiveIncomeEl = document.getElementById('passiveIncomeValue');
    
    if (bankModuleV4) {
        const data = bankModuleV4.getData();
        
        if (incomeEl) {
            incomeEl.textContent = `$${(data.income || 0).toLocaleString()}`;
        }
        if (expenseEl) {
            expenseEl.textContent = `$${(data.expenses || 0).toLocaleString()}`;
        }
        if (paydayEl) {
            paydayEl.textContent = `$${(data.payday || 0).toLocaleString()}/мес`;
        }
        if (loanEl) {
            loanEl.textContent = `$${(data.credit || 0).toLocaleString()}`;
        }
        if (passiveIncomeEl) {
            passiveIncomeEl.textContent = `$${(data.passiveIncome || 0).toLocaleString()}`;
        }
    }
}

// Удалены функции addBalance, subtractBalance, addMonthlyIncome
// Все финансовые операции теперь происходят только через BankModuleV4

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
    
    if (!bankModuleV4 && typeof window.initBankModuleV4 === 'function') {
        await window.initBankModuleV4();
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
    
    // Синхронизируем с банковским модулем - единственный источник истины
    if (bankModuleV4) {
        syncDataFromBankV4();
    }
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
window.updatePlayerSummary = updatePlayerSummary;
window.requestCreditLocal = requestCreditLocal;
window.payoffCredit = payoffCredit;
window.openBankModal = openBankModal;
window.closeBankModal = closeBankModal;
window.initializeFinances = initializeFinances;
window.safeCallBankFunction = safeCallBankFunction;
window.syncDataFromBankV4 = syncDataFromBankV4;

// Автоматическая синхронизация каждые 10 секунд
setInterval(async () => {
    if (bankModuleV4) {
        syncDataFromBankV4();
    } else if (typeof window.initBankModuleV4 === 'function') {
        // Попытка инициализации, если модуль не загружен
        try {
            await window.initBankModuleV4();
        } catch (error) {
            console.warn('⚠️ Не удалось инициализировать BankModuleV4:', error);
        }
    }
}, 10000);

console.log('🔗 Bank Module v4 Integration загружен');
