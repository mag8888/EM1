/**
 * Конфигурация игры "Энергия денег"
 */
window.GAME_CONFIG = {
    // Основные настройки игры
    game: {
        name: 'Энергия денег',
        version: '2.0.0',
        maxPlayers: 8,
        minPlayers: 2,
        startingBalance: 10000,
        turnTime: 30, // секунд
        boardSize: 44,
        diceSides: 6
    },

    // Настройки доски
    board: {
        outerTrack: {
            start: 1,
            end: 28,
            cells: 28
        },
        innerTrack: {
            start: 29,
            end: 44,
            cells: 16
        },
        center: {
            position: 0,
            name: 'Центр'
        }
    },

    // Ячейки мечт
    dreams: [
        { id: 2, name: 'Дом мечты', description: 'Построить дом мечты для семьи', cost: 100000, icon: '🏠' },
        { id: 6, name: 'Антарктида', description: 'Посетить Антарктиду', cost: 150000, icon: '🧊' },
        { id: 14, name: 'Высочайшие вершины', description: 'Подняться на все высочайшие вершины мира', cost: 500000, icon: '🏔️' },
        { id: 16, name: 'Книга-бестселлер', description: 'Стать автором книги-бестселлера', cost: 300000, icon: '📚' },
        { id: 20, name: 'Яхта в Средиземном море', description: 'Жить год на яхте в Средиземном море', cost: 300000, icon: '⛵' },
        { id: 22, name: 'Мировой фестиваль', description: 'Организовать мировой фестиваль', cost: 200000, icon: '🎪' },
        { id: 26, name: 'Ретрит-центр', description: 'Построить ретрит-центр', cost: 500000, icon: '🕯️' },
        { id: 27, name: 'Фонд поддержки талантов', description: 'Создать фонд поддержки талантов', cost: 300000, icon: '🎭' },
        { id: 28, name: 'Кругосветное плавание', description: 'Кругосветное плавание на паруснике', cost: 200000, icon: '⛵' },
        { id: 30, name: 'Кругосветное плавание 2', description: 'Кругосветное плавание на паруснике', cost: 300000, icon: '⛵' },
        { id: 32, name: 'Частный самолёт', description: 'Купить частный самолёт', cost: 1000000, icon: '✈️' },
        { id: 36, name: 'Коллекция суперкаров', description: 'Купить коллекцию суперкаров', cost: 1000000, icon: '🏎️' },
        { id: 38, name: 'Полнометражный фильм', description: 'Снять полнометражный фильм', cost: 500000, icon: '🎬' },
        { id: 40, name: 'Мировой лидер мнений', description: 'Стать мировым лидером мнений', cost: 1000000, icon: '👑' },
        { id: 42, name: 'Белоснежная яхта', description: 'Белоснежная Яхта', cost: 300000, icon: '⛵' },
        { id: 44, name: 'Полёт в космос', description: 'Полёт в космос', cost: 250000, icon: '🚀' }
    ],

    // Токены игроков
    tokens: [
        { id: 'lion', icon: '🦁', name: 'Лев', color: '#ff6b6b' },
        { id: 'tiger', icon: '🐯', name: 'Тигр', color: '#ffb347' },
        { id: 'fox', icon: '🦊', name: 'Лиса', color: '#ff8c42' },
        { id: 'panda', icon: '🐼', name: 'Панда', color: '#32df8d' },
        { id: 'frog', icon: '🐸', name: 'Лягушка', color: '#25d0ff' },
        { id: 'owl', icon: '🦉', name: 'Сова', color: '#a769ff' },
        { id: 'octopus', icon: '🐙', name: 'Осьминог', color: '#ff4f93' },
        { id: 'whale', icon: '🐳', name: 'Кит', color: '#4e95ff' }
    ],

    // Карты сделок
    deals: {
        small: {
            name: 'Малые сделки',
            description: 'Быстрые инвестиции с небольшим риском',
            color: '#32df8d'
        },
        big: {
            name: 'Большие сделки',
            description: 'Крупные инвестиции с высоким потенциалом',
            color: '#ff6b6b'
        }
    },

    // Карты расходов
    expenses: {
        name: 'Расходы',
        description: 'Неожиданные траты и обязательства',
        color: '#ffb347'
    },

    // Настройки UI
    ui: {
        theme: 'dark',
        animations: true,
        sound: true,
        language: 'ru'
    },

    // Настройки API
    api: {
        baseUrl: window.location.origin,
        timeout: 10000,
        retryAttempts: 3
    }
};