/**
 * Банковский модуль для игры "Энергия денег"
 * Управляет банковскими операциями, кредитами и переводами
 */

export class BankModule {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.isOpen = false;
        this.transactionHistory = [];
        this.maxHistorySize = 100;
        this.isDestroyed = false;
    }

    /**
     * Инициализация банковского модуля
     */
    async init() {
        console.log('🏦 BankModule инициализирован');
        
        // Подписка на события
        this.gameCore.eventBus.on('playerBalanceChanged', this.onPlayerBalanceChanged.bind(this));
        this.gameCore.eventBus.on('playerBankrupted', this.onPlayerBankrupted.bind(this));
    }

    /**
     * Открытие банковского интерфейса
     */
    openBank() {
        if (this.isDestroyed) {
            console.warn('BankModule уничтожен, открытие невозможно');
            return false;
        }

        if (this.isOpen) {
            console.log('Банк уже открыт');
            return true;
        }

        this.isOpen = true;
        
        // Создание модального окна банка
        this.createBankModal();
        
        // Эмиссия события
        this.gameCore.eventBus.emit('bankOpened', {
            timestamp: Date.now()
        });
        
        console.log('🏦 Банковский интерфейс открыт');
        return true;
    }

    /**
     * Закрытие банковского интерфейса
     */
    closeBank() {
        if (!this.isOpen) {
            return true;
        }

        this.isOpen = false;
        
        // Удаление модального окна
        this.removeBankModal();
        
        // Эмиссия события
        this.gameCore.eventBus.emit('bankClosed', {
            timestamp: Date.now()
        });
        
        console.log('🏦 Банковский интерфейс закрыт');
        return true;
    }

    /**
     * Создание модального окна банка
     */
    createBankModal() {
        // Проверка существования модального окна
        if (document.getElementById('bankModal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'bankModal';
        modal.className = 'bank-modal';
        modal.innerHTML = this.getBankModalHTML();
        
        document.body.appendChild(modal);
        
        // Привязка событий
        this.bindBankModalEvents(modal);
        
        // Показать модальное окно
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }, 10);
    }

    /**
     * HTML модального окна банка
     */
    getBankModalHTML() {
        return `
            <div class="bank-modal-content">
                <div class="bank-modal-header">
                    <div class="bank-header-left">
                        <div class="bank-icon">🏦</div>
                        <h2 class="bank-modal-title">Банк "Энергия денег"</h2>
                    </div>
                    <button class="bank-modal-close" id="closeBankBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="bank-modal-body">
                    <!-- Левая колонка - Информация -->
                    <div class="bank-info-column">
                        <!-- Статус банка -->
                        <div class="bank-status-section">
                            <div class="bank-status-header">
                                <div class="bank-icon-small">🏦</div>
                                <span class="bank-status-label">Статус</span>
                            </div>
                            <div class="bank-status-badge active">
                                <i class="fas fa-check-circle"></i>
                                Активен
                            </div>
                        </div>
                        
                        <!-- Текущий баланс -->
                        <div class="bank-balance-section">
                            <div class="balance-header">
                                <i class="fas fa-wallet"></i>
                                <span>Текущий баланс</span>
                            </div>
                            <div id="bankCurrentBalance" class="balance-amount">$0</div>
                        </div>
                        
                        <!-- Финансовая сводка -->
                        <div class="financial-summary">
                            <h3>Финансовая сводка</h3>
                            <div class="summary-item">
                                <span class="summary-label">Месячный доход:</span>
                                <span id="bankMonthlyIncome" class="summary-value income">$0</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Месячные расходы:</span>
                                <span id="bankMonthlyExpenses" class="summary-value expense">$0</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Пассивный доход:</span>
                                <span id="bankPassiveIncome" class="summary-value income">$0</span>
                            </div>
                        </div>
                        
                        <!-- Кредитная информация -->
                        <div class="credit-section">
                            <h3>Кредитная информация</h3>
                            <div class="credit-info">
                                <div class="credit-item">
                                    <span class="credit-label">Текущий кредит:</span>
                                    <span id="bankCreditAmount" class="credit-value">$0</span>
                                </div>
                                <div class="credit-item">
                                    <span class="credit-label">Максимальный кредит:</span>
                                    <span id="bankMaxCredit" class="credit-value">$0</span>
                                </div>
                                <div class="credit-item">
                                    <span class="credit-label">Статус:</span>
                                    <span id="bankCreditStatus" class="credit-status">Можно взять кредит</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Правая колонка - Операции -->
                    <div class="bank-operations-column">
                        <!-- Кредитные операции -->
                        <div class="credit-operations">
                            <h3>Кредитные операции</h3>
                            <div class="operation-group">
                                <label for="creditAmount">Сумма кредита:</label>
                                <input type="number" id="creditAmount" min="1000" step="1000" placeholder="1000">
                                <button id="requestCreditBtn" class="btn btn-primary">
                                    <i class="fas fa-hand-holding-usd"></i>
                                    Взять кредит
                                </button>
                            </div>
                            <div class="operation-group">
                                <label for="payoffAmount">Сумма погашения:</label>
                                <input type="number" id="payoffAmount" min="1000" step="1000" placeholder="1000">
                                <button id="payoffCreditBtn" class="btn btn-success">
                                    <i class="fas fa-check"></i>
                                    Погасить кредит
                                </button>
                            </div>
                        </div>
                        
                        <!-- Переводы -->
                        <div class="transfer-operations">
                            <h3>Переводы между игроками</h3>
                            <div class="operation-group">
                                <label for="transferRecipient">Получатель:</label>
                                <select id="transferRecipient">
                                    <option value="">Выберите игрока</option>
                                </select>
                            </div>
                            <div class="operation-group">
                                <label for="transferAmount">Сумма перевода:</label>
                                <input type="number" id="transferAmount" min="1" placeholder="100">
                            </div>
                            <div class="operation-group">
                                <label for="transferDescription">Описание:</label>
                                <input type="text" id="transferDescription" placeholder="Назначение перевода">
                            </div>
                            <button id="transferMoneyBtn" class="btn btn-warning">
                                <i class="fas fa-exchange-alt"></i>
                                Отправить перевод
                            </button>
                        </div>
                        
                        <!-- История операций -->
                        <div class="transactions-history">
                            <h3>История операций</h3>
                            <div id="transactionsList" class="transactions-list">
                                <!-- История операций будет добавлена динамически -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Привязка событий модального окна
     * @param {HTMLElement} modal - Модальное окно
     */
    bindBankModalEvents(modal) {
        // Закрытие модального окна
        modal.querySelector('#closeBankBtn').addEventListener('click', () => {
            this.closeBank();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeBank();
            }
        });
        
        // Кредитные операции
        modal.querySelector('#requestCreditBtn').addEventListener('click', () => {
            this.handleCreditRequest();
        });
        
        modal.querySelector('#payoffCreditBtn').addEventListener('click', () => {
            this.handleCreditPayoff();
        });
        
        // Переводы
        modal.querySelector('#transferMoneyBtn').addEventListener('click', () => {
            this.handleTransfer();
        });
        
        // Обновление данных при открытии
        this.updateBankData();
    }

    /**
     * Удаление модального окна банка
     */
    removeBankModal() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    /**
     * Обновление данных банка
     */
    updateBankData() {
        const playerManager = this.gameCore.getModule('playerManager');
        const currentPlayer = playerManager.getCurrentPlayer();
        
        if (!currentPlayer) {
            return;
        }

        // Обновление баланса
        const balanceElement = document.getElementById('bankCurrentBalance');
        if (balanceElement) {
            balanceElement.textContent = `$${currentPlayer.balance.toLocaleString()}`;
        }

        // Обновление финансовой сводки
        const incomeElement = document.getElementById('bankMonthlyIncome');
        if (incomeElement) {
            incomeElement.textContent = `$${currentPlayer.monthlyIncome.toLocaleString()}`;
        }

        const expensesElement = document.getElementById('bankMonthlyExpenses');
        if (expensesElement) {
            expensesElement.textContent = `$${currentPlayer.monthlyExpenses.toLocaleString()}`;
        }

        const passiveElement = document.getElementById('bankPassiveIncome');
        if (passiveElement) {
            passiveElement.textContent = `$${currentPlayer.passiveIncome.toLocaleString()}`;
        }

        // Обновление кредитной информации
        const creditElement = document.getElementById('bankCreditAmount');
        if (creditElement) {
            creditElement.textContent = `$${currentPlayer.creditAmount.toLocaleString()}`;
        }

        const maxCreditElement = document.getElementById('bankMaxCredit');
        if (maxCreditElement) {
            const maxCredit = currentPlayer.monthlyIncome * 10; // 10x от PAYDAY
            maxCreditElement.textContent = `$${maxCredit.toLocaleString()}`;
        }

        const statusElement = document.getElementById('bankCreditStatus');
        if (statusElement) {
            if (currentPlayer.isBankrupt) {
                statusElement.textContent = 'Кредиты заблокированы (банкротство)';
                statusElement.className = 'credit-status blocked';
            } else if (currentPlayer.creditAmount > 0) {
                statusElement.textContent = 'Есть активный кредит';
                statusElement.className = 'credit-status active';
            } else {
                statusElement.textContent = 'Можно взять кредит';
                statusElement.className = 'credit-status available';
            }
        }

        // Обновление списка получателей переводов
        this.updateTransferRecipients();

        // Обновление истории операций
        this.updateTransactionsHistory();
    }

    /**
     * Обновление списка получателей переводов
     */
    updateTransferRecipients() {
        const selectElement = document.getElementById('transferRecipient');
        if (!selectElement) {
            return;
        }

        const playerManager = this.gameCore.getModule('playerManager');
        const players = playerManager.getActivePlayers();
        const currentPlayer = playerManager.getCurrentPlayer();

        // Очистка опций
        selectElement.innerHTML = '<option value="">Выберите игрока</option>';

        // Добавление активных игроков (кроме текущего)
        players.forEach(player => {
            if (player.id !== currentPlayer.id) {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                selectElement.appendChild(option);
            }
        });
    }

    /**
     * Обработка запроса кредита
     */
    handleCreditRequest() {
        const amountInput = document.getElementById('creditAmount');
        const amount = parseInt(amountInput.value);

        if (!amount || amount < 1000) {
            alert('Минимальная сумма кредита: $1,000');
            return;
        }

        if (amount % 1000 !== 0) {
            alert('Сумма кредита должна быть кратна $1,000');
            return;
        }

        const playerManager = this.gameCore.getModule('playerManager');
        const currentPlayer = playerManager.getCurrentPlayer();

        if (!currentPlayer) {
            alert('Игрок не найден');
            return;
        }

        // Проверка банкротства
        if (currentPlayer.isBankrupt) {
            alert('Кредиты заблокированы из-за банкротства');
            return;
        }

        // Проверка лимита кредита (10x от PAYDAY)
        const maxCredit = currentPlayer.monthlyIncome * 10;
        if (amount > maxCredit) {
            alert(`Максимальный кредит: $${maxCredit.toLocaleString()}`);
            return;
        }

        // Выдача кредита
        playerManager.updateBalance(currentPlayer.id, amount, 'Получение кредита');
        playerManager.updatePlayer(currentPlayer.id, {
            creditAmount: currentPlayer.creditAmount + amount
        });

        // Запись в историю
        this.addTransaction({
            type: 'credit_request',
            amount: amount,
            description: 'Получение кредита',
            timestamp: Date.now()
        });

        // Обновление данных
        this.updateBankData();
        
        alert(`Кредит $${amount.toLocaleString()} получен`);
    }

    /**
     * Обработка погашения кредита
     */
    handleCreditPayoff() {
        const amountInput = document.getElementById('payoffAmount');
        const amount = parseInt(amountInput.value);

        if (!amount || amount < 1000) {
            alert('Минимальная сумма погашения: $1,000');
            return;
        }

        if (amount % 1000 !== 0) {
            alert('Сумма погашения должна быть кратна $1,000');
            return;
        }

        const playerManager = this.gameCore.getModule('playerManager');
        const currentPlayer = playerManager.getCurrentPlayer();

        if (!currentPlayer) {
            alert('Игрок не найден');
            return;
        }

        if (currentPlayer.creditAmount <= 0) {
            alert('У вас нет активного кредита');
            return;
        }

        if (amount > currentPlayer.creditAmount) {
            alert(`Сумма погашения не может превышать размер кредита ($${currentPlayer.creditAmount.toLocaleString()})`);
            return;
        }

        if (amount > currentPlayer.balance) {
            alert('Недостаточно средств для погашения');
            return;
        }

        // Погашение кредита
        playerManager.updateBalance(currentPlayer.id, -amount, 'Погашение кредита');
        playerManager.updatePlayer(currentPlayer.id, {
            creditAmount: currentPlayer.creditAmount - amount
        });

        // Запись в историю
        this.addTransaction({
            type: 'credit_payoff',
            amount: -amount,
            description: 'Погашение кредита',
            timestamp: Date.now()
        });

        // Обновление данных
        this.updateBankData();
        
        alert(`Кредит погашен на сумму $${amount.toLocaleString()}`);
    }

    /**
     * Обработка перевода
     */
    handleTransfer() {
        const recipientSelect = document.getElementById('transferRecipient');
        const amountInput = document.getElementById('transferAmount');
        const descriptionInput = document.getElementById('transferDescription');

        const recipientId = recipientSelect.value;
        const amount = parseInt(amountInput.value);
        const description = descriptionInput.value.trim();

        if (!recipientId) {
            alert('Выберите получателя');
            return;
        }

        if (!amount || amount <= 0) {
            alert('Введите корректную сумму');
            return;
        }

        if (!description) {
            alert('Введите описание перевода');
            return;
        }

        const playerManager = this.gameCore.getModule('playerManager');
        const currentPlayer = playerManager.getCurrentPlayer();
        const recipient = playerManager.getPlayer(recipientId);

        if (!currentPlayer || !recipient) {
            alert('Ошибка получения данных игроков');
            return;
        }

        if (amount > currentPlayer.balance) {
            alert('Недостаточно средств для перевода');
            return;
        }

        // Выполнение перевода
        playerManager.updateBalance(currentPlayer.id, -amount, `Перевод: ${description}`);
        playerManager.updateBalance(recipientId, amount, `Перевод от ${currentPlayer.name}: ${description}`);

        // Запись в историю
        this.addTransaction({
            type: 'transfer',
            amount: -amount,
            description: `Перевод ${recipient.name}: ${description}`,
            timestamp: Date.now()
        });

        // Очистка формы
        recipientSelect.value = '';
        amountInput.value = '';
        descriptionInput.value = '';

        // Обновление данных
        this.updateBankData();
        
        alert(`Перевод $${amount.toLocaleString()} отправлен игроку ${recipient.name}`);
    }

    /**
     * Добавление транзакции в историю
     * @param {Object} transaction - Транзакция
     */
    addTransaction(transaction) {
        this.transactionHistory.push({
            ...transaction,
            id: this.generateTransactionId()
        });

        // Ограничение размера истории
        if (this.transactionHistory.length > this.maxHistorySize) {
            this.transactionHistory.shift();
        }
    }

    /**
     * Обновление истории операций
     */
    updateTransactionsHistory() {
        const listElement = document.getElementById('transactionsList');
        if (!listElement) {
            return;
        }

        listElement.innerHTML = '';

        if (this.transactionHistory.length === 0) {
            listElement.innerHTML = '<div class="no-transactions">Нет операций</div>';
            return;
        }

        // Показать последние 10 операций
        const recentTransactions = this.transactionHistory.slice(-10).reverse();

        recentTransactions.forEach(transaction => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            
            const amountClass = transaction.amount > 0 ? 'positive' : 'negative';
            const amountText = transaction.amount > 0 ? 
                `+$${transaction.amount.toLocaleString()}` : 
                `-$${Math.abs(transaction.amount).toLocaleString()}`;
            
            transactionElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-time">${this.formatTime(transaction.timestamp)}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${amountText}</div>
            `;
            
            listElement.appendChild(transactionElement);
        });
    }

    /**
     * Форматирование времени
     * @param {number} timestamp - Временная метка
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Генерация ID транзакции
     */
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Получение истории транзакций
     * @param {number} limit - Лимит записей
     */
    getTransactionHistory(limit = 10) {
        return this.transactionHistory.slice(-limit);
    }

    /**
     * Получение статистики
     */
    getStats() {
        const totalTransactions = this.transactionHistory.length;
        const transactionTypes = {};
        
        this.transactionHistory.forEach(transaction => {
            const type = transaction.type;
            transactionTypes[type] = (transactionTypes[type] || 0) + 1;
        });
        
        return {
            totalTransactions,
            transactionTypes,
            isOpen: this.isOpen
        };
    }

    /**
     * Обработчики событий
     */
    onPlayerBalanceChanged(data) {
        if (this.isOpen) {
            this.updateBankData();
        }
    }

    onPlayerBankrupted(data) {
        if (this.isOpen) {
            this.updateBankData();
        }
    }

    /**
     * Уничтожение банковского модуля
     */
    destroy() {
        this.closeBank();
        this.transactionHistory = [];
        this.isDestroyed = true;
        console.log('🗑️ BankModule уничтожен');
    }
}

export default BankModule;
