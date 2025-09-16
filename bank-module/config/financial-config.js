/**
 * Конфигурация финансовых данных
 * Централизованное управление всеми финансовыми параметрами
 */

class FinancialConfig {
    constructor() {
        this.config = {
            // Стартовые значения
            startingBalance: 3000,
            
            // Профессиональные данные по умолчанию
            defaultProfession: {
                salary: 10000,        // Общий доход
                expenses: 6200,       // Общие расходы
                cashFlow: 3800,       // Ежемесячный доход
                credit: 0             // Текущий кредит
            },
            
            // Профессии и их финансовые параметры
            professions: {
                'Врач': {
                    salary: 12000,
                    expenses: 7000,
                    cashFlow: 5000
                },
                'Инженер': {
                    salary: 10000,
                    expenses: 6200,
                    cashFlow: 3800
                },
                'Учитель': {
                    salary: 8000,
                    expenses: 5000,
                    cashFlow: 3000
                },
                'Предприниматель': {
                    salary: 15000,
                    expenses: 8000,
                    cashFlow: 7000
                },
                'Программист': {
                    salary: 11000,
                    expenses: 6500,
                    cashFlow: 4500
                }
            },
            
            // Настройки переводов
            transfer: {
                minAmount: 1,
                maxAmount: 1000000,
                fee: 0 // Комиссия за перевод (в процентах)
            },
            
            // Настройки кредитов
            credit: {
                maxAmount: 50000,
                interestRate: 0.15, // 15% годовых
                minPayment: 100
            }
        };
    }
    
    /**
     * Получить стартовый баланс
     */
    getStartingBalance() {
        return this.config.startingBalance;
    }
    
    /**
     * Получить данные профессии по умолчанию
     */
    getDefaultProfession() {
        return { ...this.config.defaultProfession };
    }
    
    /**
     * Получить данные конкретной профессии
     */
    getProfessionData(professionName) {
        return this.config.professions[professionName] || this.getDefaultProfession();
    }
    
    /**
     * Получить настройки переводов
     */
    getTransferConfig() {
        return { ...this.config.transfer };
    }
    
    /**
     * Получить настройки кредитов
     */
    getCreditConfig() {
        return { ...this.config.credit };
    }
    
    /**
     * Обновить конфигурацию
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Получить всю конфигурацию
     */
    getAllConfig() {
        return { ...this.config };
    }
}

// Экспортируем как глобальный объект для совместимости
window.FinancialConfig = FinancialConfig;
console.log('✅ FinancialConfig загружен и доступен глобально');
