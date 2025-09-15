/**
 * Банковский модуль для игры EM1
 * Отдельный модуль для управления финансами игроков
 */

class BankModule {
    constructor() {
        this.currentBalance = 0;
        this.transfersHistory = [];
        this.totalIncome = 0;
        this.totalExpenses = 0;
        this.monthlyIncome = 0;
        this.currentCredit = 0;
        this.maxCredit = 0;
        this.isLoading = false;
        this.lastUpdateTime = 0;
        
        // Конфигурация
        this.config = {
            minTransferAmount: 1,
            maxTransferAmount: 100000,
            updateInterval: 30000, // 30 секунд
            apiEndpoints: {
                room: '/api/rooms',
                transfer: '/api/rooms/:id/transfer',
                credit: '/api/rooms/:id/take-credit',
                payoffCredit: '/api/rooms/:id/payoff-credit',
                profession: '/api/rooms/:id/player/:playerIndex/profession'
            }
        };
        
        this.init();
    }
    
    /**
     * Инициализация модуля
     */
    init() {
        console.log('🏦 Банковский модуль инициализирован');
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработчики для модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('bank-preview')) {
                this.openBank();
            }
            if (e.target.classList.contains('close-bank')) {
                this.closeBank();
            }
            if (e.target.classList.contains('close-credit')) {
                this.closeCredit();
            }
        });
        
        // Обработчики для форм
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'transferForm') {
                e.preventDefault();
                this.processTransfer();
            }
        });
        
        // Обработчики для кнопок
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('credit-btn')) {
                this.openCredit();
            }
            if (e.target.classList.contains('take-credit-btn')) {
                this.takeCredit();
            }
            if (e.target.classList.contains('payoff-credit-btn')) {
                this.payOffCredit();
            }
        });
    }
    
    /**
     * Запуск периодических обновлений
     */
    startPeriodicUpdates() {
        setInterval(() => {
            if (!this.isLoading) {
                this.loadBankData();
            }
        }, this.config.updateInterval);
    }
    
    /**
     * Открытие банковского модального окна
     */
    async openBank() {
        try {
            console.log('🏦 Открытие банка...');
            this.showLoadingIndicator();
            
            await this.loadBankData();
            this.updateBankUI();
            await this.loadRecipients();
            
            const modal = document.getElementById('bankModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('modal-show');
                }, 10);
            }
            
            this.hideLoadingIndicator();
            console.log('✅ Банк открыт успешно');
        } catch (error) {
            console.error('❌ Ошибка при открытии банка:', error);
            this.hideLoadingIndicator();
        }
    }
    
    /**
     * Закрытие банковского модального окна
     */
    closeBank() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.classList.remove('modal-show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * Загрузка данных банка
     */
    async loadBankData() {
        try {
            const roomId = this.getRoomIdFromURL();
            if (!roomId) {
                console.log('❌ Room ID не найден');
                return;
            }
            
            const user = this.getCurrentUser();
            if (!user) {
                console.log('❌ Пользователь не найден');
                return;
            }
            
            const response = await fetch(`${this.config.apiEndpoints.room}/${roomId}?user_id=${user.id}`);
            if (!response.ok) {
                console.log(`❌ Ошибка загрузки данных: HTTP ${response.status}`);
                return;
            }
            
            const data = await response.json();
            console.log('📊 Данные банка загружены:', data);
            
            // Обновляем баланс
            const playerIndex = data.players.findIndex(p => p.user_id === user.id);
            if (playerIndex !== -1) {
                let newBalance = this.currentBalance;
                
                if (data.game_data?.player_balances) {
                    newBalance = data.game_data.player_balances[playerIndex] || 0;
                } else if (data.players[playerIndex]?.balance !== undefined) {
                    newBalance = data.players[playerIndex].balance;
                }
                
                // Обновляем баланс только если новый больше текущего или текущий равен 0
                if (newBalance > this.currentBalance || this.currentBalance === 0) {
                    this.currentBalance = newBalance;
                    console.log(`💰 Баланс обновлен: $${this.currentBalance}`);
                }
            }
            
            // Обновляем историю переводов
            if (data.game_data?.transfers_history) {
                this.transfersHistory = data.game_data.transfers_history;
            }
            
            // Загружаем финансовые данные
            await this.loadFinancialData(roomId, playerIndex);
            
            this.lastUpdateTime = Date.now();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных банка:', error);
        }
    }
    
    /**
     * Загрузка финансовых данных
     */
    async loadFinancialData(roomId, playerIndex) {
        try {
            const response = await fetch(`${this.config.apiEndpoints.profession.replace(':id', roomId).replace(':playerIndex', playerIndex)}`);
            if (response.ok) {
                const data = await response.json();
                this.totalIncome = data.salary || 0;
                this.totalExpenses = data.expenses || 0;
                this.monthlyIncome = data.cashFlow || 0;
                this.currentCredit = data.currentCredit || 0;
                
                console.log('💼 Финансовые данные загружены:', {
                    totalIncome: this.totalIncome,
                    totalExpenses: this.totalExpenses,
                    monthlyIncome: this.monthlyIncome,
                    currentCredit: this.currentCredit
                });
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки финансовых данных:', error);
        }
    }
    
    /**
     * Обновление UI банка
     */
    updateBankUI() {
        this.updateBalanceDisplay();
        this.updateFinancialSummary();
        this.updateTransfersHistory();
        this.updateCreditInfo();
        console.log('🔄 UI банка обновлен');
    }
    
    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay() {
        const balanceElements = [
            document.getElementById('currentBalance'),
            document.querySelector('.bank-preview .balance-amount')
        ];
        
        balanceElements.forEach(el => {
            if (el) {
                el.textContent = `$${this.currentBalance.toLocaleString()}`;
                el.classList.add('balance-updated');
                setTimeout(() => el.classList.remove('balance-updated'), 1000);
            }
        });
    }
    
    /**
     * Обновление финансовой сводки
     */
    updateFinancialSummary() {
        const elements = {
            totalIncome: document.getElementById('totalIncome'),
            totalExpenses: document.getElementById('totalExpenses'),
            monthlyIncome: document.getElementById('monthlyIncome')
        };
        
        if (elements.totalIncome) {
            elements.totalIncome.textContent = `$${this.totalIncome.toLocaleString()}`;
        }
        if (elements.totalExpenses) {
            elements.totalExpenses.textContent = `$${this.totalExpenses.toLocaleString()}`;
        }
        if (elements.monthlyIncome) {
            elements.monthlyIncome.textContent = `$${this.monthlyIncome.toLocaleString()}`;
        }
    }
    
    /**
     * Обновление истории переводов
     */
    updateTransfersHistory() {
        const historyContainer = document.getElementById('transfersHistory');
        if (!historyContainer) return;
        
        // Сортируем по времени (новые сверху)
        const sortedHistory = this.transfersHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        historyContainer.innerHTML = '';
        
        if (sortedHistory.length === 0) {
            historyContainer.innerHTML = '<div class="no-transfers">История переводов пуста</div>';
            return;
        }
        
        sortedHistory.forEach(transfer => {
            const transferElement = this.createTransferElement(transfer);
            historyContainer.appendChild(transferElement);
        });
        
        // Обновляем счетчик
        const countElement = document.querySelector('.transfers-count');
        if (countElement) {
            countElement.textContent = sortedHistory.length;
        }
    }
    
    /**
     * Создание элемента перевода
     */
    createTransferElement(transfer) {
        const div = document.createElement('div');
        div.className = 'transfer-item';
        
        const isIncome = transfer.sender_index === -1 || transfer.recipient_index === this.getCurrentPlayerIndex();
        const isOutgoing = transfer.sender_index === this.getCurrentPlayerIndex();
        
        div.innerHTML = `
            <div class="transfer-info">
                <div class="transfer-participants">
                    ${transfer.sender} → ${transfer.recipient}
                </div>
                <div class="transfer-description">${transfer.description}</div>
                <div class="transfer-time">${this.formatTime(transfer.timestamp)}</div>
            </div>
            <div class="transfer-amount ${isIncome ? 'income' : 'outgoing'}">
                ${isIncome ? '+' : '-'}$${transfer.amount.toLocaleString()}
            </div>
        `;
        
        return div;
    }
    
    /**
     * Обновление информации о кредите
     */
    updateCreditInfo() {
        this.maxCredit = Math.floor(this.monthlyIncome / 100) * 1000;
        
        const elements = {
            currentCredit: document.getElementById('currentCredit'),
            maxCredit: document.getElementById('maxCredit')
        };
        
        if (elements.currentCredit) {
            elements.currentCredit.textContent = `$${this.currentCredit.toLocaleString()}`;
        }
        if (elements.maxCredit) {
            elements.maxCredit.textContent = `$${this.maxCredit.toLocaleString()}`;
        }
    }
    
    /**
     * Загрузка списка получателей
     */
    async loadRecipients() {
        try {
            const roomId = this.getRoomIdFromURL();
            const user = this.getCurrentUser();
            
            if (!roomId || !user) return;
            
            const response = await fetch(`${this.config.apiEndpoints.room}/${roomId}?user_id=${user.id}`);
            const data = await response.json();
            
            const recipientSelect = document.getElementById('recipientSelect');
            if (!recipientSelect) return;
            
            recipientSelect.innerHTML = '<option value="">Выберите получателя</option>';
            
            data.players.forEach((player, index) => {
                if (player.user_id !== user.id) {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = player.name || `Игрок ${index + 1}`;
                    recipientSelect.appendChild(option);
                }
            });
            
            console.log(`👥 Загружено ${recipientSelect.options.length - 1} получателей`);
        } catch (error) {
            console.error('❌ Ошибка загрузки получателей:', error);
        }
    }
    
    /**
     * Обработка перевода
     */
    async processTransfer() {
        try {
            if (this.isLoading) return;
            
            const validation = this.validateTransferForm();
            if (!validation.valid) {
                this.showError(validation.message);
                return;
            }
            
            this.showLoadingIndicator();
            this.isLoading = true;
            
            const transferData = this.prepareTransferData();
            const response = await this.sendTransferRequest(transferData);
            
            if (response.ok) {
                this.updateLocalData(response.data);
                this.showSuccess('Перевод выполнен успешно!');
                await this.loadBankData();
                this.updateBankUI();
                this.resetTransferForm();
            } else {
                throw new Error(response.data?.message || 'Ошибка при выполнении перевода');
            }
            
        } catch (error) {
            console.error('❌ Ошибка перевода:', error);
            this.showError(error.message);
        } finally {
            this.hideLoadingIndicator();
            this.isLoading = false;
        }
    }
    
    /**
     * Валидация формы перевода
     */
    validateTransferForm() {
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        if (!recipientSelect || !amountInput) {
            return { valid: false, message: 'Форма не найдена' };
        }
        
        const recipientIndex = recipientSelect.value;
        const amount = parseFloat(amountInput.value);
        
        if (!recipientIndex || recipientIndex === '') {
            return { valid: false, message: 'Выберите получателя' };
        }
        
        if (!amountInput.value || amountInput.value.trim() === '') {
            return { valid: false, message: 'Введите сумму перевода' };
        }
        
        if (isNaN(amount) || amount < 1) {
            return { valid: false, message: `Минимальная сумма: $1` };
        }
        
        if (amount > this.config.maxTransferAmount) {
            return { valid: false, message: `Максимальная сумма: $${this.config.maxTransferAmount.toLocaleString()}` };
        }
        
        if (amount > this.currentBalance) {
            return { valid: false, message: 'Недостаточно средств на балансе' };
        }
        
        return { valid: true };
    }
    
    /**
     * Подготовка данных для перевода
     */
    prepareTransferData() {
        const roomId = this.getRoomIdFromURL();
        const user = this.getCurrentUser();
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        return {
            roomId,
            userId: user.id,
            recipientIndex: parseInt(recipientSelect.value),
            amount: parseInt(amountInput.value)
        };
    }
    
    /**
     * Отправка запроса на перевод
     */
    async sendTransferRequest(transferData) {
        const requestBody = {
            user_id: transferData.userId,
            recipient_index: transferData.recipientIndex,
            amount: transferData.amount
        };
        
        const response = await fetch(`${this.config.apiEndpoints.transfer.replace(':id', transferData.roomId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        return { ok: response.ok, data };
    }
    
    /**
     * Обновление локальных данных после перевода
     */
    updateLocalData(responseData) {
        this.currentBalance = responseData.new_balance;
        console.log(`💰 Баланс обновлен: $${this.currentBalance}`);
    }
    
    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        const form = document.getElementById('transferForm');
        if (form) {
            form.reset();
        }
    }
    
    /**
     * Открытие кредитного модального окна
     */
    async openCredit() {
        try {
            await this.loadBankData();
            this.updateCreditModal();
            
            const modal = document.getElementById('creditModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('modal-show');
                }, 10);
            }
        } catch (error) {
            console.error('❌ Ошибка при открытии кредита:', error);
        }
    }
    
    /**
     * Закрытие кредитного модального окна
     */
    closeCredit() {
        const modal = document.getElementById('creditModal');
        if (modal) {
            modal.classList.remove('modal-show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * Обновление кредитного модального окна
     */
    updateCreditModal() {
        const elements = {
            currentCashFlow: document.getElementById('currentCashFlow'),
            maxCreditAmount: document.getElementById('maxCreditAmount'),
            currentCreditAmount: document.getElementById('currentCreditAmount')
        };
        
        if (elements.currentCashFlow) {
            elements.currentCashFlow.textContent = `$${this.monthlyIncome.toLocaleString()}`;
        }
        if (elements.maxCreditAmount) {
            elements.maxCreditAmount.textContent = `$${this.maxCredit.toLocaleString()}`;
        }
        if (elements.currentCreditAmount) {
            elements.currentCreditAmount.textContent = `$${this.currentCredit.toLocaleString()}`;
        }
    }
    
    /**
     * Взятие кредита
     */
    async takeCredit() {
        try {
            const amount = parseInt(document.getElementById('creditAmount').value);
            if (!amount || amount < 1000) {
                this.showError('Минимальная сумма кредита: $1000');
                return;
            }
            
            if (amount % 1000 !== 0) {
                this.showError('Сумма кредита должна быть кратна $1000');
                return;
            }
            
            const roomId = this.getRoomIdFromURL();
            const response = await fetch(`${this.config.apiEndpoints.credit.replace(':id', roomId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            
            const data = await response.json();
            if (response.ok) {
                this.showSuccess('Кредит взят успешно!');
                await this.loadBankData();
                this.updateBankUI();
                this.closeCredit();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Ошибка взятия кредита:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * Погашение кредита
     */
    async payOffCredit() {
        try {
            const amount = parseInt(document.getElementById('payoffAmount').value);
            if (!amount || amount < 1) {
                this.showError('Введите сумму погашения');
                return;
            }
            
            if (amount > this.currentCredit) {
                this.showError('Сумма погашения не может превышать текущий кредит');
                return;
            }
            
            const roomId = this.getRoomIdFromURL();
            const response = await fetch(`${this.config.apiEndpoints.payoffCredit.replace(':id', roomId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            
            const data = await response.json();
            if (response.ok) {
                this.showSuccess('Кредит погашен успешно!');
                await this.loadBankData();
                this.updateBankUI();
                this.closeCredit();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Ошибка погашения кредита:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * Вспомогательные методы
     */
    getRoomIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }
    
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    getCurrentPlayerIndex() {
        // Логика определения индекса текущего игрока
        return 0; // Заглушка
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        return `${Math.floor(diff / 86400000)} дн назад`;
    }
    
    showLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = 'block';
        }
    }
    
    hideLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    showError(message) {
        console.error('❌', message);
        // Здесь можно добавить отображение уведомления об ошибке
    }
    
    showSuccess(message) {
        console.log('✅', message);
        // Здесь можно добавить отображение уведомления об успехе
    }
}

// Экспорт модуля
window.BankModule = BankModule;

// Автоинициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.bankModule = new BankModule();
});
