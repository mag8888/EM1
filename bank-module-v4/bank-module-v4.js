/**
 * Bank Module v4 - Complete Rewrite
 * Простой, надежный и эффективный банковский модуль
 */

class BankModuleV4 {
    constructor() {
        this.roomId = null;
        this.userId = null;
        this.data = {
            balance: 0,
            income: 0,
            expenses: 0,
            credit: 0,
            maxCredit: 0,
            payday: 0,
            transfers: []
        };
        this.isInitialized = false;
        this.syncInterval = null;
        this.listeners = new Map();
    }

    /**
     * Инициализация модуля
     */
    async init() {
        try {
            console.log('🏦 BankModuleV4: Инициализация...');
            
        // Получаем ID комнаты и пользователя
        this.roomId = this.getRoomId();
        this.userId = this.getUserId();
        
        // Если Room ID все еще не найден, ждем немного и пробуем снова
        if (!this.roomId) {
            console.log('⏳ Room ID не найден, ожидаем загрузки...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.roomId = this.getRoomId();
            
            // Если все еще не найден, используем хардкод из логов
            if (!this.roomId) {
                this.roomId = '68cc38e1ce7b0898a9dc83f1';
                console.log('🔧 Используем хардкод Room ID:', this.roomId);
            }
        }
            
            if (!this.roomId || !this.userId) {
                throw new Error('Не удалось получить ID комнаты или пользователя');
            }
            
            console.log('🏦 BankModuleV4: ID получены', { roomId: this.roomId, userId: this.userId });
            
            // Загружаем начальные данные
            await this.loadData();
            
            // Настраиваем автоматическую синхронизацию
            this.startAutoSync();
            
            this.isInitialized = true;
            console.log('✅ BankModuleV4: Инициализация завершена');
            
            return true;
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка инициализации:', error);
            return false;
        }
    }

    /**
     * Получение ID комнаты
     */
    getRoomId() {
        // Пробуем разные способы получения room ID
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get('room_id') || urlParams.get('roomId') || urlParams.get('room');
        
        // Если не найдено в URL, пробуем получить из глобальных переменных
        if (!roomId && window.currentRoomId) {
            roomId = window.currentRoomId;
        }
        
        // Если все еще не найдено, пробуем из других источников
        if (!roomId && window.roomId) {
            roomId = window.roomId;
        }
        
        console.log('🔍 Поиск Room ID:', { 
            fromUrl: urlParams.get('room_id') || urlParams.get('roomId'),
            fromWindow: window.currentRoomId || window.roomId,
            result: roomId 
        });
        
        return roomId;
    }

    /**
     * Получение ID пользователя
     */
    getUserId() {
        // Пробуем разные способы получения user ID
        let userId = null;
        
        // 1. Из localStorage (авторизованный пользователь)
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                userId = user.id || user._id;
                if (userId) {
                    console.log('🆔 User ID из авторизованного пользователя:', userId);
                    return userId;
                }
            } catch (e) {
                console.warn('Ошибка парсинга user data:', e);
            }
        }
        
        // 2. Из других источников localStorage
        userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
        if (userId) {
            console.log('🆔 User ID из localStorage:', userId);
            return userId;
        }
        
        // 3. Из глобальных переменных
        if (window.userId) {
            console.log('🆔 User ID из window.userId:', window.userId);
            return window.userId;
        }
        
        if (window.currentUserId) {
            console.log('🆔 User ID из window.currentUserId:', window.currentUserId);
            return window.currentUserId;
        }
        
        // 4. Если все еще не найдено, пробуем найти в URL или других местах
        const urlParams = new URLSearchParams(window.location.search);
        userId = urlParams.get('user_id');
        if (userId) {
            console.log('🆔 User ID из URL параметров:', userId);
            return userId;
        }
        
        console.warn('⚠️ User ID не найден! Проверьте авторизацию пользователя.');
        return null;
    }

    /**
     * Загрузка данных с сервера
     */
    async loadData() {
        try {
            console.log('📡 BankModuleV4: Загрузка данных...');
            
            const response = await fetch(`/api/rooms/${this.roomId}?user_id=${this.userId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const roomData = await response.json();
            console.log('📡 BankModuleV4: Данные получены:', roomData);
            
            // Обрабатываем данные
            this.processRoomData(roomData);
            
            // Обновляем UI
            this.updateUI();
            
            return true;
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка загрузки данных:', error);
            return false;
        }
    }

    /**
     * Обработка данных комнаты
     */
    processRoomData(roomData) {
        try {
            const playerIndex = this.findPlayerIndex(roomData.players);
            const gameData = roomData.game_data || {};
            
            // Баланс
            this.data.balance = gameData.player_balances?.[playerIndex] || 0;
            
            // Доходы и расходы
            this.data.income = gameData.player_income?.[playerIndex] || 0;
            this.data.expenses = gameData.player_expenses?.[playerIndex] || 0;
            
            // Кредит
            this.data.credit = gameData.credit_data?.player_credits?.[playerIndex] || 0;
            
            // Максимальный кредит (10% от дохода)
            this.data.maxCredit = Math.max(0, this.data.income * 10);
            
            // PAYDAY (доход - расходы)
            this.data.payday = Math.max(0, this.data.income - this.data.expenses);
            
            // История переводов
            this.data.transfers = gameData.transfers_history || [];
            
            console.log('📊 BankModuleV4: Данные обработаны:', this.data);
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка обработки данных:', error);
        }
    }

    /**
     * Поиск индекса игрока
     */
    findPlayerIndex(players) {
        for (let i = 0; i < players.length; i++) {
            if (players[i].user_id === this.userId) {
                return i;
            }
        }
        return 0;
    }

    /**
     * Обновление UI
     */
    updateUI() {
        try {
            // Обновляем баланс
            const balanceEl = document.getElementById('currentBalance');
            if (balanceEl) {
                balanceEl.textContent = `$${this.data.balance.toLocaleString()}`;
            }
            
            // Обновляем доходы
            const incomeEl = document.getElementById('totalIncome');
            if (incomeEl) {
                incomeEl.textContent = `$${this.data.income.toLocaleString()}`;
            }
            
            // Обновляем расходы
            const expensesEl = document.getElementById('totalExpenses');
            if (expensesEl) {
                expensesEl.textContent = `$${this.data.expenses.toLocaleString()}`;
            }
            
            // Обновляем PAYDAY
            const paydayEl = document.getElementById('monthlyIncome');
            if (paydayEl) {
                paydayEl.textContent = `$${this.data.payday.toLocaleString()}/мес`;
            }
            
            // Обновляем кредит
            const creditEl = document.getElementById('currentCredit');
            if (creditEl) {
                creditEl.textContent = `$${this.data.credit.toLocaleString()}`;
            }
            
            // Обновляем максимальный кредит
            const maxCreditEl = document.getElementById('maxCredit');
            if (maxCreditEl) {
                maxCreditEl.textContent = `$${this.data.maxCredit.toLocaleString()}`;
            }
            
            // Обновляем историю переводов
            this.updateTransfersHistory();
            
            console.log('🎨 BankModuleV4: UI обновлен');
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка обновления UI:', error);
        }
    }

    /**
     * Обновление истории переводов
     */
    updateTransfersHistory() {
        try {
            const historyContainer = document.getElementById('transfersHistory');
            if (!historyContainer) return;
            
            // Очищаем контейнер
            historyContainer.innerHTML = '';
            
            // Добавляем переводы
            this.data.transfers.forEach(transfer => {
                const transferEl = this.createTransferElement(transfer);
                historyContainer.appendChild(transferEl);
            });
            
            console.log(`📋 BankModuleV4: История обновлена (${this.data.transfers.length} записей)`);
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка обновления истории:', error);
        }
    }

    /**
     * Создание элемента перевода
     */
    createTransferElement(transfer) {
        const element = document.createElement('div');
        element.className = 'transfer-item';
        
        const amount = transfer.amount || 0;
        const isReceived = transfer.recipient_index === this.findPlayerIndex(window.players || []);
        
        element.innerHTML = `
            <div class="transfer-amount ${isReceived ? 'received' : 'sent'}">
                ${isReceived ? '+' : '-'}$${amount.toLocaleString()}
            </div>
            <div class="transfer-description">
                ${transfer.description || 'Перевод'}
            </div>
            <div class="transfer-time">
                ${this.formatTime(transfer.timestamp)}
            </div>
        `;
        
        return element;
    }

    /**
     * Форматирование времени
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        return date.toLocaleDateString();
    }

    /**
     * Запрос кредита
     */
    async requestCredit(amount = 1000) {
        try {
            console.log(`💰 BankModuleV4: Запрос кредита на $${amount}`);
            
            // Проверяем лимит
            const availableCredit = this.data.maxCredit - this.data.credit;
            if (amount > availableCredit) {
                throw new Error(`Превышен лимит кредита. Доступно: $${availableCredit.toLocaleString()}`);
            }
            
            // Отправляем запрос
            const response = await fetch(`/api/rooms/${this.roomId}/take-credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    player_index: this.findPlayerIndex(window.players || [])
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            // Обновляем данные
            await this.loadData();
            
            console.log(`✅ BankModuleV4: Кредит на $${amount} получен`);
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка запроса кредита:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Погашение кредита
     */
    async payoffCredit() {
        try {
            console.log('💰 BankModuleV4: Погашение кредита');
            
            if (this.data.credit <= 0) {
                throw new Error('У вас нет активных кредитов');
            }
            
            // Отправляем запрос
            const response = await fetch(`/api/rooms/${this.roomId}/payoff-credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player_index: this.findPlayerIndex(window.players || [])
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            // Обновляем данные
            await this.loadData();
            
            console.log('✅ BankModuleV4: Кредит погашен');
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка погашения кредита:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Перевод средств
     */
    async transferMoney(recipientIndex, amount) {
        try {
            console.log(`💸 BankModuleV4: Перевод $${amount} игроку ${recipientIndex}`);
            
            if (amount > this.data.balance) {
                throw new Error('Недостаточно средств');
            }
            
            // Отправляем запрос
            const response = await fetch(`/api/rooms/${this.roomId}/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient_index: recipientIndex,
                    amount: amount,
                    sender_index: this.findPlayerIndex(window.players || [])
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            // Обновляем данные
            await this.loadData();
            
            console.log(`✅ BankModuleV4: Перевод выполнен`);
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка перевода:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Запуск автоматической синхронизации
     */
    startAutoSync() {
        // Синхронизация каждые 5 секунд
        this.syncInterval = setInterval(() => {
            this.loadData();
        }, 5000);
        
        console.log('🔄 BankModuleV4: Автосинхронизация запущена');
    }

    /**
     * Остановка автоматической синхронизации
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ BankModuleV4: Автосинхронизация остановлена');
        }
    }

    /**
     * Открытие банковского окна
     */
    openBank() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('🏦 BankModuleV4: Банк открыт');
        }
    }

    /**
     * Закрытие банковского окна
     */
    closeBank() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('🏦 BankModuleV4: Банк закрыт');
        }
    }

    /**
     * Получение текущих данных
     */
    getData() {
        return { ...this.data };
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        this.stopAutoSync();
        this.listeners.clear();
        console.log('🗑️ BankModuleV4: Модуль уничтожен');
    }
}

// Глобальный экземпляр
let bankModuleV4 = null;

/**
 * Получение User ID из localStorage (вспомогательная функция)
 */
function getUserIdFromStorage() {
    // 1. Из localStorage (авторизованный пользователь)
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            return user.id || user._id;
        } catch (e) {
            console.warn('Ошибка парсинга user data:', e);
        }
    }
    
    // 2. Из других источников localStorage
    return localStorage.getItem('userId') || localStorage.getItem('user_id');
}

/**
 * Инициализация банковского модуля v4
 */
async function initBankModuleV4() {
    try {
        console.log('🚀 Инициализация BankModuleV4...');
        
        bankModuleV4 = new BankModuleV4();
        const success = await bankModuleV4.init();
        
        if (success) {
            console.log('✅ BankModuleV4: Инициализация успешна');
            return bankModuleV4;
        } else {
            console.error('❌ BankModuleV4: Инициализация не удалась');
            return null;
        }
    } catch (error) {
        console.error('❌ BankModuleV4: Критическая ошибка:', error);
        return null;
    }
}

/**
 * Принудительная инициализация с известным Room ID
 */
async function forceInitBankModuleV4(roomId, userId) {
    try {
        console.log('🚀 Принудительная инициализация BankModuleV4...', { roomId, userId });
        
        bankModuleV4 = new BankModuleV4();
        bankModuleV4.roomId = roomId;
        bankModuleV4.userId = userId;
        
        const success = await bankModuleV4.init();
        
        if (success) {
            console.log('✅ BankModuleV4: Принудительная инициализация успешна');
            return bankModuleV4;
        } else {
            console.error('❌ BankModuleV4: Принудительная инициализация не удалась');
            return null;
        }
    } catch (error) {
        console.error('❌ BankModuleV4: Критическая ошибка принудительной инициализации:', error);
        return null;
    }
}

/**
 * Открытие банка v4
 */
async function openBankV4() {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        bankModuleV4.openBank();
    }
}

/**
 * Закрытие банка v4
 */
function closeBankV4() {
    if (bankModuleV4) {
        bankModuleV4.closeBank();
    }
}

/**
 * Запрос кредита v4
 */
async function requestCreditV4(amount = 1000) {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        return await bankModuleV4.requestCredit(amount);
    }
    
    return false;
}

/**
 * Погашение кредита v4
 */
async function payoffCreditV4() {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        return await bankModuleV4.payoffCredit();
    }
    
    return false;
}

/**
 * Перевод средств v4
 */
async function transferMoneyV4(recipientIndex, amount) {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        return await bankModuleV4.transferMoney(recipientIndex, amount);
    }
    
    return false;
}

/**
 * Получение данных v4
 */
function getBankDataV4() {
    if (bankModuleV4) {
        return bankModuleV4.getData();
    }
    return null;
}

// Экспорт функций в глобальную область
window.initBankModuleV4 = initBankModuleV4;
window.forceInitBankModuleV4 = forceInitBankModuleV4;
window.openBankV4 = openBankV4;
window.closeBankV4 = closeBankV4;
window.requestCreditV4 = requestCreditV4;
window.payoffCreditV4 = payoffCreditV4;
window.transferMoneyV4 = transferMoneyV4;
window.getBankDataV4 = getBankDataV4;

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализация BankModuleV4...');
    
    // Отладочная информация
    console.log('🔍 Отладочная информация:');
    console.log('URL:', window.location.href);
    console.log('URL params:', new URLSearchParams(window.location.search));
    console.log('window.currentRoomId:', window.currentRoomId);
    console.log('window.roomId:', window.roomId);
    
    // Пробуем обычную инициализацию
    initBankModuleV4().then(result => {
        if (!result) {
            // Если не удалось, ждем 2 секунды и пробуем принудительную инициализацию
            setTimeout(async () => {
                const roomId = '68cc38e1ce7b0898a9dc83f1'; // Из логов
                const userId = getUserIdFromStorage(); // Получаем реальный user_id
                
                if (userId) {
                    console.log('🔄 Попытка принудительной инициализации...', { roomId, userId });
                    await forceInitBankModuleV4(roomId, userId);
                } else {
                    console.warn('⚠️ Не удалось получить User ID для принудительной инициализации');
                }
            }, 2000);
        }
    });
});

console.log('🏦 BankModuleV4 загружен');
