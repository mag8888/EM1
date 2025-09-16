/**
 * ИНТЕГРАЦИЯ БАНКОВСКОГО МОДУЛЯ
 * Подключение банковского модуля к table.html
 */

// bankModule объявлена в table.html

// Инициализация банковского модуля
async function initBankModule() {
    try {
        // Банковский модуль уже загружен через script tag в table.html
        if (typeof BankModule !== 'undefined') {
            bankModule = new BankModule();
            await bankModule.init();
            console.log('✅ Bank Module initialized successfully');
        } else {
            console.warn('BankModule class not found. Make sure bank-module/bank.js is loaded.');
        }
    } catch (error) {
        console.error('❌ Error initializing Bank Module:', error);
    }
}

// Глобальные функции-обертки для совместимости с table.html
async function loadBankData(forceUpdate = false) {
    if (bankModule) {
        await bankModule.loadBankData(forceUpdate);
    } else {
        console.warn('BankModule not initialized. Cannot load bank data.');
    }
}

function updateLocalBalance(amount, description = '') {
    if (bankModule) {
        const oldBalance = bankModule.currentBalance;
        bankModule.currentBalance += amount;
        bankModule.lastUpdateTime = Date.now();
        
        console.log(`💰 Локальное обновление баланса: ${oldBalance} ${amount > 0 ? '+' : ''}${amount} = ${bankModule.currentBalance} (${description})`);
        
        // Обновляем UI
        bankModule.updateBankUI();
        
        return bankModule.currentBalance;
    } else {
        console.warn('BankModule not initialized. Cannot update local balance.');
        return 0;
    }
}

async function openBank() {
    if (bankModule) {
        await bankModule.openBank();
    } else {
        console.warn('BankModule not initialized. Cannot open bank.');
    }
}

function closeBankModal() {
    if (bankModule) {
        bankModule.closeBankModal();
    } else {
        console.warn('BankModule not initialized. Cannot close bank modal.');
    }
}

async function processTransfer() {
    if (bankModule) {
        await bankModule.processTransfer();
    } else {
        console.warn('BankModule not initialized. Cannot process transfer.');
    }
}

// Инициализация происходит в table.html

// Экспортируем функции для глобального использования
window.loadBankData = loadBankData;
window.updateLocalBalance = updateLocalBalance;
window.openBank = openBank;
window.closeBankModal = closeBankModal;
window.processTransfer = processTransfer;