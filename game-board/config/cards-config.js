// Game Board v2.0 - Cards Configuration
// Конфигурация карт рынка и расходов

// Карты рынка (24 карты) - Market Deck
const MARKET_CARDS = [
    {
        id: 'market_001',
        name: 'Старое жилье под снос',
        description: 'Комната в пригороде: оффер $25,000',
        type: 'market',
        action: 'offer',
        target: 'real_estate',
        offerPrice: 25000,
        profit: 22000,
        icon: '🏠',
        color: '#10b981'
    },
    {
        id: 'market_002',
        name: 'Покупатель квартиры-студии',
        description: 'Оффер $7,000',
        type: 'market',
        action: 'offer',
        target: 'apartment_studio',
        offerPrice: 7000,
        profit: 5000,
        icon: '🏢',
        color: '#10b981'
    },
    {
        id: 'market_003',
        name: 'Покупатель земли',
        description: 'Оффер $100,000',
        type: 'market',
        action: 'offer',
        target: 'land',
        offerPrice: 100000,
        profit: 50000,
        icon: '🌍',
        color: '#10b981'
    },
    {
        id: 'market_004',
        name: 'Покупатель дома',
        description: 'Оффер $200,000',
        type: 'market',
        action: 'offer',
        target: 'house',
        offerPrice: 200000,
        profit: 50000,
        icon: '🏡',
        color: '#10b981'
    },
    {
        id: 'market_005',
        name: 'Покупатель квартиры',
        description: 'Оффер $120,000',
        type: 'market',
        action: 'offer',
        target: 'apartment',
        offerPrice: 120000,
        profit: 40000,
        icon: '🏘️',
        color: '#10b981'
    },
    {
        id: 'market_006',
        name: 'Сеть выкупает салоны',
        description: 'Салон красоты $100,000 (убыток $400,000)',
        type: 'market',
        action: 'offer',
        target: 'beauty_salon',
        offerPrice: 100000,
        loss: 400000,
        icon: '💇',
        color: '#ef4444'
    },
    {
        id: 'market_007',
        name: 'Покупатель кофейни',
        description: 'Оффер $25,000 (убыток $75,000)',
        type: 'market',
        action: 'offer',
        target: 'coffee_shop',
        offerPrice: 25000,
        loss: 75000,
        icon: '☕',
        color: '#ef4444'
    },
    {
        id: 'market_008',
        name: 'Партнерство в любом бизнесе',
        description: 'Дополнительные инвестиции +$50,000',
        type: 'market',
        action: 'partnership',
        target: 'any_business',
        bonusAmount: 50000,
        icon: '🤝',
        color: '#3b82f6'
    },
    {
        id: 'market_009',
        name: 'Покупатель спа-центра',
        description: 'Оффер $150,000 (убыток $120,000)',
        type: 'market',
        action: 'offer',
        target: 'spa_center',
        offerPrice: 150000,
        loss: 120000,
        icon: '🧖',
        color: '#ef4444'
    },
    {
        id: 'market_010',
        name: 'Покупатель мобильного приложения',
        description: 'Оффер $200,000 (убыток $220,000)',
        type: 'market',
        action: 'offer',
        target: 'mobile_app',
        offerPrice: 200000,
        loss: 220000,
        icon: '📱',
        color: '#ef4444'
    },
    {
        id: 'market_011',
        name: 'Покупатель агентства маркетинга',
        description: 'Оффер $80,000 (убыток $80,000)',
        type: 'market',
        action: 'offer',
        target: 'marketing_agency',
        offerPrice: 80000,
        loss: 80000,
        icon: '📊',
        color: '#ef4444'
    },
    {
        id: 'market_012',
        name: 'Покупатель автомоек',
        description: 'Оффер $80,000 (убыток $40,000)',
        type: 'market',
        action: 'offer',
        target: 'car_wash',
        offerPrice: 80000,
        loss: 40000,
        icon: '🚗',
        color: '#ef4444'
    },
    {
        id: 'market_013',
        name: 'Покупатель франшизы ресторана',
        description: 'Оффер $180,000 (убыток $140,000)',
        type: 'market',
        action: 'offer',
        target: 'restaurant_franchise',
        offerPrice: 180000,
        loss: 140000,
        icon: '🍽️',
        color: '#ef4444'
    },
    {
        id: 'market_014',
        name: 'Покупатель йога-центра',
        description: 'Оффер $100,000 (убыток $70,000)',
        type: 'market',
        action: 'offer',
        target: 'yoga_center',
        offerPrice: 100000,
        loss: 70000,
        icon: '🧘',
        color: '#ef4444'
    },
    {
        id: 'market_015',
        name: 'Покупатель мини-отеля',
        description: 'Оффер $300,000 (прибыль $100,000)',
        type: 'market',
        action: 'offer',
        target: 'mini_hotel',
        offerPrice: 300000,
        profit: 100000,
        icon: '🏨',
        color: '#10b981'
    },
    {
        id: 'market_016',
        name: 'Покупатель эко-ранчо',
        description: 'Оффер $800,000 (убыток $200,000)',
        type: 'market',
        action: 'offer',
        target: 'eco_ranch',
        offerPrice: 800000,
        loss: 200000,
        icon: '🌿',
        color: '#ef4444'
    },
    {
        id: 'market_017',
        name: 'Покупатель школы языков',
        description: 'Оффер $50,000 (прибыль $30,000)',
        type: 'market',
        action: 'offer',
        target: 'language_school',
        offerPrice: 50000,
        profit: 30000,
        icon: '🌍',
        color: '#10b981'
    },
    {
        id: 'market_018',
        name: 'Покупатель киностудии',
        description: 'Оффер $300,000 (убыток $200,000)',
        type: 'market',
        action: 'offer',
        target: 'film_studio',
        offerPrice: 300000,
        loss: 200000,
        icon: '🎬',
        color: '#ef4444'
    },
    {
        id: 'market_019',
        name: 'Покупатель пекарни',
        description: 'Оффер $200,000 (убыток $100,000)',
        type: 'market',
        action: 'offer',
        target: 'bakery',
        offerPrice: 200000,
        loss: 100000,
        icon: '🥖',
        color: '#ef4444'
    },
    {
        id: 'market_020',
        name: 'Покупатель сети фитнес-студий',
        description: 'Оффер $400,000 (убыток $350,000)',
        type: 'market',
        action: 'offer',
        target: 'fitness_network',
        offerPrice: 400000,
        loss: 350000,
        icon: '💪',
        color: '#ef4444'
    },
    {
        id: 'market_021',
        name: 'Покупатель коворкинга',
        description: 'Оффер $300,000 (убыток $200,000)',
        type: 'market',
        action: 'offer',
        target: 'coworking',
        offerPrice: 300000,
        loss: 200000,
        icon: '🏢',
        color: '#ef4444'
    },
    {
        id: 'market_022',
        name: 'Очередной скам биржи',
        description: 'Все теряют BTC (для всех игроков)',
        type: 'market',
        action: 'crypto_crash',
        target: 'all_players',
        effect: 'lose_btc',
        icon: '📉',
        color: '#ef4444'
    },
    {
        id: 'market_023',
        name: 'Покупатель акций',
        description: 'Оффер $40,000 (прибыль $15,000)',
        type: 'market',
        action: 'offer',
        target: 'stocks',
        offerPrice: 40000,
        profit: 15000,
        icon: '📈',
        color: '#10b981'
    },
    {
        id: 'market_024',
        name: 'Биржевой крах',
        description: 'Все акции -50% (для всех игроков)',
        type: 'market',
        action: 'stock_crash',
        target: 'all_players',
        effect: 'stocks_minus_50',
        icon: '💥',
        color: '#ef4444'
    }
];

// Карты расходов (24 карты) - Expense Deck
const EXPENSE_CARDS = [
    {
        id: 'expense_001',
        name: 'Новый смартфон',
        description: 'Обязательная покупка',
        type: 'expense',
        amount: 800,
        category: 'electronics',
        icon: '📱',
        color: '#f59e0b'
    },
    {
        id: 'expense_002',
        name: 'Ноутбук',
        description: 'Обязательная покупка',
        type: 'expense',
        amount: 1200,
        category: 'electronics',
        icon: '💻',
        color: '#f59e0b'
    },
    {
        id: 'expense_003',
        name: 'Планшет',
        description: 'Обязательная покупка',
        type: 'expense',
        amount: 500,
        category: 'electronics',
        icon: '📱',
        color: '#f59e0b'
    },
    {
        id: 'expense_004',
        name: 'Игровая приставка',
        description: 'Обязательная покупка',
        type: 'expense',
        amount: 400,
        category: 'electronics',
        icon: '🎮',
        color: '#f59e0b'
    },
    {
        id: 'expense_005',
        name: 'Наушники',
        description: 'Обязательная покупка',
        type: 'expense',
        amount: 150,
        category: 'electronics',
        icon: '🎧',
        color: '#f59e0b'
    },
    {
        id: 'expense_006',
        name: 'Ремонт автомобиля',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 800,
        category: 'transport',
        icon: '🔧',
        color: '#f59e0b'
    },
    {
        id: 'expense_007',
        name: 'Шиномонтаж',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 300,
        category: 'transport',
        icon: '🚗',
        color: '#f59e0b'
    },
    {
        id: 'expense_008',
        name: 'Такси',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 80,
        category: 'transport',
        icon: '🚕',
        color: '#f59e0b'
    },
    {
        id: 'expense_009',
        name: 'Заправка',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 60,
        category: 'transport',
        icon: '⛽',
        color: '#f59e0b'
    },
    {
        id: 'expense_010',
        name: 'Билет на самолет',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 400,
        category: 'travel',
        icon: '✈️',
        color: '#f59e0b'
    },
    {
        id: 'expense_011',
        name: 'Отель',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 200,
        category: 'travel',
        icon: '🏨',
        color: '#f59e0b'
    },
    {
        id: 'expense_012',
        name: 'Экскурсия',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 100,
        category: 'travel',
        icon: '🗺️',
        color: '#f59e0b'
    },
    {
        id: 'expense_013',
        name: 'Ресторан',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 120,
        category: 'food',
        icon: '🍽️',
        color: '#f59e0b'
    },
    {
        id: 'expense_014',
        name: 'Пицца',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 50,
        category: 'food',
        icon: '🍕',
        color: '#f59e0b'
    },
    {
        id: 'expense_015',
        name: 'Кофе',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 8,
        category: 'food',
        icon: '☕',
        color: '#f59e0b'
    },
    {
        id: 'expense_016',
        name: 'Продукты',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 150,
        category: 'food',
        icon: '🛒',
        color: '#f59e0b'
    },
    {
        id: 'expense_017',
        name: 'Визит к врачу',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 100,
        category: 'health',
        icon: '👨‍⚕️',
        color: '#f59e0b'
    },
    {
        id: 'expense_018',
        name: 'Спа-процедуры',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 200,
        category: 'health',
        icon: '🧖',
        color: '#f59e0b'
    },
    {
        id: 'expense_019',
        name: 'Аптека',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 80,
        category: 'health',
        icon: '💊',
        color: '#f59e0b'
    },
    {
        id: 'expense_020',
        name: 'Фитнес-клуб',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 100,
        category: 'health',
        icon: '💪',
        color: '#f59e0b'
    },
    {
        id: 'expense_021',
        name: 'Кино',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 25,
        category: 'entertainment',
        icon: '🎬',
        color: '#f59e0b'
    },
    {
        id: 'expense_022',
        name: 'Бар',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 60,
        category: 'entertainment',
        icon: '🍺',
        color: '#f59e0b'
    },
    {
        id: 'expense_023',
        name: 'Цветы',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 40,
        category: 'entertainment',
        icon: '🌹',
        color: '#f59e0b'
    },
    {
        id: 'expense_024',
        name: 'Печать документов',
        description: 'Обязательная трата',
        type: 'expense',
        amount: 15,
        category: 'services',
        icon: '🖨️',
        color: '#f59e0b'
    }
];

// Малые сделки (Small Deals) - примерно 40 карт
const SMALL_DEALS = [
    {
        id: 'small_001',
        name: 'Акции Apple',
        description: 'Покупка акций технологической компании',
        type: 'small_deal',
        cost: 5000,
        income: 500,
        category: 'stocks',
        icon: '📈',
        color: '#10b981'
    },
    {
        id: 'small_002',
        name: 'Квартира-студия',
        description: 'Покупка недвижимости для сдачи в аренду',
        type: 'small_deal',
        cost: 80000,
        income: 800,
        category: 'real_estate',
        icon: '🏠',
        color: '#10b981'
    },
    {
        id: 'small_003',
        name: 'Биткоин',
        description: 'Инвестиции в криптовалюту',
        type: 'small_deal',
        cost: 3000,
        income: 300,
        category: 'crypto',
        icon: '₿',
        color: '#10b981'
    },
    {
        id: 'small_004',
        name: 'Золото',
        description: 'Покупка драгоценного металла',
        type: 'small_deal',
        cost: 2000,
        income: 200,
        category: 'precious_metals',
        icon: '🥇',
        color: '#10b981'
    },
    {
        id: 'small_005',
        name: 'Облигации',
        description: 'Государственные облигации',
        type: 'small_deal',
        cost: 1000,
        income: 100,
        category: 'bonds',
        icon: '📋',
        color: '#10b981'
    },
    {
        id: 'small_006',
        name: 'Фондовая биржа',
        description: 'Инвестиции в фондовый рынок',
        type: 'small_deal',
        cost: 10000,
        income: 1000,
        category: 'stocks',
        icon: '📊',
        color: '#10b981'
    },
    {
        id: 'small_007',
        name: 'Нефть',
        description: 'Инвестиции в нефтяные фьючерсы',
        type: 'small_deal',
        cost: 15000,
        income: 1500,
        category: 'commodities',
        icon: '🛢️',
        color: '#10b981'
    },
    {
        id: 'small_008',
        name: 'Серебро',
        description: 'Покупка драгоценного металла',
        type: 'small_deal',
        cost: 1200,
        income: 120,
        category: 'precious_metals',
        icon: '🥈',
        color: '#10b981'
    },
    {
        id: 'small_009',
        name: 'Евро',
        description: 'Валютные инвестиции',
        type: 'small_deal',
        cost: 5000,
        income: 500,
        category: 'forex',
        icon: '💶',
        color: '#10b981'
    },
    {
        id: 'small_010',
        name: 'Йена',
        description: 'Валютные инвестиции',
        type: 'small_deal',
        cost: 8000,
        income: 800,
        category: 'forex',
        icon: '💴',
        color: '#10b981'
    }
];

// Большие сделки (Big Deals) - примерно 40 карт
const BIG_DEALS = [
    {
        id: 'big_001',
        name: 'Многоквартирный дом',
        description: 'Покупка жилого комплекса',
        type: 'big_deal',
        cost: 500000,
        income: 5000,
        category: 'real_estate',
        icon: '🏢',
        color: '#3b82f6'
    },
    {
        id: 'big_002',
        name: 'Торговый центр',
        description: 'Покупка коммерческой недвижимости',
        type: 'big_deal',
        cost: 2000000,
        income: 20000,
        category: 'real_estate',
        icon: '🏬',
        color: '#3b82f6'
    },
    {
        id: 'big_003',
        name: 'Офисное здание',
        description: 'Покупка бизнес-центра',
        type: 'big_deal',
        cost: 1500000,
        income: 15000,
        category: 'real_estate',
        icon: '🏢',
        color: '#3b82f6'
    },
    {
        id: 'big_004',
        name: 'Складской комплекс',
        description: 'Покупка логистического центра',
        type: 'big_deal',
        cost: 800000,
        income: 8000,
        category: 'real_estate',
        icon: '🏭',
        color: '#3b82f6'
    },
    {
        id: 'big_005',
        name: 'Гостиничная сеть',
        description: 'Покупка сети отелей',
        type: 'big_deal',
        cost: 3000000,
        income: 30000,
        category: 'business',
        icon: '🏨',
        color: '#3b82f6'
    },
    {
        id: 'big_006',
        name: 'Ресторанная сеть',
        description: 'Покупка франшизы ресторанов',
        type: 'big_deal',
        cost: 1200000,
        income: 12000,
        category: 'business',
        icon: '🍽️',
        color: '#3b82f6'
    },
    {
        id: 'big_007',
        name: 'Автомобильная дилерская сеть',
        description: 'Покупка сети автосалонов',
        type: 'big_deal',
        cost: 2500000,
        income: 25000,
        category: 'business',
        icon: '🚗',
        color: '#3b82f6'
    },
    {
        id: 'big_008',
        name: 'Технологический стартап',
        description: 'Инвестиции в IT-компанию',
        type: 'big_deal',
        cost: 1000000,
        income: 10000,
        category: 'technology',
        icon: '💻',
        color: '#3b82f6'
    },
    {
        id: 'big_009',
        name: 'Фармацевтическая компания',
        description: 'Покупка фармацевтического бизнеса',
        type: 'big_deal',
        cost: 5000000,
        income: 50000,
        category: 'pharmaceuticals',
        icon: '💊',
        color: '#3b82f6'
    },
    {
        id: 'big_010',
        name: 'Энергетическая компания',
        description: 'Покупка энергетического бизнеса',
        type: 'big_deal',
        cost: 4000000,
        income: 40000,
        category: 'energy',
        icon: '⚡',
        color: '#3b82f6'
    }
];

// Утилиты для работы с картами
const CardsUtils = {
    // Получить все карты определенного типа
    getCardsByType: (type) => {
        const allCards = [...MARKET_CARDS, ...EXPENSE_CARDS, ...SMALL_DEALS, ...BIG_DEALS];
        return allCards.filter(card => card.type === type);
    },

    // Получить карты рынка
    getMarketCards: () => MARKET_CARDS,

    // Получить карты расходов
    getExpenseCards: () => EXPENSE_CARDS,

    // Получить малые сделки
    getSmallDeals: () => SMALL_DEALS,

    // Получить большие сделки
    getBigDeals: () => BIG_DEALS,

    // Получить карту по ID
    getCardById: (id) => {
        const allCards = [...MARKET_CARDS, ...EXPENSE_CARDS, ...SMALL_DEALS, ...BIG_DEALS];
        return allCards.find(card => card.id === id);
    },

    // Получить случайную карту определенного типа
    getRandomCardByType: (type) => {
        const cards = CardsUtils.getCardsByType(type);
        return cards[Math.floor(Math.random() * cards.length)];
    },

    // Получить статистику по картам
    getCardsStatistics: () => {
        return {
            market: MARKET_CARDS.length,
            expense: EXPENSE_CARDS.length,
            smallDeals: SMALL_DEALS.length,
            bigDeals: BIG_DEALS.length,
            total: MARKET_CARDS.length + EXPENSE_CARDS.length + SMALL_DEALS.length + BIG_DEALS.length
        };
    }
};

module.exports = {
    MARKET_CARDS,
    EXPENSE_CARDS,
    SMALL_DEALS,
    BIG_DEALS,
    CardsUtils
};
