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
        this.hasLocalChanges = false; // Флаг локальных изменений
        
        // Инициализируем конфигурацию
        this.financialConfig = new FinancialConfig();
        
        // Конфигурация
        this.config = {
            minTransferAmount: this.financialConfig.getTransferConfig().minAmount,
            maxTransferAmount: this.financialConfig.getTransferConfig().maxAmount,
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
        
        // Добавляем более частое обновление для получения переводов
        setInterval(() => {
            // Проверяем входящие переводы только если нет локальных изменений
            if (!this.hasLocalChanges) {
                this.checkForIncomingTransfers();
            } else {
                console.log('🛡️ Пропускаем проверку входящих переводов - есть локальные изменения');
            }
        }, 5000); // Проверяем каждые 5 секунд
        
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
                    
                    // При принудительном обновлении обновляем только если сервер имеет более свежие данные
                    if (forceUpdate) {
                        // Если есть локальные изменения, не перезаписываем баланс
                        if (this.hasLocalChanges) {
                            console.log('🛡️ Локальные изменения обнаружены, сохраняем баланс:', this.currentBalance);
                            this.hasLocalChanges = false; // Сбрасываем флаг
                        } else if (newBalance !== this.currentBalance) {
                            const oldBalance = this.currentBalance;
                            this.currentBalance = newBalance;
                            this.lastUpdateTime = Date.now();
                            console.log('Balance updated from server (force):', oldBalance, '→', newBalance);
                            
                            // Показываем анимацию изменения баланса
                            this.animateBalanceChange(oldBalance, newBalance);
                        } else {
                            console.log('Server balance unchanged, keeping local balance:', this.currentBalance);
                        }
                    } else {
                        // При обычном обновлении обновляем только если баланс увеличился (пополнение)
                        if (newBalance > this.currentBalance) {
                            const oldBalance = this.currentBalance;
                            this.currentBalance = newBalance;
                            this.lastUpdateTime = Date.now();
                            console.log('Balance updated from server (increase):', oldBalance, '→', newBalance);
                            
                            // Показываем анимацию изменения баланса
                            this.animateBalanceChange(oldBalance, newBalance);
                        } else {
                            console.log('Keeping current balance:', this.currentBalance, '(new:', newBalance, ')');
                        }
                    }
                } else {
                    console.log('Player not found in room, user.id:', user.id, 'players:', data.players.map(p => p.user_id));
                }
            
            // Загружаем историю переводов только если нет локальных изменений
            if (data.game_data?.transfers_history && !this.hasLocalChanges) {
                this.transfersHistory = data.game_data.transfers_history;
                console.log('Transfers history loaded from server:', this.transfersHistory.length, 'transfers');
            } else if (this.hasLocalChanges) {
                console.log('🛡️ Локальные изменения в истории, сохраняем текущую историю');
                // Не перезаписываем историю, но проверяем, есть ли новые переводы на сервере
                if (data.game_data?.transfers_history && data.game_data.transfers_history.length > this.transfersHistory.length) {
                    console.log('🔄 Обнаружены новые переводы на сервере, обновляем историю');
                    this.transfersHistory = data.game_data.transfers_history;
                }
            }
            
            // Загружаем финансовые данные
            await this.loadFinancialData(roomId, playerIndex);
            
            // Если финансовые данные не загрузились, используем значения по умолчанию
            if (this.totalIncome === 0 && this.totalExpenses === 0 && this.monthlyIncome === 0) {
                console.log('Using default financial values');
                this.totalIncome = 0;
                this.totalExpenses = 0;
                this.monthlyIncome = this.financialConfig.getDefaultProfession().cashFlow;
            }
            
            // Принудительно обновляем финансовую сводку
            this.updateFinancialSummary();
            
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
            
            // Сначала пытаемся загрузить из room data
            if (this.roomData && this.roomData.players && this.roomData.players[playerIndex]) {
                const player = this.roomData.players[playerIndex];
                if (player.profession_data) {
                    this.totalIncome = player.profession_data.salary || 0;
                    this.totalExpenses = player.profession_data.expenses || 0;
                    this.monthlyIncome = player.profession_data.cash_flow || player.profession_data.cashFlow || this.financialConfig.getDefaultProfession().cashFlow;
                    this.currentCredit = 0;
                    console.log('Financial data loaded from room data:', {
                        totalIncome: this.totalIncome,
                        totalExpenses: this.totalExpenses,
                        monthlyIncome: this.monthlyIncome,
                        currentCredit: this.currentCredit
                    });
                    return;
                }
            }
            
            // Если нет данных в room, пытаемся API
            const response = await fetch(`/api/rooms/${roomId}/player/${playerIndex}/profession?user_id=${user.id}`);
            
            if (response.ok) {
                const data = await response.json();
                this.totalIncome = data.totalIncome || 0;
                this.totalExpenses = data.totalExpenses || 0;
                this.monthlyIncome = data.cashFlow || this.financialConfig.getDefaultProfession().cashFlow;
                this.currentCredit = data.currentCredit || 0;
                console.log('Financial data loaded from API:', {
                    totalIncome: this.totalIncome,
                    totalExpenses: this.totalExpenses,
                    monthlyIncome: this.monthlyIncome,
                    currentCredit: this.currentCredit
                });
            } else {
                console.log('Using default financial values (API failed)');
                this.totalIncome = 0;
                this.totalExpenses = 0;
                this.monthlyIncome = this.financialConfig.getDefaultProfession().cashFlow;
                this.currentCredit = 0;
            }
        } catch (error) {
            console.error('Error loading financial data:', error);
            // Устанавливаем значения по умолчанию при ошибке
            this.totalIncome = 0;
            this.totalExpenses = 0;
            this.monthlyIncome = 3800;
            this.currentCredit = 0;
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
        console.log('=== UPDATING FINANCIAL SUMMARY ===');
        console.log('Financial data:', {
            totalIncome: this.totalIncome,
            totalExpenses: this.totalExpenses,
            monthlyIncome: this.monthlyIncome
        });
        
        // Обновляем доходы
        const totalIncomeEl = document.getElementById('totalIncome');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = `$${this.totalIncome.toLocaleString()}`;
            console.log('✅ Updated totalIncome: $' + this.totalIncome.toLocaleString());
        } else {
            console.warn('❌ totalIncome element not found');
        }
        
        // Обновляем расходы
        const totalExpensesEl = document.getElementById('totalExpenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = `$${this.totalExpenses.toLocaleString()}`;
            console.log('✅ Updated totalExpenses: $' + this.totalExpenses.toLocaleString());
        } else {
            console.warn('❌ totalExpenses element not found');
        }
        
        // Обновляем месячный доход
        const monthlyIncomeEl = document.getElementById('monthlyIncome');
        if (monthlyIncomeEl) {
            monthlyIncomeEl.textContent = `$${this.monthlyIncome.toLocaleString()}/мес`;
            console.log('Updated monthlyIncome: $' + this.monthlyIncome.toLocaleString() + '/мес');
        } else {
            console.warn('monthlyIncome element not found');
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
     * Открытие кредитного модального окна
     */
    openCreditModal() {
        console.log('Opening credit modal...');
        // Простая реализация - можно расширить позже
        alert('Кредитный модуль в разработке');
    }

    /**
     * Закрытие банковского модального окна
     */
    closeBankModal() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('modal-show');
            console.log('Bank modal closed');
        }
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
        } finally {
            this.hideLoadingIndicator();
        }
    }

    /**
     * Загрузка списка получателей
     */
    async loadRecipients() {
        const recipientSelect = document.getElementById('recipientSelect');
        if (!recipientSelect) return;
        
        // Очищаем существующие опции
        recipientSelect.innerHTML = '<option value="">Выберите получателя</option>';
        
        if (!this.roomData || !this.roomData.players) {
            console.log('No room data available for recipients');
            return;
        }
        
        const currentPlayerIndex = this.getCurrentPlayerIndex();
        
        this.roomData.players.forEach((player, index) => {
            if (index !== currentPlayerIndex) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = player.name || `Игрок ${index + 1}`;
                recipientSelect.appendChild(option);
            }
        });
        
        console.log('Recipients loaded:', this.roomData.players.length - 1);
    }

    /**
     * Обработка перевода
     */
    async processTransfer() {
        if (this.isLoading) return;
        
        try {
            // Валидация формы
            const validation = this.validateTransferForm();
            if (!validation.valid) {
                this.showError(validation.message);
                return;
            }
            
            // Показываем индикатор загрузки
            this.showLoadingIndicator();
            this.isLoading = true;
            
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
                
                // Сразу обновляем локальный баланс
                const oldBalance = this.currentBalance;
                this.currentBalance -= transferAmount;
                this.hasLocalChanges = true; // Отмечаем локальные изменения
                console.log('💰 Локальное обновление баланса:', oldBalance, '→', this.currentBalance);
                
                // Показываем анимацию изменения баланса
                this.animateBalanceChange(oldBalance, this.currentBalance);
                
                // Добавляем перевод в локальную историю
                const newTransfer = {
                    sender_index: this.getCurrentPlayerIndex(),
                    recipient_index: parseInt(recipientSelect.value),
                    amount: transferAmount,
                    description: `Перевод игроку ${recipientName}`,
                    timestamp: new Date().toISOString()
                };
                this.transfersHistory.unshift(newTransfer);
                console.log('📝 Добавлен перевод в локальную историю:', newTransfer);
                
                // Показываем уведомление отправителю о том, что перевод отправлен
                this.showTransferSentNotification(recipientName, transferAmount);
                
                // Обновляем UI сразу
                this.updateBankUI();
                
                    // Ждем обновления с сервера
                setTimeout(async () => {
                    console.log('🔄 Получаем обновленный баланс с сервера...');
                    
                    // Сохраняем текущий баланс перед обновлением
                    const currentBalanceBeforeUpdate = this.currentBalance;
                    
                    await this.loadBankData(true); // Принудительное обновление для получения актуального баланса
                    
                    // Если сервер вернул старый баланс, восстанавливаем наш
                    if (this.currentBalance > currentBalanceBeforeUpdate) {
                        console.log('🔄 Сервер вернул старый баланс, восстанавливаем локальный:', currentBalanceBeforeUpdate);
                        this.currentBalance = currentBalanceBeforeUpdate;
                        this.updateBankUI();
                    }
                    
                    // НЕ сбрасываем флаг локальных изменений - оставляем защиту активной
                    console.log('🔄 Защита локальных изменений остается активной');
                    
                    // Показываем успех после обновления
                    this.showSuccess(`Перевод $${transferAmount} выполнен успешно!`);
                }, 3000); // 3 секунды задержка для сервера
                
                // Очищаем форму
                this.resetTransferForm();
                
            } else {
                throw new Error(response.data?.message || 'Ошибка при выполнении перевода');
            }
            
        } catch (error) {
            console.error('Transfer error:', error);
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
        
        console.log('Validating transfer form:', {
            recipientSelect: !!recipientSelect,
            amountInput: !!amountInput,
            recipientValue: recipientSelect?.value,
            amountValue: amountInput?.value
        });
        
        if (!recipientSelect || !amountInput) {
            return { valid: false, message: 'Форма не найдена' };
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
        
        console.log('Transfer validation passed');
        return { valid: true };
    }

    /**
     * Подготовка данных перевода
     */
    prepareTransferData() {
        const roomId = this.getRoomIdFromURL();
        const user = JSON.parse(localStorage.getItem('user'));
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        const transferData = {
            roomId,
            userId: user.id,
            recipientIndex: parseInt(recipientSelect.value),
            amount: parseInt(amountInput.value)
        };
        
        console.log('Prepared transfer data:', transferData);
        return transferData;
    }

    /**
     * Отправка запроса перевода
     */
    async sendTransferRequest(transferData) {
        const requestBody = {
            user_id: transferData.userId,
            recipient_index: transferData.recipientIndex,
            amount: transferData.amount
        };
        
        console.log('Sending transfer request:', {
            url: `/api/rooms/${transferData.roomId}/transfer`,
            body: requestBody
        });
        
        const response = await fetch(`/api/rooms/${transferData.roomId}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        console.log('Transfer response:', { status: response.status, data });
        return { ok: response.ok, data };
    }

    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        if (recipientSelect) recipientSelect.value = '';
        if (amountInput) amountInput.value = '';
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
        
        // Показываем уведомление об изменении
        if (Math.abs(difference) > 0) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${isIncrease ? 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                font-weight: bold;
                z-index: 2000;
                animation: slideInRight 0.3s ease;
            `;
            
            notification.innerHTML = `
                <div style="font-size: 1.1rem;">
                    ${isIncrease ? '💰' : '💸'} ${isIncrease ? '+' : ''}$${difference.toLocaleString()}
                </div>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    Баланс: $${newBalance.toLocaleString()}
                </div>
            `;
            
            // Добавляем CSS анимацию
            if (!document.getElementById('balanceAnimationCSS')) {
                const style = document.createElement('style');
                style.id = 'balanceAnimationCSS';
                style.textContent = `
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    .balance-updated {
                        animation: balancePulse 0.5s ease;
                    }
                    @keyframes balancePulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            // Удаляем уведомление через 3 секунды
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
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
            font-size: 1.2rem;
            font-weight: bold;
            text-align: center;
            animation: transferPulse 1s ease-in-out;
        `;
        
        animation.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">💸</div>
            <div>Перевод $${amount.toLocaleString()}</div>
            <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 5px;">→ ${recipientName}</div>
        `;
        
        // Добавляем CSS анимацию
        if (!document.getElementById('transferAnimationCSS')) {
            const style = document.createElement('style');
            style.id = 'transferAnimationCSS';
            style.textContent = `
                @keyframes transferPulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Добавляем на страницу
        document.body.appendChild(animation);
        
        // Удаляем через 1 секунду
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 1000);
    }

    /**
     * Показать индикатор загрузки
     */
    showLoadingIndicator() {
        // Простая реализация индикатора загрузки
        console.log('Showing loading indicator');
    }

    /**
     * Скрыть индикатор загрузки
     */
    hideLoadingIndicator() {
        // Простая реализация скрытия индикатора загрузки
        console.log('Hiding loading indicator');
    }

    /**
     * Показать сообщение об успехе
     */
    showSuccess(message) {
        console.log('Success:', message);
    }

    /**
     * Показать сообщение об ошибке
     */
    showError(message) {
        console.error('Error:', message);
    }

    /**
     * Проверка входящих переводов
     */
    async checkForIncomingTransfers() {
        try {
            const roomId = this.getRoomIdFromURL();
            if (!roomId) return;
            
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            
            const response = await fetch(`/api/rooms/${roomId}?user_id=${user.id}`);
            if (!response.ok) return;
            
            const data = await response.json();
            const playerIndex = data.players.findIndex(p => p.user_id === user.id);
            
            if (playerIndex === -1) return;
            
            console.log('🔍 Проверка входящих переводов для игрока:', playerIndex, 'Текущий баланс:', this.currentBalance);
            
            // Проверяем, изменился ли баланс (получен перевод)
            const serverBalance = data.game_data?.player_balances?.[playerIndex] || 0;
            console.log('🔍 Проверка баланса: локальный =', this.currentBalance, 'сервер =', serverBalance);
            
            // Проверяем, есть ли недавние переводы от этого игрока
            const recentTransfer = this.transfersHistory.find(transfer => 
                transfer.sender_index === playerIndex && 
                (Date.now() - new Date(transfer.timestamp).getTime()) < 10000 // 10 секунд
            );
            
            if (recentTransfer) {
                console.log('🛡️ Обнаружен недавний перевод от этого игрока, пропускаем обновление баланса');
                return;
            }
            
            if (serverBalance > this.currentBalance) {
                const difference = serverBalance - this.currentBalance;
                console.log('💰 Получен перевод! Баланс увеличился на:', difference);
                console.log('💰 Текущий игрок:', playerIndex, 'Баланс:', this.currentBalance, '→', serverBalance);
                
                // Обновляем баланс
                const oldBalance = this.currentBalance;
                this.currentBalance = serverBalance;
                
                // Показываем анимацию
                this.animateBalanceChange(oldBalance, this.currentBalance);
                
                // Обновляем UI
                this.updateBankUI();
                
                // Показываем уведомление
                this.showIncomingTransferNotification(difference);
                
                // Обновляем историю переводов
                this.updateTransfersHistory();
            } else if (serverBalance < this.currentBalance) {
                console.log('⚠️ Серверный баланс меньше локального, сохраняем локальный:', this.currentBalance);
                console.log('🛡️ Защита: не перезаписываем баланс отправителя');
            } else {
                console.log('✅ Баланс синхронизирован:', this.currentBalance);
            }
            
        } catch (error) {
            console.error('Error checking for incoming transfers:', error);
        }
    }

    /**
     * Показать уведомление о входящем переводе
     */
    showIncomingTransferNotification(amount) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 2000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        
        notification.innerHTML = `
            <div style="font-size: 1.1rem;">
                💰 Получен перевод!
            </div>
            <div style="font-size: 1.3rem; margin-top: 5px;">
                +$${amount.toLocaleString()}
            </div>
        `;
        
        // Добавляем CSS анимацию
        if (!document.getElementById('incomingTransferCSS')) {
            const style = document.createElement('style');
            style.id = 'incomingTransferCSS';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Показать уведомление об отправке перевода
     */
    showTransferSentNotification(recipientName, amount) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 2000;
            animation: slideInDown 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        
        notification.innerHTML = `
            <div style="font-size: 1.1rem; text-align: center;">
                ✈️ Перевод отправлен
            </div>
            <div style="font-size: 1.3rem; text-align: center; margin-top: 5px;">
                $${amount.toLocaleString()} → ${recipientName}
            </div>
        `;
        
        // Добавляем CSS анимацию
        if (!document.getElementById('transferSentCSS')) {
            const style = document.createElement('style');
            style.id = 'transferSentCSS';
            style.textContent = `
                @keyframes slideInDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        console.log(`✈️ Уведомление об отправке: $${amount} → ${recipientName}`);
    }

    /**
     * Показать уведомление получателю о переводе
     */
    showRecipientNotification(recipientName, amount) {
        // Создаем уведомление для получателя
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 2000;
            animation: slideInDown 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        
        notification.innerHTML = `
            <div style="font-size: 1.1rem; text-align: center;">
                💰 Получен перевод от ${recipientName}
            </div>
            <div style="font-size: 1.3rem; text-align: center; margin-top: 5px;">
                +$${amount.toLocaleString()}
            </div>
        `;
        
        // Добавляем CSS анимацию
        if (!document.getElementById('recipientNotificationCSS')) {
            const style = document.createElement('style');
            style.id = 'recipientNotificationCSS';
            style.textContent = `
                @keyframes slideInDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 4 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
        
        console.log(`📨 Уведомление отправлено получателю ${recipientName}: +$${amount}`);
    }

    /**
     * Получить ID комнаты из URL
     */
    getRoomIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }

    /**
     * Получить индекс текущего игрока
     */
    getCurrentPlayerIndex() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return 0;
            
            if (this.roomData && this.roomData.players) {
                return this.roomData.players.findIndex(p => p.user_id === user.id);
            }
            
            return 0;
        } catch (error) {
            console.error('Error getting current player index:', error);
            return 0;
        }
    }

    /**
     * Форматирование времени
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

    /**
     * Получить конфигурацию
     */
    getConfig() {
        return this.config;
    }
}

// Экспортируем класс для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankModule;
} else {
    window.BankModule = BankModule;
}