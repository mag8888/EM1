/**
 * Банковский модуль v2 - Главный файл
 * Полностью переписанный модуль без дублирований
 */

// Проверяем зависимости
if (typeof window === 'undefined') {
    throw new Error('BankModule v2 requires browser environment');
}

if (typeof window.BankCore === 'undefined') {
    throw new Error('BankCore is required. Please load BankCore.js first');
}

if (typeof window.BankApiService === 'undefined') {
    throw new Error('BankApiService is required. Please load BankApiService.js first');
}

if (typeof window.BankUIService === 'undefined') {
    throw new Error('BankUIService is required. Please load BankUIService.js first');
}

if (typeof window.BankModule === 'undefined') {
    throw new Error('BankModule is required. Please load BankModule.js first');
}

// Создаем глобальный экземпляр банковского модуля
let bankModuleInstance = null;

/**
 * Инициализировать банковский модуль
 */
async function initBankModule() {
    console.log('🚀 Инициализация BankModule v2');
    
    try {
        // Создаем экземпляр модуля
        bankModuleInstance = new window.BankModule();
        
        // Инициализируем модуль
        await bankModuleInstance.init();
        
        console.log('✅ BankModule v2 инициализирован успешно');
        return bankModuleInstance;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации BankModule v2:', error);
        throw error;
    }
}

/**
 * Получить экземпляр банковского модуля
 */
function getBankModule() {
    if (!bankModuleInstance) {
        throw new Error('BankModule v2 not initialized. Call initBankModule() first');
    }
    return bankModuleInstance;
}

/**
 * Открыть банк
 */
async function openBank() {
    console.log('🏦 Открытие банка v2');
    
    try {
        const module = getBankModule();
        await module.openBank();
    } catch (error) {
        console.error('❌ Ошибка открытия банка:', error);
        if (typeof window.showError === 'function') {
            window.showError('Ошибка открытия банка: ' + error.message);
        } else {
            alert('Ошибка открытия банка: ' + error.message);
        }
    }
}

/**
 * Закрыть банк
 */
function closeBankModal() {
    console.log('🚪 Закрытие банка v2');
    
    try {
        const module = getBankModule();
        module.closeBank();
    } catch (error) {
        console.error('❌ Ошибка закрытия банка:', error);
    }
}

/**
 * Выполнить перевод
 */
async function executeTransfer() {
    console.log('💸 Выполнение перевода v2');
    
    try {
        const module = getBankModule();
        await module.executeTransfer();
    } catch (error) {
        console.error('❌ Ошибка выполнения перевода:', error);
        if (typeof window.showError === 'function') {
            window.showError('Ошибка выполнения перевода: ' + error.message);
        } else {
            alert('Ошибка выполнения перевода: ' + error.message);
        }
    }
}

// Обратная совместимость для старых страниц/обработчиков
async function processTransfer() {
    return executeTransfer();
}

/**
 * Сбросить форму перевода
 */
function resetTransferForm() {
    console.log('🔄 Сброс формы перевода v2');
    
    try {
        const module = getBankModule();
        module.uiService.resetTransferForm();
    } catch (error) {
        console.error('❌ Ошибка сброса формы:', error);
    }
}

/**
 * Обновить UI банка
 */
function updateBankUI() {
    console.log('🎨 Обновление UI банка v2');
    
    try {
        const module = getBankModule();
        module.updateUI();
    } catch (error) {
        console.error('❌ Ошибка обновления UI:', error);
    }
}

/**
 * Открыть кредитный модал
 */
function openCreditModal() {
    console.log('💳 Открытие кредитного модала v2');
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('Кредитный модуль в разработке', 'info');
    } else {
        alert('Кредитный модуль в разработке');
    }
}

/**
 * Уничтожить банковский модуль
 */
function destroyBankModule() {
    console.log('🗑️ Уничтожение BankModule v2');
    
    try {
        if (bankModuleInstance) {
            bankModuleInstance.destroy();
            bankModuleInstance = null;
        }
    } catch (error) {
        console.error('❌ Ошибка уничтожения модуля:', error);
    }
}

// Экспортируем функции в глобальную область
window.initBankModule = initBankModule;
window.getBankModule = getBankModule;
window.openBank = openBank;
window.closeBankModal = closeBankModal;
window.executeTransfer = executeTransfer;
window.processTransfer = processTransfer; // совместимость
window.resetTransferForm = resetTransferForm;
window.updateBankUI = updateBankUI;
window.openCreditModal = openCreditModal;
window.destroyBankModule = destroyBankModule;

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, инициализация BankModule v2');
        initBankModule().catch(error => {
            console.error('❌ Ошибка автоматической инициализации BankModule v2:', error);
        });
    });
} else {
    // DOM уже загружен
    console.log('📄 DOM уже загружен, инициализация BankModule v2');
    initBankModule().catch(error => {
        console.error('❌ Ошибка автоматической инициализации BankModule v2:', error);
    });
}

console.log('✅ BankModule v2 загружен и готов к использованию');
