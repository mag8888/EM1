/**
 * Конфигурация игры "Энергия денег"
 */

export const GAME_CONFIG = {
    // Основные настройки игры
    gameName: "Энергия денег",
    version: "2.0.0",
    
    // Настройки игроков
    players: {
        minPlayers: 2,
        maxPlayers: 6,
        startingBalance: 10000,
        startingPosition: 0
    },
    
    // Настройки доски
    board: {
        innerTrackCells: 24,
        outerTrackCells: 12,
        charityPosition: 23, // Позиция благотворительности
        paydayPosition: 0    // Позиция PAYDAY
    },
    
    // Настройки карт
    cards: {
        opportunity: {
            deckSize: 100,
            shuffleFrequency: 50
        },
        expense: {
            deckSize: 50,
            shuffleFrequency: 25
        },
        charity: {
            deckSize: 20,
            shuffleFrequency: 10
        }
    },
    
    // Настройки кубиков
    dice: {
        minValue: 1,
        maxValue: 6,
        doubleRollBonus: true
    },
    
    // Настройки банка
    bank: {
        interestRate: 0.10, // 10% в месяц
        creditMultiplier: 10, // PAYDAY * 10
        minCreditAmount: 1000,
        minPaymentAmount: 1000,
        bankruptcyThreshold: 0
    },
    
    // Настройки UI
    ui: {
        animationDuration: 300,
        notificationDuration: 3000,
        autoSaveInterval: 30000 // 30 секунд
    },
    
    // Настройки API
    api: {
        baseUrl: window.location.origin,
        timeout: 10000,
        retryAttempts: 3
    }
};

export default GAME_CONFIG;
