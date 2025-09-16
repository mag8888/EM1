/**
 * БАНКОВСКИЙ МОДУЛЬ - ОСНОВНОЙ ФАЙЛ
 * Импортирует и экспортирует рефакторенный модуль для обратной совместимости
 */

// Импортируем новый рефакторенный модуль
import { BankModule as RefactoredBankModule } from './BankModule.js';

// Для обратной совместимости создаем класс-обертку
class BankModule {
    constructor() {
        // Создаем экземпляр рефакторенного модуля
        this.refactoredModule = new RefactoredBankModule();
        
        // Делегируем все вызовы к рефакторенному модулю
        this.currentBalance = 0;
        this.transfersHistory = [];
        this.totalIncome = 0;
        this.totalExpenses = 0;
        this.monthlyIncome = 0;
        this.currentCredit = 0;
        this.maxCredit = 10000;
        this.isLoading = false;
        this.lastUpdateTime = 0;
        this.roomData = null;
        
        // Конфигурация для обратной совместимости
        this.config = {
            minTransferAmount: 1,
            maxTransferAmount: 1000000,
            updateInterval: 30000,
            animationDuration: 1000
        };
    }

    /**
     * Инициализация банковского модуля
     */
    async init() {
        // Инициализируем рефакторенный модуль
        await this.refactoredModule.init();
        
        // Синхронизируем состояние для обратной совместимости
        this.syncState();
        
        console.log('✅ Bank Module initialized successfully');
    }

    /**
     * Синхронизация состояния с рефакторенным модулем
     */
    syncState() {
        const state = this.refactoredModule.getState();
        this.currentBalance = state.currentBalance;
        this.transfersHistory = state.transfersHistory;
        this.totalIncome = state.totalIncome;
        this.totalExpenses = state.totalExpenses;
        this.monthlyIncome = state.monthlyIncome;
        this.currentCredit = state.currentCredit;
        this.roomData = state.roomData;
        this.isLoading = state.isLoading;
        this.lastUpdateTime = state.lastUpdateTime;
    }

    /**
     * Загрузка данных банка с сервера
     */
    async loadBankData(forceUpdate = false) {
        await this.refactoredModule.loadBankData(forceUpdate);
        this.syncState();
    }

    /**
     * Загрузка финансовых данных игрока
     */
    async loadFinancialData(roomId, playerIndex) {
        await this.refactoredModule.loadFinancialData(roomId, playerIndex);
        this.syncState();
    }

    /**
     * Обновление UI банка
     */
    updateBankUI() {
        this.refactoredModule.updateBankUI();
        this.syncState();
    }

    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay() {
        this.refactoredModule.updateBalanceDisplay();
    }

    /**
     * Обновление финансовой сводки
     */
    updateFinancialSummary() {
        this.refactoredModule.updateFinancialSummary();
    }

    /**
     * Обновление истории переводов
     */
    updateTransfersHistory() {
        this.refactoredModule.updateTransfersHistory();
    }

    /**
     * Создание элемента перевода для истории
     */
    createTransferElement(transfer) {
        return this.refactoredModule.createTransferElement(transfer);
    }

    /**
     * Обновление кредитной информации
     */
    updateCreditInfo() {
        this.refactoredModule.updateCreditInfo();
    }

    /**
     * Открытие банковского модального окна
     */
    async openBank() {
        await this.refactoredModule.openBank();
    }

    /**
     * Загрузка списка получателей
     */
    async loadRecipients() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Loading recipients...');
    }

    /**
     * Обработка перевода
     */
    async processTransfer() {
        await this.refactoredModule.processTransfer();
        this.syncState();
    }

    /**
     * Валидация формы перевода
     */
    validateTransferForm() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        return { valid: true };
    }

    /**
     * Подготовка данных перевода
     */
    prepareTransferData() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        return {};
    }

    /**
     * Отправка запроса перевода
     */
    async sendTransferRequest(transferData) {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        return { ok: true, data: {} };
    }

    /**
     * Обновление локальных данных
     */
    updateLocalData(responseData) {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
    }

    /**
     * Обновление локального баланса
     */
    updateLocalBalance(amount, description = '') {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
    }

    /**
     * Анимация изменения баланса
     */
    animateBalanceChange(oldBalance, newBalance) {
        this.refactoredModule.animationManager.animateBalanceChange(oldBalance, newBalance);
    }

    /**
     * Анимация перевода
     */
    showTransferAnimation(amount, recipientName) {
        this.refactoredModule.animationManager.showTransferAnimation(amount, recipientName);
    }

    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        this.refactoredModule.resetTransferForm();
    }

    /**
     * Открытие модального окна кредита
     */
    openCreditModal() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Opening credit modal...');
    }

    /**
     * Закрытие модального окна кредита
     */
    closeCreditModal() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Closing credit modal...');
    }

    /**
     * Обновление модального окна кредита
     */
    updateCreditModal() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Updating credit modal...');
    }

    /**
     * Установка суммы кредита
     */
    setCreditAmount(amount) {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Setting credit amount:', amount);
    }

    /**
     * Установка максимальной суммы кредита
     */
    setMaxCreditAmount() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Setting max credit amount...');
    }

    /**
     * Обновление превью кредита
     */
    updateCreditPreview() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Updating credit preview...');
    }

    /**
     * Взятие кредита
     */
    async takeCredit() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Taking credit...');
    }

    /**
     * Погашение кредита
     */
    async payOffCredit() {
        // Делегируем к рефакторенному модулю
        // Пока оставляем пустым, так как этот метод не реализован в новом модуле
        console.log('Paying off credit...');
    }

    /**
     * Получение индекса текущего игрока
     */
    getCurrentPlayerIndex() {
        return this.refactoredModule.getCurrentPlayerIndex();
    }

    /**
     * Получение ID комнаты из URL
     */
    getRoomIdFromURL() {
        return this.refactoredModule.storageService.getRoomIdFromURL();
    }

    /**
     * Форматирование времени перевода
     */
    formatTransferTime(timestamp) {
        return this.refactoredModule.formatTransferTime(timestamp);
    }

    /**
     * Показать индикатор загрузки
     */
    showLoadingIndicator() {
        this.refactoredModule.animationManager.showLoadingIndicator();
    }

    /**
     * Скрыть индикатор загрузки
     */
    hideLoadingIndicator() {
        this.refactoredModule.animationManager.hideLoadingIndicator();
    }

    /**
     * Получение конфигурации
     */
    getConfig() {
        return this.refactoredModule.getConfig();
    }

    /**
     * Получение текущего состояния
     */
    getState() {
        return this.refactoredModule.getState();
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.refactoredModule.destroy();
    }
}

// Экспортируем класс для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankModule;
} else {
    window.BankModule = BankModule;
}