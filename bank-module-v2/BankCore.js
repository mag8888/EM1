/**
 * Банковский модуль - Ядро системы
 * Управляет основными банковскими операциями и состоянием
 */

class BankCore {
    constructor() {
        console.log('🏦 BankCore: Инициализация ядра банковской системы');
        
        // Основное состояние банка
        this.state = {
            currentBalance: 0,
            totalIncome: 0,
            totalExpenses: 0,
            monthlyIncome: 0,
            currentCredit: 0,
            maxCredit: 0,
            transfersHistory: [],
            isLoading: false,
            hasLocalChanges: false,
            lastUpdateTime: 0
        };
        
        // Конфигурация
        this.config = {
            minTransferAmount: 1,
            maxTransferAmount: 1000000,
            updateInterval: 30000,
            animationDuration: 1000,
            debounceDelay: 300
        };
        
        // Данные комнаты
        this.roomData = null;
        this.currentPlayerIndex = 0;
        
        // Слушатели событий
        this.eventListeners = new Map();
        
        console.log('✅ BankCore: Ядро инициализировано');
    }
    
    /**
     * Получить текущее состояние
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Обновить состояние
     */
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.emit('stateChanged', { oldState, newState: this.state });
    }
    
    /**
     * Подписаться на события
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * Отписаться от событий
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Эмитировать событие
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Установить данные комнаты
     */
    setRoomData(roomData) {
        this.roomData = roomData;
        this.emit('roomDataChanged', roomData);
    }
    
    /**
     * Установить индекс текущего игрока
     */
    setCurrentPlayerIndex(playerIndex) {
        this.currentPlayerIndex = playerIndex;
        this.emit('playerIndexChanged', playerIndex);
    }
    
    /**
     * Обновить баланс
     */
    updateBalance(newBalance, source = 'unknown') {
        const oldBalance = this.state.currentBalance;
        this.setState({ currentBalance: newBalance });
        this.emit('balanceChanged', { 
            oldBalance, 
            newBalance, 
            difference: newBalance - oldBalance,
            source 
        });
    }
    
    /**
     * Добавить перевод в историю
     */
    addTransferToHistory(transfer) {
        const newHistory = [transfer, ...this.state.transfersHistory];
        this.setState({ transfersHistory: newHistory });
        this.emit('transferAdded', transfer);
    }
    
    /**
     * Установить флаг локальных изменений
     */
    setLocalChanges(hasChanges) {
        this.setState({ hasLocalChanges: hasChanges });
        this.emit('localChangesChanged', hasChanges);
    }
    
    /**
     * Установить состояние загрузки
     */
    setLoading(isLoading) {
        this.setState({ isLoading });
        this.emit('loadingChanged', isLoading);
    }
    
    /**
     * Сбросить состояние
     */
    reset() {
        this.setState({
            currentBalance: 0,
            totalIncome: 0,
            totalExpenses: 0,
            monthlyIncome: 0,
            currentCredit: 0,
            maxCredit: 0,
            transfersHistory: [],
            isLoading: false,
            hasLocalChanges: false,
            lastUpdateTime: 0
        });
        this.emit('stateReset');
    }
}

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.BankCore = BankCore;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankCore;
}
