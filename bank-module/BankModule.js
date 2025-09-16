/**
 * РЕФАКТОРЕННЫЙ БАНКОВСКИЙ МОДУЛЬ
 * Модульная архитектура с разделением ответственности
 */

import { BankConfig } from './core/Config.js';
import { Logger } from './core/Logger.js';
import { ErrorHandler, BankError } from './core/ErrorHandler.js';
import { ApiService } from './services/ApiService.js';
import { ValidationService } from './services/ValidationService.js';
import { StorageService } from './services/StorageService.js';
import { DomManager } from './ui/DomManager.js';
import { AnimationManager } from './ui/AnimationManager.js';

/**
 * Основной класс банковского модуля
 */
export class BankModule {
    constructor() {
        // Инициализация основных компонентов
        this.config = new BankConfig();
        this.logger = new Logger('BankModule');
        this.errorHandler = new ErrorHandler(this.logger);
        
        // Инициализация сервисов
        this.apiService = new ApiService(this.config, this.logger, this.errorHandler);
        this.validationService = new ValidationService(this.config, this.errorHandler);
        this.storageService = new StorageService(this.config, this.logger, this.errorHandler);
        
        // Инициализация UI менеджеров
        this.domManager = new DomManager(this.config, this.logger, this.errorHandler);
        this.animationManager = new AnimationManager(this.config, this.logger);
        
        // Состояние модуля
        this.state = {
            currentBalance: 0,
            totalIncome: 0,
            totalExpenses: 0,
            monthlyIncome: 0,
            currentCredit: 0,
            transfersHistory: [],
            roomData: null,
            isLoading: false,
            lastUpdateTime: 0
        };
        
        // Интервалы обновления
        this.updateInterval = null;
        
        this.logger.info('BankModule instance created');
    }

    /**
     * Инициализация банковского модуля
     * @returns {Promise<void>}
     */
    async init() {
        try {
            this.logger.group('Initializing Bank Module', () => {
                this.logger.info('Starting initialization...');
            });

            // Загружаем начальные данные
            await this.loadBankData(true);
            
            // Устанавливаем периодическое обновление
            this.startPeriodicUpdate();
            
            // Инициализируем UI
            this.initializeUI();
            
            this.logger.info('✅ Bank Module initialized successfully');
        } catch (error) {
            this.errorHandler.handle(error, 'BankModule initialization');
            throw error;
        }
    }

    /**
     * Загрузка данных банка
     * @param {boolean} forceUpdate - Принудительное обновление
     * @returns {Promise<void>}
     */
    async loadBankData(forceUpdate = false) {
        try {
            this.logger.group('Loading Bank Data', () => {
                this.logger.info(`Force update: ${forceUpdate}`);
            });

            // Получаем данные пользователя и комнаты
            const user = this.storageService.getUser();
            const roomId = this.storageService.getRoomIdFromURL();
            
            if (!user) {
                throw this.errorHandler.createValidationError('Пользователь не найден');
            }
            
            if (!roomId) {
                throw this.errorHandler.createValidationError('ID комнаты не найден');
            }

            // Проверяем кэш
            if (!forceUpdate) {
                const cachedData = this.storageService.getRoomDataFromCache(roomId);
                if (cachedData && this.state.currentBalance > 0) {
                    this.logger.debug('Using cached room data');
                    return;
                }
            }

            // Загружаем данные с сервера
            const roomData = await this.apiService.getRoomData(roomId, user.id);
            this.state.roomData = roomData;
            
            // Кэшируем данные
            this.storageService.setRoomDataCache(roomId, roomData);
            
            // Обновляем баланс
            await this.updateBalance(roomData, user.id, forceUpdate);
            
            // Загружаем финансовые данные
            const playerIndex = this.getPlayerIndex(roomData, user.id);
            if (playerIndex !== -1) {
                await this.loadFinancialData(roomId, playerIndex);
            }
            
            // Обновляем UI
            this.updateBankUI();
            
            this.logger.info('Bank data loaded successfully');
        } catch (error) {
            this.errorHandler.handle(error, 'Loading bank data');
            throw error;
        }
    }

    /**
     * Обновление баланса
     * @param {Object} roomData - Данные комнаты
     * @param {string} userId - ID пользователя
     * @param {boolean} forceUpdate - Принудительное обновление
     */
    async updateBalance(roomData, userId, forceUpdate = false) {
        const playerIndex = this.getPlayerIndex(roomData, userId);
        if (playerIndex === -1) {
            this.logger.warn('Player not found in room');
            return;
        }

        let newBalance = this.state.currentBalance;
        
        // Получаем баланс из новой структуры
        if (roomData.game_data?.player_balances?.[playerIndex] !== undefined) {
            newBalance = roomData.game_data.player_balances[playerIndex];
            this.logger.debug(`Balance loaded from game_data.player_balances: ${newBalance}`);
        } 
        // Или из старой структуры
        else if (roomData.players[playerIndex]?.balance !== undefined) {
            newBalance = roomData.players[playerIndex].balance;
            this.logger.debug(`Balance loaded from players[].balance: ${newBalance}`);
        }

        // Обновляем баланс если нужно
        if (forceUpdate || newBalance > this.state.currentBalance) {
            const oldBalance = this.state.currentBalance;
            this.state.currentBalance = newBalance;
            this.state.lastUpdateTime = Date.now();
            
            this.logger.info(`Balance updated: ${oldBalance} → ${newBalance}`);
            
            // Показываем анимацию
            this.animationManager.animateBalanceChange(oldBalance, newBalance);
        }

        // Обновляем историю переводов
        if (roomData.game_data?.transfers_history) {
            this.state.transfersHistory = roomData.game_data.transfers_history;
            this.logger.debug(`Transfers history loaded: ${this.state.transfersHistory.length} transfers`);
        }
    }

    /**
     * Загрузка финансовых данных
     * @param {string} roomId - ID комнаты
     * @param {number} playerIndex - Индекс игрока
     */
    async loadFinancialData(roomId, playerIndex) {
        try {
            // Проверяем кэш
            const cachedData = this.storageService.getFinancialDataFromCache(roomId, playerIndex);
            if (cachedData) {
                this.state.totalIncome = cachedData.totalIncome || 0;
                this.state.totalExpenses = cachedData.totalExpenses || 0;
                this.state.monthlyIncome = cachedData.monthlyIncome || 0;
                this.state.currentCredit = cachedData.currentCredit || 0;
                this.logger.debug('Using cached financial data');
                return;
            }

            const user = this.storageService.getUser();
            const data = await this.apiService.getPlayerFinancialData(roomId, playerIndex, user.id);
            
            this.state.totalIncome = data.totalIncome || 0;
            this.state.totalExpenses = data.totalExpenses || 0;
            this.state.monthlyIncome = data.cashFlow || 0;
            this.state.currentCredit = data.currentCredit || 0;
            
            // Кэшируем данные
            this.storageService.setFinancialDataCache(roomId, playerIndex, {
                totalIncome: this.state.totalIncome,
                totalExpenses: this.state.totalExpenses,
                monthlyIncome: this.state.monthlyIncome,
                currentCredit: this.state.currentCredit
            });
            
            this.logger.info('Financial data loaded successfully');
        } catch (error) {
            this.logger.warn('Failed to load financial data from API, using defaults');
            this.setDefaultFinancialData();
        }
    }

    /**
     * Установка финансовых данных по умолчанию
     */
    setDefaultFinancialData() {
        this.state.totalIncome = this.config.get('defaultIncome', 10000);
        this.state.totalExpenses = this.config.get('defaultExpenses', 6200);
        this.state.monthlyIncome = this.config.get('defaultCashFlow', 3800);
        this.state.currentCredit = this.config.get('defaultCredit', 0);
        
        this.logger.info('Using default financial data');
    }

    /**
     * Получение индекса игрока
     * @param {Object} roomData - Данные комнаты
     * @param {string} userId - ID пользователя
     * @returns {number} Индекс игрока
     */
    getPlayerIndex(roomData, userId) {
        return roomData.players.findIndex(p => p.user_id === userId);
    }

    /**
     * Обновление UI банка
     */
    updateBankUI() {
        this.logger.group('Updating Bank UI', () => {
            this.logger.debug('Current state:', this.state);
        });

        this.updateBalanceDisplay();
        this.updateFinancialSummary();
        this.updateTransfersHistory();
        this.updateCreditInfo();
        
        this.logger.info('Bank UI updated successfully');
    }

    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay() {
        const selectors = this.config.get('selectors', {});
        const balanceSelectors = [
            selectors.currentBalance,
            selectors.bankPreviewBalance,
            '[data-balance]',
            '.balance-amount',
            '#currentBalance'
        ];

        const balanceText = `$${this.state.currentBalance.toLocaleString()}`;
        
        balanceSelectors.forEach(selector => {
            if (selector) {
                this.domManager.updateText(selector, balanceText, true);
            }
        });

        this.logger.debug(`Balance updated to: ${balanceText}`);
    }

    /**
     * Обновление финансовой сводки
     */
    updateFinancialSummary() {
        const selectors = this.config.get('selectors', {});
        
        // Обновляем доходы
        if (selectors.totalIncome) {
            this.domManager.updateText(selectors.totalIncome, `$${this.state.totalIncome.toLocaleString()}`);
        }
        
        // Обновляем расходы
        if (selectors.totalExpenses) {
            this.domManager.updateText(selectors.totalExpenses, `$${this.state.totalExpenses.toLocaleString()}`);
        }
        
        // Обновляем месячный доход
        if (selectors.monthlyIncome) {
            this.domManager.updateText(selectors.monthlyIncome, `$${this.state.monthlyIncome.toLocaleString()}/мес`);
        }

        this.logger.debug('Financial summary updated');
    }

    /**
     * Обновление истории переводов
     */
    updateTransfersHistory() {
        const selectors = this.config.get('selectors', {});
        const historyContainer = selectors.transfersHistory;
        const historyCount = selectors.historyCount;
        
        if (!this.domManager.exists(historyContainer)) {
            this.logger.warn('Transfers history container not found');
            return;
        }

        // Очищаем контейнер
        this.domManager.clearContainer(historyContainer);
        
        if (this.state.transfersHistory.length === 0) {
            this.domManager.updateHTML(historyContainer, '<div class="no-transfers">История переводов пуста</div>');
            return;
        }

        // Фильтруем переводы для текущего игрока
        const user = this.storageService.getUser();
        const currentPlayerIndex = this.getCurrentPlayerIndex();
        const myTransfers = this.filterTransfersForPlayer(this.state.transfersHistory, currentPlayerIndex);
        
        if (myTransfers.length === 0) {
            this.domManager.updateHTML(historyContainer, '<div class="no-transfers">У вас пока нет операций</div>');
            return;
        }

        // Обновляем счетчик
        if (historyCount) {
            this.domManager.updateText(historyCount, myTransfers.length.toString());
        }

        // Создаем элементы переводов
        const sortedTransfers = [...myTransfers].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        sortedTransfers.forEach(transfer => {
            const transferElement = this.createTransferElement(transfer);
            this.domManager.appendElement(historyContainer, transferElement);
        });

        this.logger.debug(`Updated transfers history with ${sortedTransfers.length} transfers`);
    }

    /**
     * Фильтрация переводов для игрока
     * @param {Array} transfers - Список переводов
     * @param {number} playerIndex - Индекс игрока
     * @returns {Array} Отфильтрованные переводы
     */
    filterTransfersForPlayer(transfers, playerIndex) {
        return transfers.filter(transfer => {
            const isSender = transfer.sender_index === playerIndex;
            const isRecipient = transfer.recipient_index === playerIndex;
            const isBankToPlayer = transfer.sender_index === -1 && transfer.recipient_index === playerIndex;
            const isPlayerToBank = transfer.sender_index === playerIndex && transfer.recipient_index === -1;
            
            return isSender || isRecipient || isBankToPlayer || isPlayerToBank;
        });
    }

    /**
     * Создание элемента перевода
     * @param {Object} transfer - Данные перевода
     * @returns {Element} DOM элемент
     */
    createTransferElement(transfer) {
        const element = this.domManager.createElement('div', {
            className: 'transfer-item'
        });

        const senderName = this.getPlayerName(transfer.sender_index);
        const recipientName = this.getPlayerName(transfer.recipient_index);
        const timeAgo = this.formatTransferTime(transfer.timestamp);
        
        const isIncome = transfer.recipient_index === this.getCurrentPlayerIndex();
        const amountClass = isIncome ? 'income' : 'outgoing';
        const amountText = `${isIncome ? '+' : '-'}$${transfer.amount.toLocaleString()}`;

        element.innerHTML = `
            <div class="transfer-info">
                <div class="transfer-parties">${senderName} → ${recipientName}</div>
                <div class="transfer-description">${transfer.description || 'Перевод'}</div>
                <div class="transfer-time">${timeAgo}</div>
            </div>
            <div class="transfer-amount ${amountClass}">${amountText}</div>
        `;

        return element;
    }

    /**
     * Получение имени игрока
     * @param {number} playerIndex - Индекс игрока
     * @returns {string} Имя игрока
     */
    getPlayerName(playerIndex) {
        if (playerIndex === -1) {
            return 'Банк';
        }
        
        if (this.state.roomData?.players?.[playerIndex]) {
            return this.state.roomData.players[playerIndex].name || `Игрок ${playerIndex + 1}`;
        }
        
        return `Игрок ${playerIndex + 1}`;
    }

    /**
     * Форматирование времени перевода
     * @param {string|number} timestamp - Временная метка
     * @returns {string} Отформатированное время
     */
    formatTransferTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'только что';
        } else if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} мин назад`;
        } else if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} ч назад`;
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Обновление кредитной информации
     */
    updateCreditInfo() {
        const selectors = this.config.get('selectors', {});
        
        if (selectors.currentCredit) {
            this.domManager.updateText(selectors.currentCredit, `$${this.state.currentCredit.toLocaleString()}`);
        }
        
        if (selectors.maxCredit) {
            const maxCredit = Math.floor(this.state.monthlyIncome / 100) * 1000;
            this.domManager.updateText(selectors.maxCredit, `$${maxCredit.toLocaleString()}`);
        }

        this.logger.debug('Credit info updated');
    }

    /**
     * Получение индекса текущего игрока
     * @returns {number} Индекс игрока
     */
    getCurrentPlayerIndex() {
        const user = this.storageService.getUser();
        if (!user || !this.state.roomData) {
            return 0;
        }
        
        return this.getPlayerIndex(this.state.roomData, user.id);
    }

    /**
     * Инициализация UI
     */
    initializeUI() {
        // Здесь можно добавить инициализацию UI элементов
        this.logger.debug('UI initialized');
    }

    /**
     * Запуск периодического обновления
     */
    startPeriodicUpdate() {
        const interval = this.config.get('updateInterval', 30000);
        
        this.updateInterval = setInterval(() => {
            this.loadBankData(false);
        }, interval);
        
        this.logger.debug(`Periodic update started with interval: ${interval}ms`);
    }

    /**
     * Остановка периодического обновления
     */
    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.logger.debug('Periodic update stopped');
        }
    }

    /**
     * Получение конфигурации
     * @returns {Object} Конфигурация модуля
     */
    getConfig() {
        return this.config.getAll();
    }

    /**
     * Получение текущего состояния
     * @returns {Object} Состояние модуля
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopPeriodicUpdate();
        this.animationManager.clearAllAnimations();
        this.domManager.clearElementCache();
        this.storageService.clearCache();
        
        this.logger.info('BankModule destroyed');
    }

    // Публичные методы для совместимости с table.html
    
    /**
     * Открыть банк
     */
    async openBank() {
        // Реализация открытия банка
        this.logger.debug('Opening bank');
    }

    /**
     * Обработка перевода
     */
    async processTransfer() {
        // Реализация обработки перевода
        this.logger.debug('Processing transfer');
    }

    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        const selectors = this.config.get('selectors', {});
        
        if (selectors.recipientSelect) {
            this.domManager.setFormValue(selectors.recipientSelect, '');
        }
        
        if (selectors.transferAmount) {
            this.domManager.setFormValue(selectors.transferAmount, '');
        }
        
        this.logger.debug('Transfer form reset');
    }
}
