/**
 * МОДУЛЬ БАНКА - ВСЕ ОПЕРАЦИИ С БАЛАНСОМ И ФИНАНСАМИ
 * 
 * Принцип: Все изменения баланса сначала применяются локально,
 * затем синхронизируются с сервером
 */

class BankModule {
    constructor() {
        // Состояние банка
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
            updateInterval: 30000, // 30 секунд
            protectionTime: 5000,  // 5 секунд защиты от сброса
            syncDelay: 2000       // 2 секунды задержка синхронизации
        };
        
        console.log('🏦 BankModule initialized');
    }
    
    /**
     * ЛОКАЛЬНОЕ ОБНОВЛЕНИЕ БАЛАНСА
     * Применяет изменения сразу, без ожидания сервера
     */
    updateLocalBalance(amount, description = '') {
        const oldBalance = this.currentBalance;
        this.currentBalance += amount; // amount может быть отрицательным для списания
        
        // Обновляем время последнего изменения
        this.lastUpdateTime = Date.now();
        
        console.log(`💰 Локальное обновление баланса: ${oldBalance} ${amount > 0 ? '+' : ''}${amount} = ${this.currentBalance} (${description})`);
        
        // Обновляем UI сразу
        this.updateUI();
        
        return this.currentBalance;
    }
    
    /**
     * ПРОВЕРКА НУЖНОСТИ ЗАГРУЗКИ ДАННЫХ С СЕРВЕРА
     */
    shouldLoadFromServer(forceUpdate = false) {
        if (forceUpdate) return true;
        
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        
        // Загружаем данные только если:
        // 1. Прошло больше времени защиты с последнего обновления
        // 2. Или это первая загрузка
        return timeSinceLastUpdate > this.config.protectionTime || this.lastUpdateTime === 0;
    }
    
    /**
     * ЗАГРУЗКА ДАННЫХ С СЕРВЕРА
     */
    async loadFromServer(forceUpdate = false) {
        try {
            // Проверяем, нужно ли загружать данные
            if (!this.shouldLoadFromServer(forceUpdate)) {
                console.log('⏭️ Пропускаем загрузку данных - недавно обновлялись');
                return;
            }
            
            const roomId = this.getRoomIdFromURL();
            if (!roomId) {
                console.log('Room ID not found, skipping bank data load');
                return;
            }
            
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                console.log('User not found, skipping bank data load');
                return;
            }
            
            console.log('🔄 Загружаем данные банка с сервера...');
            
            const response = await fetch(`/api/rooms/${roomId}?user_id=${user.id}`);
            if (!response.ok) {
                console.log(`Failed to load room data: HTTP ${response.status}`);
                return;
            }
            
            const data = await response.json();
            
            // Обновляем баланс
            const playerIndex = data.players.findIndex(p => p.user_id === user.id);
            
            if (playerIndex !== -1) {
                let newBalance = this.currentBalance; // Сохраняем текущий баланс по умолчанию
                
                // Сначала пробуем новую структуру (game_data.player_balances)
                if (data.game_data?.player_balances) {
                    newBalance = data.game_data.player_balances[playerIndex] || 0;
                    console.log('Balance loaded from game_data.player_balances:', newBalance, 'for player', playerIndex);
                } 
                // Если нет, используем старую структуру (players[].balance)
                else if (data.players[playerIndex]?.balance !== undefined) {
                    newBalance = data.players[playerIndex].balance;
                    console.log('Balance loaded from players[].balance:', newBalance, 'for player', playerIndex);
                } else {
                    console.log('No balance data found, playerIndex:', playerIndex, 'player data:', data.players[playerIndex]);
                }
                
                // Обновляем баланс только если:
                // 1. Новый баланс больше текущего (пополнение)
                // 2. Текущий баланс равен 0 (первая загрузка)
                // 3. Прошло больше времени защиты с последнего обновления
                // 4. Принудительное обновление
                const now = Date.now();
                const timeSinceLastUpdate = now - this.lastUpdateTime;
                
                if (newBalance > this.currentBalance || this.currentBalance === 0 || timeSinceLastUpdate > this.config.protectionTime || forceUpdate) {
                    this.currentBalance = newBalance;
                    this.lastUpdateTime = now;
                    console.log('Balance updated to:', this.currentBalance, 'timeSinceLastUpdate:', timeSinceLastUpdate + 'ms', 'forceUpdate:', forceUpdate);
                } else {
                    console.log('Keeping current balance:', this.currentBalance, '(new:', newBalance, ')', 'timeSinceLastUpdate:', timeSinceLastUpdate + 'ms', 'forceUpdate:', forceUpdate);
                }
            } else {
                console.log('Player not found in room, user.id:', user.id, 'players:', data.players.map(p => p.user_id));
            }
            
            // Обновляем историю переводов
            if (data.game_data?.transfers_history) {
                this.transfersHistory = data.game_data.transfers_history;
            }
            
            // Загружаем финансовые данные
            await this.loadFinancialData(roomId, playerIndex);
            
            // Обновляем UI
            this.updateUI();
            
            console.log('=== BANK DATA LOADED ===');
            console.log('Balance:', this.currentBalance);
            console.log('Income:', this.totalIncome);
            console.log('Expenses:', this.totalExpenses);
            console.log('Cash Flow:', this.monthlyIncome);
            console.log('Credit:', this.currentCredit);
            
        } catch (error) {
            console.error('Error loading bank data:', error);
        }
    }
    
    /**
     * ЗАГРУЗКА ФИНАНСОВЫХ ДАННЫХ
     */
    async loadFinancialData(roomId, playerIndex) {
        try {
            const response = await fetch(`/api/rooms/${roomId}/player/${playerIndex}/profession`);
            if (response.ok) {
                const data = await response.json();
                this.totalIncome = data.totalIncome || 0;
                this.totalExpenses = data.totalExpenses || 0;
                this.monthlyIncome = data.cashFlow || 0;
                this.currentCredit = data.currentCredit || 0;
                this.maxCredit = data.maxCredit || 0;
                
                console.log('Financial data loaded from API:', {
                    totalIncome: this.totalIncome,
                    totalExpenses: this.totalExpenses,
                    monthlyIncome: this.monthlyIncome,
                    currentCredit: this.currentCredit,
                    maxCredit: this.maxCredit
                });
            } else {
                console.log('Failed to load financial data from API, using defaults');
                // Используем значения по умолчанию
                this.totalIncome = 10000;
                this.totalExpenses = 6200;
                this.monthlyIncome = 3800;
                this.currentCredit = 0;
                this.maxCredit = 10000;
            }
        } catch (error) {
            console.error('Error loading financial data:', error);
        }
    }
    
    /**
     * ОБНОВЛЕНИЕ UI
     */
    updateUI() {
        console.log('=== UPDATING BANK UI ===');
        console.log('Current data:', {
            currentBalance: this.currentBalance,
            totalIncome: this.totalIncome,
            totalExpenses: this.totalExpenses,
            monthlyIncome: this.monthlyIncome,
            currentCredit: this.currentCredit
        });
        
        // Обновляем отображение баланса
        this.updateBalanceDisplay();
        
        // Обновляем финансовую сводку
        this.updateFinancialSummary();
        
        // Обновляем историю переводов
        this.updateTransfersHistory();
        
        // Обновляем информацию о кредите
        this.updateCreditInfo();
        
        console.log('=== BANK UI UPDATE COMPLETE ===');
    }
    
    /**
     * ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ БАЛАНСА
     */
    updateBalanceDisplay() {
        const balanceElements = document.querySelectorAll('[data-balance], .balance-amount, #currentBalance');
        balanceElements.forEach(element => {
            element.textContent = `$${this.currentBalance.toLocaleString()}`;
        });
        
        console.log('Balance updated to:', this.currentBalance);
    }
    
    /**
     * ОБНОВЛЕНИЕ ФИНАНСОВОЙ СВОДКИ
     */
    updateFinancialSummary() {
        console.log('Updating financial summary:', {
            totalIncome: this.totalIncome,
            totalExpenses: this.totalExpenses,
            monthlyIncome: this.monthlyIncome
        });
        
        // Обновляем доходы
        const incomeElement = document.getElementById('totalIncome') || document.querySelector('.finance-item:nth-child(1) .finance-value');
        if (incomeElement) {
            incomeElement.textContent = `$${this.totalIncome.toLocaleString()}`;
            console.log('Updated totalIncome: $' + this.totalIncome.toLocaleString());
        }
        
        // Обновляем расходы
        const expensesElement = document.getElementById('totalExpenses') || document.querySelector('.finance-item:nth-child(2) .finance-value');
        if (expensesElement) {
            expensesElement.textContent = `$${this.totalExpenses.toLocaleString()}`;
            console.log('Updated totalExpenses: $' + this.totalExpenses.toLocaleString());
        }
        
        // Обновляем денежный поток
        const cashFlowElement = document.getElementById('monthlyIncome') || document.querySelector('.finance-item:nth-child(3) .finance-value');
        if (cashFlowElement) {
            cashFlowElement.textContent = `$${this.monthlyIncome.toLocaleString()}`;
            console.log('Updated monthlyIncome: $' + this.monthlyIncome.toLocaleString());
        }
    }
    
    /**
     * ОБНОВЛЕНИЕ ИСТОРИИ ПЕРЕВОДОВ
     */
    updateTransfersHistory() {
        const historyContainer = document.getElementById('transfersHistory');
        if (!historyContainer) return;
        
        // Сортируем по времени (новые сверху)
        const sortedTransfers = [...this.transfersHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Очищаем контейнер
        historyContainer.innerHTML = '';
        
        // Добавляем переводы
        sortedTransfers.forEach(transfer => {
            const transferElement = this.createTransferElement(transfer);
            historyContainer.appendChild(transferElement);
        });
        
        // Обновляем счетчик
        const countElement = document.getElementById('transfersCount');
        if (countElement) {
            countElement.textContent = sortedTransfers.length;
        }
    }
    
    /**
     * СОЗДАНИЕ ЭЛЕМЕНТА ПЕРЕВОДА
     */
    createTransferElement(transfer) {
        const element = document.createElement('div');
        element.className = 'transfer-item';
        
        const isIncome = transfer.sender_index === -1 || transfer.recipient_index === this.getCurrentPlayerIndex();
        const isOutgoing = transfer.sender_index === this.getCurrentPlayerIndex() && transfer.recipient_index !== -1;
        
        const amountClass = isIncome ? 'amount income' : 'amount outgoing';
        const amountPrefix = isIncome ? '+' : '-';
        
        element.innerHTML = `
            <div class="transfer-info">
                <div class="transfer-description">${transfer.description}</div>
                <div class="transfer-time">${new Date(transfer.timestamp).toLocaleString()}</div>
            </div>
            <div class="${amountClass}">${amountPrefix}$${transfer.amount.toLocaleString()}</div>
        `;
        
        return element;
    }
    
    /**
     * ОБНОВЛЕНИЕ ИНФОРМАЦИИ О КРЕДИТЕ
     */
    updateCreditInfo() {
        const currentCreditElement = document.getElementById('currentCredit');
        const maxCreditElement = document.getElementById('maxCredit');
        
        if (currentCreditElement) {
            currentCreditElement.textContent = `$${this.currentCredit.toLocaleString()}`;
        }
        
        if (maxCreditElement) {
            maxCreditElement.textContent = `$${this.maxCredit.toLocaleString()}`;
        }
        
        console.log('Credit:', this.currentCredit);
    }
    
    /**
     * ПОЛУЧЕНИЕ ID КОМНАТЫ ИЗ URL
     */
    getRoomIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }
    
    /**
     * ПОЛУЧЕНИЕ ИНДЕКСА ТЕКУЩЕГО ИГРОКА
     */
    getCurrentPlayerIndex() {
        // Это должно быть реализовано в основном коде
        return window.currentPlayer || 0;
    }
    
    /**
     * СИНХРОНИЗАЦИЯ С СЕРВЕРОМ
     * Вызывается после локальных изменений для проверки
     */
    async syncWithServer() {
        console.log('🔄 Синхронизация с сервером...');
        await this.loadFromServer(true);
    }
    
    /**
     * ИНИЦИАЛИЗАЦИЯ МОДУЛЯ
     */
    async init() {
        console.log('🏦 Инициализация модуля банка...');
        
        // Загружаем данные при инициализации
        await this.loadFromServer(true);
        
        // Запускаем периодическое обновление
        setInterval(() => {
            this.loadFromServer();
        }, this.config.updateInterval);
        
        console.log('🏦 Модуль банка инициализирован');
    }
}

// Экспортируем модуль
window.BankModule = BankModule;