/**
 * КОНФИГУРАЦИЯ БАНКОВСКОГО МОДУЛЯ
 * Централизованное хранение всех настроек и констант
 */

export class BankConfig {
    constructor() {
        this.defaults = {
            // Финансовые настройки
            defaultIncome: 10000,
            defaultExpenses: 6200,
            defaultCashFlow: 3800,
            defaultCredit: 0,
            maxCredit: 10000,
            
            // Настройки переводов
            minTransferAmount: 1,
            maxTransferAmount: 1000000,
            
            // Настройки обновления
            updateInterval: 30000, // 30 секунд
            animationDuration: 1000,
            
            // Настройки кредитов
            creditMultiplier: 1000, // Кратность кредитов
            creditRate: 100, // Ставка кредита (100$ за 1000$ кредита)
            
            // Настройки UI
            balanceAnimationDuration: 500,
            notificationDuration: 3000,
            
            // Селекторы DOM элементов
            selectors: {
                currentBalance: '#currentBalance',
                bankPreviewBalance: '.bank-preview .balance-amount',
                totalIncome: '#totalIncome',
                totalExpenses: '#totalExpenses',
                monthlyIncome: '#monthlyIncome',
                currentCredit: '#currentCredit',
                maxCredit: '#maxCredit',
                transfersHistory: '#transfersHistory',
                historyCount: '#historyCount',
                recipientSelect: '#recipientSelect',
                transferAmount: '#transferAmount',
                creditModal: '#creditModal',
                creditAmount: '#creditAmount'
            }
        };
    }

    /**
     * Получить значение конфигурации
     * @param {string} key - Ключ конфигурации
     * @param {*} defaultValue - Значение по умолчанию
     * @returns {*} Значение конфигурации
     */
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.defaults;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * Установить значение конфигурации
     * @param {string} key - Ключ конфигурации
     * @param {*} value - Новое значение
     */
    set(key, value) {
        const keys = key.split('.');
        let current = this.defaults;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Получить все настройки
     * @returns {Object} Объект с настройками
     */
    getAll() {
        return { ...this.defaults };
    }
}
