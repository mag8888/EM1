/**
 * БАНКОВСКИЙ МОДУЛЬ
 * Полная реализация всех банковских операций
 */

class BankModule {
    constructor() {
        // Глобальные переменные для банка
        this.currentBalance = 0;
        this.transfersHistory = [];
        this.totalIncome = 0;
        this.totalExpenses = 0;
        this.monthlyIncome = 0;
        this.currentCredit = 0;
        this.maxCredit = 10000;
        this.isLoading = false;
        this.lastUpdateTime = 0;
        this.roomData = null; // Данные комнаты
        
        // Конфигурация
        this.config = {
            minTransferAmount: 1,
            maxTransferAmount: 1000000,
            updateInterval: 30000, // 30 секунд
            animationDuration: 1000
        };
    }

    /**
     * Инициализация банковского модуля
     */
    async init() {
        console.log('🏦 Initializing Bank Module...');
        
        // Загружаем начальные данные
        await this.loadBankData(true);
        
        // Устанавливаем периодическое обновление
        setInterval(() => {
            this.loadBankData(false);
        }, this.config.updateInterval);
        
        console.log('✅ Bank Module initialized successfully');
    }

    /**
     * Загрузка данных банка с сервера
     */
    async loadBankData(forceUpdate = false) {
        console.log('=== LOADING BANK DATA ===');
        
        try {
            const roomId = this.getRoomIdFromURL();
            if (!roomId) {
                console.error('Room ID not found in URL');
                return;
            }
            
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.id) {
                console.error('User not found in localStorage');
                return;
            }
            
            // Простая проверка: загружаем только если принудительно или это первая загрузка
            if (!forceUpdate && this.currentBalance > 0) {
                console.log('⏭️ Пропускаем загрузку данных - баланс уже установлен');
                return;
            }
            
            const response = await fetch(`/api/rooms/${roomId}?user_id=${user.id}`);
            if (!response.ok) {
                console.log(`Failed to load room data: HTTP ${response.status}`);
                return;
            }
            
            const data = await response.json();
            
            // Сохраняем данные комнаты в глобальную переменную
            this.roomData = data;
            
            // Обновляем баланс
            const playerIndex = data.players.findIndex(p => p.user_id === user.id);
            
            if (playerIndex !== -1) {
                let newBalance = this.currentBalance; // Сохраняем текущий баланс по умолчанию
                
                // Сначала проверяем новую структуру (game_data.player_balances)
                if (data.game_data?.player_balances?.[playerIndex] !== undefined) {
                    newBalance = data.game_data.player_balances[playerIndex];
                    console.log('Balance loaded from game_data.player_balances:', newBalance, 'for player', playerIndex);
                } 
                // Если нет, используем старую структуру (players[].balance)
                else if (data.players[playerIndex]?.balance !== undefined) {
                    newBalance = data.players[playerIndex].balance;
                    console.log('Balance loaded from players[].balance:', newBalance, 'for player', playerIndex);
                }
                
                // Обновляем баланс с сервера (принудительно или если это пополнение)
                if (forceUpdate || newBalance > this.currentBalance) {
                    const oldBalance = this.currentBalance;
                    this.currentBalance = newBalance;
                    this.lastUpdateTime = Date.now();
                    console.log('Balance updated from server:', oldBalance, '→', newBalance, 'forceUpdate:', forceUpdate);
                    
                    // Показываем анимацию изменения баланса
                    this.animateBalanceChange(oldBalance, newBalance);
                } else {
                    console.log('Keeping current balance:', this.currentBalance, '(new:', newBalance, ')', 'forceUpdate:', forceUpdate);
                }
            } else {
                console.log('Player not found in room, user.id:', user.id, 'players:', data.players.map(p => p.user_id));
            }
            
            // Загружаем историю переводов
            if (data.game_data?.transfers_history) {
                this.transfersHistory = data.game_data.transfers_history;
                console.log('Transfers history loaded:', this.transfersHistory.length, 'transfers');
            }
            
            // Загружаем финансовые данные
            await this.loadFinancialData(roomId, playerIndex);
            
            // Обновляем UI
            this.updateBankUI();
            
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
     * Загрузка финансовых данных игрока
     */
    async loadFinancialData(roomId, playerIndex) {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            
            const response = await fetch(`/api/rooms/${roomId}/player/${playerIndex}/profession?user_id=${user.id}`);
            
            if (response.ok) {
                const data = await response.json();
                this.totalIncome = data.totalIncome || 0;
                this.totalExpenses = data.totalExpenses || 0;
                this.monthlyIncome = data.cashFlow || 0;
                this.currentCredit = data.currentCredit || 0;
                console.log('Financial data loaded from API:', {
                    totalIncome: this.totalIncome,
                    totalExpenses: this.totalExpenses,
                    monthlyIncome: this.monthlyIncome,
                    currentCredit: this.currentCredit
                });
            } else {
                console.log('Failed to load profession data from API, trying local data');
                // Если API не работает, используем данные из room data
                const user = JSON.parse(localStorage.getItem('user'));
                const roomResponse = await fetch(`/api/rooms/${roomId}?user_id=${user.id}`);
                if (roomResponse.ok) {
                    const roomData = await roomResponse.json();
                    const player = roomData.players[playerIndex];
                    if (player?.profession_data) {
                        this.totalIncome = player.profession_data.salary || 0;
                        this.totalExpenses = player.profession_data.expenses || 0;
                        this.monthlyIncome = player.profession_data.cash_flow || player.profession_data.cashFlow || 0;
                        this.currentCredit = 0; // Пока нет данных о кредитах в старой структуре
                    }
                }
            }
        } catch (error) {
            console.error('Error loading financial data:', error);
        }
    }

    /**
     * Обновление UI банка
     */
    updateBankUI() {
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
        
        // Обновляем кредитную информацию
        this.updateCreditInfo();
        
        console.log('=== BANK UI UPDATE COMPLETE ===');
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
                // Анимация обновления
                el.classList.add('balance-updated');
                setTimeout(() => el.classList.remove('balance-updated'), 500);
            }
        });
        
        console.log('Balance updated to:', this.currentBalance);
    }

    /**
     * Обновление финансовой сводки
     */
    updateFinancialSummary() {
        console.log('Updating financial summary:', {
            totalIncome: this.totalIncome,
            totalExpenses: this.totalExpenses,
            monthlyIncome: this.monthlyIncome
        });
        
        // Обновляем доходы
        const totalIncomeEl = document.getElementById('totalIncome') || 
                             document.querySelector('.finance-item:nth-child(1) .finance-value');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = `$${this.totalIncome.toLocaleString()}`;
            console.log('Updated totalIncome: $' + this.totalIncome.toLocaleString());
        }
        
        // Обновляем расходы
        const totalExpensesEl = document.getElementById('totalExpenses') || 
                               document.querySelector('.finance-item:nth-child(2) .finance-value');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = `$${this.totalExpenses.toLocaleString()}`;
            console.log('Updated totalExpenses: $' + this.totalExpenses.toLocaleString());
        }
        
        // Обновляем месячный доход
        const monthlyIncomeEl = document.getElementById('monthlyIncome') || 
                               document.querySelector('.finance-item:nth-child(3) .finance-value');
        if (monthlyIncomeEl) {
            monthlyIncomeEl.textContent = `$${this.monthlyIncome.toLocaleString()}`;
            console.log('Updated monthlyIncome: $' + this.monthlyIncome.toLocaleString());
        }
    }

    /**
     * Обновление истории переводов
     */
    updateTransfersHistory() {
        const historyContainer = document.getElementById('transfersHistory');
        const historyCount = document.getElementById('historyCount');
        
        if (!historyContainer) return;
        
        // Очищаем контейнер
        historyContainer.innerHTML = '';
        
        if (this.transfersHistory.length === 0) {
            historyContainer.innerHTML = '<div class="no-transfers">История переводов пуста</div>';
            return;
        }
        
        // Получаем текущего игрока
        const currentPlayerIndex = this.getCurrentPlayerIndex();
        
        // Получаем данные игрока из глобальных переменных
        let currentPlayerName = `Player ${currentPlayerIndex}`;
        
        // Пытаемся получить имя игрока из roomData
        if (this.roomData?.players?.[currentPlayerIndex]?.name) {
            currentPlayerName = this.roomData.players[currentPlayerIndex].name;
        }
        
        console.log(`🔍 Filtering transfers for current player: ${currentPlayerName} (index: ${currentPlayerIndex})`);
        console.log(`📋 Total transfers available: ${this.transfersHistory.length}`);
        console.log(`📋 Transfers data:`, this.transfersHistory);
        
        // Фильтруем только операции текущего игрока
        const myTransfers = this.transfersHistory.filter(transfer => {
            // Показываем операции где текущий игрок - отправитель или получатель
            const isSender = transfer.sender_index === currentPlayerIndex;
            const isRecipient = transfer.recipient_index === currentPlayerIndex;
            
            // Для банковских операций показываем только если они касаются текущего игрока
            const isBankToPlayer = transfer.sender_index === -1 && transfer.recipient_index === currentPlayerIndex;
            const isPlayerToBank = transfer.sender_index === currentPlayerIndex && transfer.recipient_index === -1;
            
            console.log(`🔍 Transfer ${transfer.description}: sender=${transfer.sender_index}, recipient=${transfer.recipient_index}, currentPlayer=${currentPlayerIndex}, isSender=${isSender}, isRecipient=${isRecipient}, isBankToPlayer=${isBankToPlayer}, isPlayerToBank=${isPlayerToBank}`);
            
            return isSender || isRecipient || isBankToPlayer || isPlayerToBank;
        });
        
        console.log(`📊 Found ${myTransfers.length} transfers for current player out of ${this.transfersHistory.length} total`);
        
        if (myTransfers.length === 0) {
            historyContainer.innerHTML = '<div class="no-transfers">У вас пока нет операций</div>';
            return;
        }
        
        // Обновляем счетчик только для своих операций
        if (historyCount) {
            historyCount.textContent = myTransfers.length;
        }
        
        // Сортируем по дате (новые сверху)
        const sortedTransfers = [...myTransfers].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        // Создаем элементы истории
        sortedTransfers.forEach(transfer => {
            const transferElement = this.createTransferElement(transfer);
            historyContainer.appendChild(transferElement);
        });
        
        console.log(`✅ Updated transfers history with ${sortedTransfers.length} transfers for current player`);
    }

    /**
     * Создание элемента перевода для истории
     */
    createTransferElement(transfer) {
        const element = document.createElement('div');
        element.className = 'transfer-item';
        
        // Получаем ID текущего пользователя
        const user = JSON.parse(localStorage.getItem('user'));
        const currentUserId = user ? user.id : null;
        
        // Определяем, является ли перевод доходом или расходом
        const isIncome = transfer.sender_index === -1 || 
                        (transfer.recipient_index === this.getCurrentPlayerIndex() && transfer.sender_index !== this.getCurrentPlayerIndex());
        const isOutgoing = transfer.sender_index === this.getCurrentPlayerIndex() && transfer.recipient_index !== -1;
        
        const amount = transfer.amount || 0;
        const amountText = isIncome ? `+$${amount.toLocaleString()}` : `-$${amount.toLocaleString()}`;
        const amountClass = isIncome ? 'income' : 'expense';
        
        // Форматируем время
        const date = new Date(transfer.timestamp);
        const timeAgo = this.getTimeAgo(date);
        
        // Определяем отправителя и получателя
        let senderName = 'Банк';
        let recipientName = 'Банк';
        
        if (transfer.sender_index !== -1 && this.roomData?.players?.[transfer.sender_index]) {
            senderName = this.roomData.players[transfer.sender_index].name;
        }
        if (transfer.recipient_index !== -1 && this.roomData?.players?.[transfer.recipient_index]) {
            recipientName = this.roomData.players[transfer.recipient_index].name;
        }
        
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
     * Обновление кредитной информации
     */
    updateCreditInfo() {
        const currentCreditEl = document.getElementById('currentCredit');
        const maxCreditEl = document.getElementById('maxCredit');
        
        if (currentCreditEl) {
            currentCreditEl.textContent = `$${this.currentCredit.toLocaleString()}`;
        }
        
        if (maxCreditEl) {
            this.maxCredit = Math.floor(this.monthlyIncome / 100) * 1000;
            maxCreditEl.textContent = `$${this.maxCredit.toLocaleString()}`;
        }
        
        console.log('Credit:', this.currentCredit);
    }

    /**
     * Открытие банковского модального окна
     */
    async openBank() {
        console.log('=== OPENING BANK MODAL ===');
        
        try {
            // Показываем индикатор загрузки
            this.showLoadingIndicator();
            
            // Загружаем данные
            await this.loadBankData(true);
            
            // Загружаем получателей
            await this.loadRecipients();
            
            // Показываем модальное окно
            const modal = document.getElementById('bankModal');
            if (modal) {
                modal.style.display = 'block';
                modal.classList.add('modal-show');
                
                // Принудительное обновление UI
                setTimeout(() => {
                    this.updateBankUI();
                }, 100);
            }
            
            console.log('=== BANK MODAL OPENED SUCCESSFULLY ===');
            
        } catch (error) {
            console.error('Error opening bank modal:', error);
            this.showError('Ошибка при открытии банка: ' + error.message);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    /**
     * Закрытие банковского модального окна
     */
    closeBankModal() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.classList.remove('modal-show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Загрузка списка получателей
     */
    async loadRecipients() {
        try {
            const roomId = this.getRoomIdFromURL();
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!roomId || !user) return;
            
            console.log('Loading recipients for user:', user.id);
            
            const response = await fetch(`/api/rooms/${roomId}?user_id=${user.id}`);
            if (!response.ok) return;
            
            const data = await response.json();
            console.log('Players data:', data.players);
            
            const recipientSelect = document.getElementById('recipientSelect');
            if (!recipientSelect) return;
            
            // Очищаем существующие опции
            recipientSelect.innerHTML = '<option value="">Выберите игрока...</option>';
            
            if (data.players) {
                data.players.forEach((player, index) => {
                    console.log(`Player ${index}:`, {
                        name: player.name,
                        user_id: player.user_id,
                        current_user_id: user.id,
                        is_current_user: player.user_id === user.id
                    });
                    
                    // Исключаем текущего пользователя
                    if (player.user_id !== user.id) {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = player.name;
                        recipientSelect.appendChild(option);
                        console.log('Added recipient:', player.name, 'index:', index);
                    } else {
                        console.log('Skipped current user:', player.name, 'user_id:', player.user_id);
                    }
                });
            }
            
        } catch (error) {
            console.error('Error loading recipients:', error);
        }
    }

    /**
     * Обработка перевода средств
     */
    async processTransfer() {
        try {
            // Валидация формы
            if (!this.validateTransferForm()) {
                return;
            }
            
            // Подготавливаем данные
            const transferData = this.prepareTransferData();
            
            // Отправляем запрос
            const response = await this.sendTransferRequest(transferData);
            
            if (response.ok) {
                // Получаем данные из формы для анимации
                const amountInput = document.getElementById('transferAmount');
                const recipientSelect = document.getElementById('recipientSelect');
                const transferAmount = parseFloat(amountInput.value);
                const recipientName = recipientSelect.options[recipientSelect.selectedIndex].text;
                
                // Показываем анимацию перевода
                this.showTransferAnimation(transferAmount, recipientName);
                
                // Ждем обновления баланса с сервера
                setTimeout(async () => {
                    console.log('🔄 Получаем обновленный баланс с сервера...');
                    await this.loadBankData(true); // Принудительное обновление для получения актуального баланса
                    
                    // Показываем успех после обновления
                    this.showSuccess(`Перевод $${transferAmount} выполнен успешно!`);
                }, 1000); // 1 секунда задержка для анимации
                
                // Очищаем форму
                this.resetTransferForm();
                
            } else {
                this.showError('Ошибка при выполнении перевода: ' + (response.data?.message || 'Неизвестная ошибка'));
            }
            
        } catch (error) {
            console.error('Transfer error:', error);
            this.showError('Ошибка при выполнении перевода: ' + error.message);
        }
    }

    /**
     * Валидация формы перевода
     */
    validateTransferForm() {
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        console.log('Validating transfer form:', {
            recipientSelect: !!recipientSelect,
            amountInput: !!amountInput,
            recipientValue: recipientSelect?.value,
            amountValue: amountInput?.value
        });
        
        if (!recipientSelect || !amountInput) {
            this.showError('Форма перевода не найдена');
            return false;
        }
        
        const recipientIndex = recipientSelect.value;
        const amount = parseFloat(amountInput.value);
        
        console.log('Validation values:', {
            recipientIndex,
            amount,
            amountInputValue: amountInput.value,
            minAmount: this.config.minTransferAmount,
            currentBalance: this.currentBalance
        });
        
        if (!recipientIndex || recipientIndex === '') {
            this.showError('Выберите получателя');
            return false;
        }
        
        if (isNaN(amount) || amount < this.config.minTransferAmount) {
            this.showError(`Минимальная сумма перевода: $${this.config.minTransferAmount}`);
            return false;
        }
        
        if (amount > this.currentBalance) {
            this.showError('Недостаточно средств на балансе');
            return false;
        }
        
        console.log('Transfer validation passed');
        return true;
    }

    /**
     * Подготовка данных для перевода
     */
    prepareTransferData() {
        const roomId = this.getRoomIdFromURL();
        const user = JSON.parse(localStorage.getItem('user'));
        const recipientIndex = parseInt(document.getElementById('recipientSelect').value);
        const amount = parseFloat(document.getElementById('transferAmount').value);
        
        const transferData = {
            roomId,
            userId: user.id,
            recipientIndex,
            amount
        };
        
        console.log('Prepared transfer data:', transferData);
        return transferData;
    }

    /**
     * Отправка запроса на перевод
     */
    async sendTransferRequest(transferData) {
        const url = `/api/rooms/${transferData.roomId}/transfer`;
        const body = {
            user_id: transferData.userId,
            recipient_index: transferData.recipientIndex,
            amount: transferData.amount
        };
        
        console.log('Sending transfer request:', { url, body });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        console.log('Transfer response:', { status: response.status, data });
        
        return {
            ok: response.ok,
            status: response.status,
            data
        };
    }

    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        document.getElementById('recipientSelect').value = '';
        document.getElementById('transferAmount').value = '';
    }

    /**
     * Анимация перевода
     */
    showTransferAnimation(amount, recipientName) {
        console.log(`💸 Анимация перевода: $${amount} → ${recipientName}`);
        
        // Создаем элемент анимации
        const animation = document.createElement('div');
        animation.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            animation: pulse 1s ease-in-out;
        `;
        
        animation.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">��</div>
            <div>Перевод $${amount.toLocaleString()}</div>
            <div style="font-size: 14px; opacity: 0.8;">→ ${recipientName}</div>
        `;
        
        document.body.appendChild(animation);
        
        // Убираем анимацию через 2 секунды
        setTimeout(() => {
            document.body.removeChild(animation);
        }, 2000);
    }

    /**
     * Анимация изменения баланса
     */
    animateBalanceChange(oldBalance, newBalance) {
        const difference = newBalance - oldBalance;
        const isIncrease = difference > 0;
        
        console.log(`💰 Анимация изменения баланса: ${oldBalance} → ${newBalance} (${isIncrease ? '+' : ''}${difference})`);
        
        // Находим элементы баланса
        const balanceElements = document.querySelectorAll('[data-balance], .balance-amount, #currentBalance');
        
        balanceElements.forEach(element => {
            // Добавляем класс анимации
            element.classList.add('balance-updated');
            
            // Убираем класс через 500ms
            setTimeout(() => {
                element.classList.remove('balance-updated');
            }, 500);
        });
    }

    /**
     * Показать индикатор загрузки
     */
    showLoadingIndicator() {
        let indicator = document.getElementById('loadingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'loadingIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 2000;
                font-size: 16px;
            `;
            indicator.innerHTML = '⏳ Загрузка...';
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'block';
    }

    /**
     * Скрыть индикатор загрузки
     */
    hideLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Показать ошибку
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Показать успех
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            error: '#ef4444',
            success: '#10b981',
            info: '#3b82f6'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Убираем уведомление через 3 секунды
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Получение ID комнаты из URL
     */
    getRoomIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }

    /**
     * Получение индекса текущего игрока
     */
    getCurrentPlayerIndex() {
        // Используем глобальную переменную currentPlayer
        return typeof currentPlayer !== 'undefined' ? currentPlayer : 0;
    }

    /**
     * Получение времени назад
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'только что';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} мин назад`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ч назад`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} дн назад`;
        }
    }
}

// Экспортируем класс для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankModule;
} else {
    window.BankModule = BankModule;
}
