/**
 * Банковский модуль - Главный модуль
 * Объединяет все компоненты банковской системы
 */

class BankModule {
    constructor() {
        console.log('🏦 BankModule: Инициализация главного модуля');
        
        // Инициализируем компоненты
        this.core = new BankCore();
        this.apiService = new BankApiService();
        this.uiService = new BankUIService();
        
        // Состояние модуля
        this.isInitialized = false;
        this.updateInterval = null;
        this.incomingTransfersInterval = null;
        
        // Привязываем контекст методов
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleBalanceChange = this.handleBalanceChange.bind(this);
        this.handleTransferAdded = this.handleTransferAdded.bind(this);
        
        // Подписываемся на события ядра
        this.setupEventListeners();
        
        console.log('✅ BankModule: Главный модуль инициализирован');
    }
    
    /**
     * Настроить слушатели событий
     */
    setupEventListeners() {
        console.log('🔗 BankModule: Настройка слушателей событий');
        
        this.core.on('stateChanged', this.handleStateChange);
        this.core.on('balanceChanged', this.handleBalanceChange);
        this.core.on('transferAdded', this.handleTransferAdded);
    }
    
    /**
     * Обработчик изменения состояния
     */
    handleStateChange({ newState }) {
        console.log('🔄 BankModule: Обработка изменения состояния', newState);
        
        // Обновляем UI при изменении состояния
        this.updateUI();
    }
    
    /**
     * Обработчик изменения баланса
     */
    handleBalanceChange({ oldBalance, newBalance, source }) {
        console.log('💰 BankModule: Обработка изменения баланса', { 
            oldBalance, newBalance, source 
        });
        
        // Анимируем изменение баланса
        this.uiService.animateBalanceChange(oldBalance, newBalance);
    }
    
    /**
     * Обработчик добавления перевода
     */
    handleTransferAdded(transfer) {
        console.log('📝 BankModule: Обработка добавления перевода', transfer);
        
        // Обновляем историю переводов
        this.updateTransfersHistory();
    }
    
    /**
     * Инициализировать модуль
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ BankModule: Модуль уже инициализирован');
            return;
        }
        
        console.log('🚀 BankModule: Запуск инициализации');
        
        try {
            // Загружаем начальные данные
            await this.loadInitialData();
            
            // Настраиваем периодические обновления
            this.setupPeriodicUpdates();
            
            this.isInitialized = true;
            console.log('✅ BankModule: Инициализация завершена успешно');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка инициализации:', error);
            throw error;
        }
    }
    
    /**
     * Загрузить начальные данные
     */
    async loadInitialData() {
        console.log('📊 BankModule: Загрузка начальных данных');
        
        try {
            const roomId = this.getRoomId();
            const userId = this.getUserId();
            
            if (!roomId || !userId) {
                throw new Error('Не удалось получить ID комнаты или пользователя');
            }
            
            // Загружаем данные комнаты
            const roomData = await this.apiService.loadRoomData(roomId, userId);
            this.core.setRoomData(roomData);
            
            // Устанавливаем индекс текущего игрока
            const playerIndex = this.getCurrentPlayerIndex(roomData);
            this.core.setCurrentPlayerIndex(playerIndex);
            
            // Обновляем состояние на основе данных комнаты
            this.updateStateFromRoomData(roomData, playerIndex);
            
            console.log('✅ BankModule: Начальные данные загружены');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка загрузки начальных данных:', error);
            throw error;
        }
    }
    
    /**
     * Обновить состояние на основе данных комнаты
     */
    updateStateFromRoomData(roomData, playerIndex) {
        console.log('🔄 BankModule: Обновление состояния из данных комнаты', { 
            playerIndex, 
            hasGameData: !!roomData.game_data 
        });
        
        const gameData = roomData.game_data;
        if (!gameData) {
            console.warn('⚠️ BankModule: Данные игры не найдены');
            return;
        }
        
        // Обновляем баланс
        const balance = gameData.player_balances?.[playerIndex] || 0;
        this.core.updateBalance(balance, 'roomData');
        
        // Обновляем финансовые данные
        const financialData = this.extractFinancialData(roomData, playerIndex);
        this.core.setState({
            totalIncome: financialData.totalIncome,
            totalExpenses: financialData.totalExpenses,
            monthlyIncome: financialData.monthlyIncome,
            currentCredit: financialData.currentCredit,
            maxCredit: financialData.maxCredit
        });
        
        // Обновляем историю переводов
        const transfers = gameData.transfers_history || [];
        this.core.setState({ transfersHistory: transfers });
        
        console.log('✅ BankModule: Состояние обновлено из данных комнаты');
    }
    
    /**
     * Извлечь финансовые данные
     */
    extractFinancialData(roomData, playerIndex) {
        const player = roomData.players?.[playerIndex];
        const professionData = player?.profession_data;
        
        return {
            totalIncome: professionData?.salary || 0,
            totalExpenses: professionData?.expenses || 0,
            monthlyIncome: professionData?.cash_flow || professionData?.cashFlow || 0,
            currentCredit: professionData?.currentCredit || 0,
            maxCredit: this.calculateMaxCredit(professionData?.cash_flow || professionData?.cashFlow || 0)
        };
    }
    
    /**
     * Рассчитать максимальный кредит
     */
    calculateMaxCredit(monthlyIncome) {
        return Math.floor(monthlyIncome / 100) * 1000;
    }
    
    /**
     * Настроить периодические обновления
     */
    setupPeriodicUpdates() {
        console.log('⏰ BankModule: Настройка периодических обновлений');
        
        // Основные обновления каждые 60 секунд
        this.updateInterval = setInterval(() => {
            this.loadBankData(false);
        }, 60000);
        
        // Проверка входящих переводов каждые 5 секунд
        this.incomingTransfersInterval = setInterval(() => {
            this.checkForIncomingTransfers();
        }, 5000);
        
        console.log('✅ BankModule: Периодические обновления настроены');
    }
    
    /**
     * Загрузить данные банка
     */
    async loadBankData(forceUpdate = false) {
        console.log('📊 BankModule: Загрузка данных банка', { forceUpdate });
        
        try {
            const roomId = this.getRoomId();
            const userId = this.getUserId();
            
            if (!roomId || !userId) {
                console.warn('⚠️ BankModule: ID комнаты или пользователя не найдены');
                return;
            }
            
            const roomData = await this.apiService.loadRoomData(roomId, userId);
            const playerIndex = this.getCurrentPlayerIndex(roomData);
            
            // Обновляем данные комнаты
            this.core.setRoomData(roomData);
            this.core.setCurrentPlayerIndex(playerIndex);
            
            // Обновляем состояние если нужно
            if (forceUpdate || !this.core.state.hasLocalChanges) {
                this.updateStateFromRoomData(roomData, playerIndex);
            } else {
                console.log('🛡️ BankModule: Локальные изменения обнаружены, пропускаем обновление');
            }
            
            console.log('✅ BankModule: Данные банка загружены');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка загрузки данных банка:', error);
        }
    }
    
    /**
     * Проверить входящие переводы
     */
    async checkForIncomingTransfers() {
        if (this.core.state.hasLocalChanges) {
            console.log('🛡️ BankModule: Пропускаем проверку входящих переводов - есть локальные изменения');
            return;
        }
        
        try {
            const roomId = this.getRoomId();
            const userId = this.getUserId();
            
            if (!roomId || !userId) return;
            
            const roomData = await this.apiService.loadRoomData(roomId, userId);
            const playerIndex = this.getCurrentPlayerIndex(roomData);
            const serverBalance = roomData.game_data?.player_balances?.[playerIndex] || 0;
            const currentBalance = this.core.state.currentBalance;
            
            if (serverBalance > currentBalance) {
                const difference = serverBalance - currentBalance;
                console.log('💰 BankModule: Получен входящий перевод!', { 
                    difference, 
                    oldBalance: currentBalance, 
                    newBalance: serverBalance 
                });
                
                this.core.updateBalance(serverBalance, 'incomingTransfer');
                this.uiService.showNotification(`Получен перевод: +$${difference.toLocaleString()}`, 'success');
            }
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка проверки входящих переводов:', error);
        }
    }
    
    /**
     * Выполнить перевод
     */
    async executeTransfer() {
        console.log('💸 BankModule: Выполнение перевода');
        
        try {
            // Валидируем форму
            const validation = this.uiService.validateTransferForm();
            if (!validation.isValid) {
                this.uiService.showNotification(validation.error, 'error');
                return;
            }
            
            const { amount, recipientIndex } = validation;
            const currentBalance = this.core.state.currentBalance;
            
            // Проверяем достаточность средств
            if (amount > currentBalance) {
                this.uiService.showNotification('Недостаточно средств', 'error');
                return;
            }
            
            // Показываем индикатор загрузки
            this.uiService.showLoadingIndicator('Выполнение перевода...');
            this.core.setLoading(true);
            
            // Выполняем перевод
            const roomId = this.getRoomId();
            const userId = this.getUserId();
            
            try {
                await this.apiService.executeTransfer(roomId, userId, recipientIndex, amount);
            } catch (apiError) {
                const msg = apiError?.message || 'Ошибка сервера';
                // Показываем подробности для аудита
                this.uiService.showNotification(`Ошибка перевода: ${msg}`, 'error');
                throw apiError;
            }
            
            // Обновляем локальное состояние
            const newBalance = currentBalance - amount;
            this.core.updateBalance(newBalance, 'outgoingTransfer');
            this.core.setLocalChanges(true);
            
            // Добавляем перевод в историю
            const transfer = {
                sender_index: this.core.currentPlayerIndex,
                recipient_index: recipientIndex,
                amount: amount,
                description: `Перевод игроку ${this.getPlayerName(recipientIndex)}`,
                timestamp: new Date().toISOString()
            };
            
            this.core.addTransferToHistory(transfer);
            
            // Показываем уведомление
            this.uiService.showNotification(`Перевод $${amount.toLocaleString()} выполнен успешно!`, 'success');
            
            // Сбрасываем форму
            this.uiService.resetTransferForm();

            // Немедленно синхронизируемся с сервером, чтобы зафиксировать перевод
            await this.loadBankData(true);
            this.core.setLocalChanges(false);
            
            console.log('✅ BankModule: Перевод выполнен успешно');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка выполнения перевода:', error);
            this.uiService.showNotification('Ошибка выполнения перевода', 'error');
        } finally {
            this.uiService.hideLoadingIndicator();
            this.core.setLoading(false);
        }
    }

    /**
     * Обратная совместимость: старое имя метода
     */
    async processTransfer() {
        return this.executeTransfer();
    }
    
    /**
     * Обновить UI
     */
    updateUI() {
        console.log('🎨 BankModule: Обновление UI');
        
        const state = this.core.getState();
        
        // Обновляем баланс
        this.uiService.updateBalanceDisplay(state.currentBalance);
        
        // Обновляем финансовую сводку
        this.uiService.updateFinancialSummary({
            totalIncome: state.totalIncome,
            totalExpenses: state.totalExpenses,
            monthlyIncome: state.monthlyIncome,
            currentCredit: state.currentCredit,
            maxCredit: state.maxCredit
        });
        
        // Обновляем историю переводов
        this.uiService.updateTransfersHistory(state.transfersHistory, this.core.currentPlayerIndex);
        
        // Обновляем список получателей
        if (this.core.roomData?.players) {
            this.uiService.updateRecipientsList(this.core.roomData.players, this.core.currentPlayerIndex);
        }
        
        console.log('✅ BankModule: UI обновлен');
    }
    
    /**
     * Обновить историю переводов
     */
    updateTransfersHistory() {
        console.log('📋 BankModule: Обновление истории переводов');
        
        const state = this.core.getState();
        this.uiService.updateTransfersHistory(state.transfersHistory, this.core.currentPlayerIndex);
    }
    
    /**
     * Открыть банк
     */
    async openBank() {
        console.log('🏦 BankModule: Открытие банка');
        
        try {
            this.uiService.showLoadingIndicator('Загрузка банка...');
            await this.loadBankData(true);
            
            const modal = document.getElementById('bankModal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => modal.classList.add('modal-show'), 10);
            }
            
            console.log('✅ BankModule: Банк открыт');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка открытия банка:', error);
            this.uiService.showNotification('Ошибка открытия банка', 'error');
        } finally {
            this.uiService.hideLoadingIndicator();
        }
    }
    
    /**
     * Закрыть банк
     */
    closeBank() {
        console.log('🚪 BankModule: Закрытие банка');
        
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('modal-show');
        }
        
        console.log('✅ BankModule: Банк закрыт');
    }
    
    /**
     * Получить ID комнаты
     */
    getRoomId() {
        try {
            // 1) Предпочтительно из helper'а
            if (typeof window.getRoomIdFromURL === 'function') {
                const fromHelper = window.getRoomIdFromURL();
                if (fromHelper) return fromHelper;
            }
            // 2) Глобальные переменные
            if (window.room_id) return window.room_id;
            if (window.roomId) return window.roomId;
            // 3) data-атрибут на body или html
            const attrRoom = document.body?.getAttribute('data-room-id') || document.documentElement?.getAttribute('data-room-id');
            if (attrRoom) return attrRoom;
            // 4) localStorage / sessionStorage
            const lsRoom = localStorage.getItem('room_id') || localStorage.getItem('roomId');
            if (lsRoom) return lsRoom;
            const ssRoom = sessionStorage.getItem('room_id') || sessionStorage.getItem('roomId');
            if (ssRoom) return ssRoom;
            // 5) Попытка извлечь из URL пути /rooms/:id или ?id=
            const url = new URL(window.location.href);
            const byQuery = url.searchParams.get('id') || url.searchParams.get('room') || url.searchParams.get('roomId');
            if (byQuery) return byQuery;
            const pathMatch = url.pathname.match(/rooms\/(\w[\w-]*)/i);
            if (pathMatch && pathMatch[1]) return pathMatch[1];
        } catch (e) {
            console.warn('BankModule: Ошибка при попытке получить roomId', e);
        }
        return null;
    }
    
    /**
     * Получить ID пользователя
     */
    getUserId() {
        try {
            // 1) Из объекта user в localStorage
            const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (rawUser) {
                const user = JSON.parse(rawUser);
                const candidate = user?.id || user?._id || user?.user_id || user?.userId;
                if (candidate) return candidate;
            }
            // 2) Отдельные ключи
            const direct = localStorage.getItem('user_id') || localStorage.getItem('userId') || sessionStorage.getItem('user_id') || sessionStorage.getItem('userId');
            if (direct) return direct;
            // 3) Глобальные переменные
            if (window.currentUser?.id) return window.currentUser.id;
            if (window.user?.id) return window.user.id;
        } catch (error) {
            console.error('❌ BankModule: Ошибка получения ID пользователя:', error);
        }
        return null;
    }
    
    /**
     * Получить индекс текущего игрока
     */
    getCurrentPlayerIndex(roomData) {
        const userId = this.getUserId();
        if (!userId || !roomData?.players) return 0;
        
        return roomData.players.findIndex(player => player.user_id === userId);
    }
    
    /**
     * Получить имя игрока
     */
    getPlayerName(playerIndex) {
        const player = this.core.roomData?.players?.[playerIndex];
        return player?.name || `Игрок ${playerIndex + 1}`;
    }
    
    /**
     * Запросить кредит
     */
    async requestCredit() {
        console.log('💳 BankModule: Запрос кредита');
        
        try {
            const maxCredit = this.core.state.maxCredit;
            const currentCredit = this.core.state.currentCredit;
            const availableCredit = maxCredit - currentCredit;
            
            if (availableCredit <= 0) {
                this.uiService.showNotification('Кредитный лимит исчерпан', 'error');
                return;
            }
            
            // Простой запрос на максимально доступную сумму
            const amount = Math.min(availableCredit, 1000); // Максимум 1000 за раз
            
            const roomId = this.getRoomId();
            const userId = this.getUserId();
            
            if (!roomId || !userId) {
                this.uiService.showNotification('Ошибка: не найдены ID комнаты или пользователя', 'error');
                return;
            }
            
            this.uiService.showLoadingIndicator('Запрос кредита...');
            
            await this.apiService.requestCredit(roomId, userId, amount);
            
            // Обновляем локальное состояние
            const newCredit = currentCredit + amount;
            this.core.updateState({
                currentCredit: newCredit
            });
            
            this.uiService.showNotification(`Кредит $${amount.toLocaleString()} одобрен!`, 'success');
            
            // Обновляем UI
            this.updateUI();
            
            console.log('✅ BankModule: Кредит запрошен успешно');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка запроса кредита:', error);
            this.uiService.showNotification('Ошибка запроса кредита', 'error');
        } finally {
            this.uiService.hideLoadingIndicator();
        }
    }
    
    /**
     * Погасить кредит
     */
    async payoffCredit() {
        console.log('💳 BankModule: Погашение кредита');
        
        try {
            const currentCredit = this.core.state.currentCredit;
            const currentBalance = this.core.state.currentBalance;
            
            if (currentCredit <= 0) {
                this.uiService.showNotification('У вас нет задолженности', 'info');
                return;
            }
            
            const payoffAmount = Math.min(currentCredit, currentBalance);
            
            if (payoffAmount <= 0) {
                this.uiService.showNotification('Недостаточно средств для погашения', 'error');
                return;
            }
            
            const roomId = this.getRoomId();
            const userId = this.getUserId();
            
            if (!roomId || !userId) {
                this.uiService.showNotification('Ошибка: не найдены ID комнаты или пользователя', 'error');
                return;
            }
            
            this.uiService.showLoadingIndicator('Погашение кредита...');
            
            await this.apiService.payoffCredit(roomId, userId, payoffAmount);
            
            // Обновляем локальное состояние
            const newCredit = currentCredit - payoffAmount;
            const newBalance = currentBalance - payoffAmount;
            
            this.core.updateState({
                currentCredit: newCredit,
                currentBalance: newBalance
            });
            
            this.uiService.showNotification(`Кредит погашен на $${payoffAmount.toLocaleString()}`, 'success');
            
            // Обновляем UI
            this.updateUI();
            
            console.log('✅ BankModule: Кредит погашен успешно');
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка погашения кредита:', error);
            this.uiService.showNotification('Ошибка погашения кредита', 'error');
        } finally {
            this.uiService.hideLoadingIndicator();
        }
    }
    
    /**
     * Уничтожить модуль
     */
    destroy() {
        console.log('🗑️ BankModule: Уничтожение модуля');
        
        // Очищаем интервалы
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.incomingTransfersInterval) {
            clearInterval(this.incomingTransfersInterval);
        }
        
        // Сбрасываем состояние
        this.core.reset();
        
        this.isInitialized = false;
        console.log('✅ BankModule: Модуль уничтожен');
    }
}

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.BankModule = BankModule;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankModule;
}
