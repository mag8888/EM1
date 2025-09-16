/**
 * Банковский модуль - UI Сервис
 * Управляет всеми UI операциями и анимациями
 */

class BankUIService {
    constructor() {
        console.log('🎨 BankUIService: Инициализация UI сервиса');
        this.animationQueue = [];
        this.isAnimating = false;
    }
    
    /**
     * Обновить отображение баланса
     */
    updateBalanceDisplay(balance) {
        console.log('💰 BankUIService: Обновление отображения баланса', balance);
        
        const balanceElement = document.getElementById('currentBalance');
        if (balanceElement) {
            balanceElement.textContent = `$${balance.toLocaleString()}`;
            console.log('✅ BankUIService: Баланс обновлен в UI');
        } else {
            console.warn('⚠️ BankUIService: Элемент баланса не найден');
        }
    }
    
    /**
     * Обновить финансовую сводку
     */
    updateFinancialSummary(data) {
        console.log('📊 BankUIService: Обновление финансовой сводки', data);
        
        const { totalIncome, totalExpenses, monthlyIncome, currentCredit, maxCredit } = data;
        
        // Обновляем доходы
        const totalIncomeEl = document.getElementById('totalIncome');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = `$${totalIncome.toLocaleString()}`;
        }
        
        // Обновляем расходы
        const totalExpensesEl = document.getElementById('totalExpenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = `$${totalExpenses.toLocaleString()}`;
        }
        
        // Обновляем месячный доход
        const monthlyIncomeEl = document.getElementById('monthlyIncome');
        if (monthlyIncomeEl) {
            monthlyIncomeEl.textContent = `$${monthlyIncome.toLocaleString()}/мес`;
        }
        
        // Обновляем кредит
        const currentCreditEl = document.getElementById('currentCredit');
        if (currentCreditEl) {
            currentCreditEl.textContent = `$${currentCredit.toLocaleString()}`;
        }
        
        // Обновляем максимальный кредит
        const maxCreditEl = document.getElementById('maxCredit');
        if (maxCreditEl) {
            maxCreditEl.textContent = `$${maxCredit.toLocaleString()}`;
        }
        
        console.log('✅ BankUIService: Финансовая сводка обновлена');
    }
    
    /**
     * Обновить историю переводов
     */
    updateTransfersHistory(transfers, currentPlayerIndex) {
        console.log('📋 BankUIService: Обновление истории переводов', { 
            transfersCount: transfers.length, 
            currentPlayerIndex 
        });
        
        const historyContainer = document.getElementById('transfersHistory');
        if (!historyContainer) {
            console.warn('⚠️ BankUIService: Контейнер истории переводов не найден');
            return;
        }
        
        // Фильтруем переводы для текущего игрока
        const playerTransfers = transfers.filter(transfer => 
            transfer.sender_index === currentPlayerIndex || 
            transfer.recipient_index === currentPlayerIndex
        );
        
        // Очищаем контейнер
        historyContainer.innerHTML = '';
        
        // Добавляем переводы
        playerTransfers.forEach(transfer => {
            const transferElement = this.createTransferElement(transfer, currentPlayerIndex);
            historyContainer.appendChild(transferElement);
        });
        
        console.log(`✅ BankUIService: История переводов обновлена (${playerTransfers.length} переводов)`);
    }
    
    /**
     * Создать элемент перевода
     */
    createTransferElement(transfer, currentPlayerIndex) {
        const isSender = transfer.sender_index === currentPlayerIndex;
        const isRecipient = transfer.recipient_index === currentPlayerIndex;
        
        const element = document.createElement('div');
        element.className = `transfer-item ${isSender ? 'sent' : 'received'}`;
        
        const amount = transfer.amount || 0;
        const sign = isSender ? '-' : '+';
        const color = isSender ? '#EF4444' : '#10B981';
        
        element.innerHTML = `
            <div class="transfer-amount" style="color: ${color}">
                ${sign}$${amount.toLocaleString()}
            </div>
            <div class="transfer-description">
                ${transfer.description || 'Перевод'}
            </div>
            <div class="transfer-time">
                ${this.formatTransferTime(transfer.timestamp)}
            </div>
        `;
        
        return element;
    }
    
    /**
     * Форматировать время перевода
     */
    formatTransferTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Меньше минуты
            return 'только что';
        } else if (diff < 3600000) { // Меньше часа
            const minutes = Math.floor(diff / 60000);
            return `${minutes} мин назад`;
        } else if (diff < 86400000) { // Меньше дня
            const hours = Math.floor(diff / 3600000);
            return `${hours} ч назад`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    /**
     * Анимировать изменение баланса
     */
    animateBalanceChange(oldBalance, newBalance) {
        console.log('🎬 BankUIService: Анимация изменения баланса', { oldBalance, newBalance });
        
        const balanceElement = document.getElementById('currentBalance');
        if (!balanceElement) return;
        
        const difference = newBalance - oldBalance;
        const isIncrease = difference > 0;
        
        // Добавляем класс анимации
        balanceElement.classList.add('balance-changing');
        if (isIncrease) {
            balanceElement.classList.add('balance-increase');
        } else {
            balanceElement.classList.add('balance-decrease');
        }
        
        // Убираем классы через время анимации
        setTimeout(() => {
            balanceElement.classList.remove('balance-changing', 'balance-increase', 'balance-decrease');
        }, 1000);
    }
    
    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        console.log('🔔 BankUIService: Показ уведомления', { message, type });
        
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Добавляем в контейнер уведомлений
        let container = document.getElementById('notificationsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationsContainer';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '10000';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Убираем уведомление через 5 секунд
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    /**
     * Показать индикатор загрузки
     */
    showLoadingIndicator(message = 'Загрузка...') {
        console.log('⏳ BankUIService: Показ индикатора загрузки', message);
        
        let indicator = document.getElementById('loadingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'loadingIndicator';
            indicator.className = 'loading-indicator';
            indicator.innerHTML = `
                <div class="loading-spinner"></div>
                <div>${message}</div>
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.style.display = 'flex';
        const messageElement = indicator.querySelector('div:last-child');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    /**
     * Скрыть индикатор загрузки
     */
    hideLoadingIndicator() {
        console.log('✅ BankUIService: Скрытие индикатора загрузки');
        
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    /**
     * Обновить список получателей
     */
    updateRecipientsList(players, currentPlayerIndex) {
        console.log('👥 BankUIService: Обновление списка получателей', { 
            playersCount: players.length, 
            currentPlayerIndex 
        });
        
        const recipientSelect = document.getElementById('recipientSelect');
        if (!recipientSelect) {
            console.warn('⚠️ BankUIService: Селект получателей не найден');
            return;
        }
        
        // Очищаем список
        recipientSelect.innerHTML = '';
        
        // Добавляем получателей (исключая текущего игрока)
        players.forEach((player, index) => {
            if (index !== currentPlayerIndex) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = player.name || `Игрок ${index + 1}`;
                recipientSelect.appendChild(option);
            }
        });
        
        console.log(`✅ BankUIService: Список получателей обновлен (${recipientSelect.children.length} получателей)`);
    }
    
    /**
     * Сбросить форму перевода
     */
    resetTransferForm() {
        console.log('🔄 BankUIService: Сброс формы перевода');
        
        const amountInput = document.getElementById('transferAmount');
        const recipientSelect = document.getElementById('recipientSelect');
        
        if (amountInput) amountInput.value = '';
        if (recipientSelect) recipientSelect.selectedIndex = 0;
    }
    
    /**
     * Валидировать форму перевода
     */
    validateTransferForm() {
        console.log('✅ BankUIService: Валидация формы перевода');
        
        const amountInput = document.getElementById('transferAmount');
        const recipientSelect = document.getElementById('recipientSelect');
        
        if (!amountInput || !recipientSelect) {
            return { isValid: false, error: 'Форма не найдена' };
        }
        
        const amount = parseFloat(amountInput.value);
        const recipientIndex = parseInt(recipientSelect.value);
        
        if (!amount || amount <= 0) {
            return { isValid: false, error: 'Введите корректную сумму' };
        }
        
        if (isNaN(recipientIndex) || recipientIndex < 0) {
            return { isValid: false, error: 'Выберите получателя' };
        }
        
        return { isValid: true, amount, recipientIndex };
    }
}

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.BankUIService = BankUIService;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankUIService;
}
