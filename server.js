// EM1 Game Board v2.0 - Main Server with Updated Game Logic
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const CreditService = require('./credit-module/CreditService');
const { GAME_CELLS, GameCellsUtils } = require('./game-board/config/game-cells.js');
// Карты объявляются локально ниже
const userManager = require('./game-board/utils/userManager');
const LegacyUser = require('./models/LegacyUser');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Shared services -----------------------------------------------------
const creditService = new CreditService();
const rooms = new Map(); // actual game rooms
const creditRooms = new Map(); // legacy credit rooms

const JWT_SECRET = process.env.JWT_SECRET || 'em1-dev-secret';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/energy_money_game';
const TOKEN_LIFETIME = {
    regular: '24h',
    remember: '30d'
};
let mongoConnected = false;

// --- Helpers -------------------------------------------------------------
const resolvePath = (relativePath) => path.join(__dirname, relativePath);

const registerPage = (route, file) => {
    app.get(route, (req, res) => {
        res.sendFile(resolvePath(file));
    });
};

const generateId = (prefix = 'id') => {
    if (crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const sanitizeUser = (user) => {
    if (!user) {
        return null;
    }
    const plain = typeof user.toObject === 'function' ? user.toObject() : user;
    return {
        id: plain._id ? plain._id.toString() : plain.id,
        telegram_id: plain.telegram_id || null,
        username: plain.username || '',
        first_name: plain.first_name || '',
        last_name: plain.last_name || '',
        email: plain.email || '',
        balance: plain.balance ?? 0,
        level: plain.level ?? 1,
        experience: plain.experience ?? 0,
        games_played: plain.games_played ?? 0,
        wins_count: plain.wins_count ?? 0,
        referrals_count: plain.referrals_count ?? 0,
        referral_code: plain.referral_code || null,
        referral_earnings: plain.referral_earnings ?? 0,
        is_active: plain.is_active !== false,
        created_at: plain.created_at || plain.createdAt || null,
        updated_at: plain.updated_at || plain.updatedAt || null
    };
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Токен доступа не найден' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (error) {
        console.error('JWT verification failed:', error.message);
        return res.status(403).json({ message: 'Недействительный или истекший токен' });
    }
};

const connectToMongo = async () => {
    if (mongoConnected || mongoose.connection.readyState === 1) {
        mongoConnected = true;
        return;
    }

    if (!MONGODB_URI) {
        console.warn('MONGODB_URI is not set; auth endpoints will be unavailable');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000
        });
        mongoConnected = true;
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        mongoConnected = false;
        console.error('❌ MongoDB connection error:', error.message);
    }
};

mongoose.connection.on('connected', () => {
    mongoConnected = true;
});

mongoose.connection.on('disconnected', () => {
    mongoConnected = false;
});

const DREAMS = (() => {
    const unique = new Map();
    try {
        const dreams = GameCellsUtils.getDreams();
        dreams.forEach((dream, index) => {
            if (!unique.has(dream.id)) {
                unique.set(dream.id, {
                    id: dream.id ?? index + 1,
                    name: dream.name || 'Мечта',
                    description: dream.description || '',
                    cost: dream.cost || 0,
                    icon: dream.icon || '🌟'
                });
            }
        });
    } catch (error) {
        console.warn('Не удалось загрузить список мечт из GAME_CELLS:', error);
    }
    if (unique.size === 0) {
        [
            { id: 1, name: 'Дом мечты', cost: 100000, icon: '🏠' },
            { id: 2, name: 'Путешествие мечты', cost: 150000, icon: '✈️' },
            { id: 3, name: 'Белоснежная яхта', cost: 300000, icon: '⛵' },
            { id: 4, name: 'Полет в космос', cost: 250000, icon: '🚀' }
        ].forEach(dream => unique.set(dream.id, dream));
    }
    return Array.from(unique.values());
})();

const TOKENS = [
    { id: 'lion', icon: '🦁', name: 'Лев' },
    { id: 'tiger', icon: '🐯', name: 'Тигр' },
    { id: 'fox', icon: '🦊', name: 'Лиса' },
    { id: 'panda', icon: '🐼', name: 'Панда' },
    { id: 'frog', icon: '🐸', name: 'Лягушка' },
    { id: 'owl', icon: '🦉', name: 'Сова' },
    { id: 'octopus', icon: '🐙', name: 'Осьминог' },
    { id: 'whale', icon: '🐳', name: 'Кит' }
];

const MARKET_CARDS = [
    { id: 'mkt_001', name: 'Акции Apple', price: 5000, income: 500, type: 'stock' },
    { id: 'mkt_002', name: 'Недвижимость', price: 15000, income: 1500, type: 'real_estate' },
    { id: 'mkt_003', name: 'Бизнес-проект', price: 25000, income: 3000, type: 'business' },
    { id: 'mkt_004', name: 'Золото', price: 3000, income: 300, type: 'commodity' }
];

const SMALL_DEALS = [
    { id: 'small_001', name: 'Акции компании', amount: 5000, income: 500, type: 'stock' },
    { id: 'small_002', name: 'Облигации', amount: 3000, income: 250, type: 'bond' },
    { id: 'small_003', name: 'Франшиза кофе-точки', amount: 8000, income: 900, type: 'business' },
    { id: 'small_004', name: 'Мини-склад', amount: 7500, income: 850, type: 'real_estate' }
];

const BIG_DEALS = [
    { id: 'big_001', name: 'Жилой комплекс', amount: 45000, income: 5200, type: 'real_estate' },
    { id: 'big_002', name: 'Частная клиника', amount: 60000, income: 6500, type: 'business' },
    { id: 'big_003', name: 'IT-стартап', amount: 80000, income: 9000, type: 'business' },
    { id: 'big_004', name: 'Пакет акций корпорации', amount: 55000, income: 5000, type: 'stock' }
];

const EXPENSE_CARDS = [
    { id: 'exp_001', name: 'Налоги', amount: 2000, type: 'tax' },
    { id: 'exp_002', name: 'Медицинские расходы', amount: 1500, type: 'medical' },
    { id: 'exp_003', name: 'Ремонт дома', amount: 2500, type: 'repair' },
    { id: 'exp_004', name: 'Образование детей', amount: 3000, type: 'education' }
];

const shuffle = (array) => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const createDeck = (cards) => ({
    cards: shuffle(cards.map(card => ({ ...card }))),
    original: cards.map(card => ({ ...card })),
    discard: []
});

const drawFromDeck = (deck) => {
    if (!deck.cards.length) {
        deck.cards = shuffle(deck.original.map(card => ({ ...card })));
        deck.discard = [];
    }
    const card = deck.cards.shift();
    return card || null;
};

const returnCardToDeck = (deck, card) => {
    if (!card) return;
    deck.discard.push({ ...card });
};

const createPlayerStats = () => ({
    turnsTaken: 0,
    diceRolled: 0,
    dealsBought: 0,
    dealsSkipped: 0,
    dealsTransferred: 0,
    assetsSold: 0,
    incomeReceived: 0,
    expensesPaid: 0
});

const STARTING_BALANCE = 10000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

const createPlayer = ({ userId, name, avatar, isHost = false }) => ({
    userId: userId.toString(),
    name: name || 'Игрок',
    avatar: avatar || null,
    joinedAt: new Date().toISOString(),
    isHost,
    isReady: false,
    selectedDream: null,
    selectedToken: null,
    dreamAchieved: false,
    position: 0,
    track: 'inner',
    cash: STARTING_BALANCE,
    passiveIncome: 0,
    assets: [],
    stats: createPlayerStats()
});

const createRoomInstance = ({
    name,
    creatorId,
    creatorName,
    creatorAvatar,
    maxPlayers = 4,
    turnTime = 3,
    professionMode = false
}) => {
    const id = generateId('room');
    const room = {
        id,
        name: name || `Комната ${id.slice(-4)}`,
        creatorId: creatorId?.toString() || null,
        creatorName: creatorName || 'Создатель',
        creatorAvatar: creatorAvatar || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        maxPlayers: clamp(Number(maxPlayers) || 4, MIN_PLAYERS, MAX_PLAYERS),
        turnTime: clamp(Number(turnTime) || 3, 1, 20),
        assignProfessions: Boolean(professionMode),
        gameStarted: false,
        status: 'waiting',
        players: [],
        tokens: {
            available: TOKENS.map(token => ({ ...token })),
            assigned: {}
        },
        dreams: DREAMS.map(dream => ({ ...dream })),
        gameState: null,
        lastActivity: Date.now(),
        game_data: {
            player_balances: [],
            credit_data: {
                player_credits: [],
                credit_history: []
            },
            transfers_history: []
        }
    };

    // Добавляем создателя комнаты
    if (creatorId) {
        const hostPlayer = createPlayer({ userId: creatorId, name: creatorName, avatar: creatorAvatar, isHost: true });
        room.players.push(hostPlayer);
        room.game_data.player_balances.push(hostPlayer.cash);
        room.game_data.credit_data.player_credits.push(0);
    }

    rooms.set(id, room);
    return room;
};

const sanitizePlayer = (player) => ({
    userId: player.userId,
    name: player.name,
    avatar: player.avatar,
    isHost: player.isHost,
    isReady: player.isReady,
    selectedDream: player.selectedDream,
    selectedToken: player.selectedToken,
    dreamAchieved: player.dreamAchieved,
    position: player.position,
    track: player.track,
    cash: player.cash,
    passiveIncome: player.passiveIncome,
    assets: player.assets,
    stats: player.stats
});

const sanitizeRoom = (room, { includePlayers = false, userId = null } = {}) => {
    const readyPlayers = room.players.filter(player => player.isReady).length;
    const sanitized = {
        id: room.id,
        name: room.name,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        maxPlayers: room.maxPlayers,
        turnTime: room.turnTime,
        assignProfessions: room.assignProfessions,
        gameStarted: room.gameStarted,
        status: room.status,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        playersCount: room.players.length,
        readyCount: readyPlayers,
        canStart: room.players.length >= MIN_PLAYERS && readyPlayers >= MIN_PLAYERS,
        availableTokens: TOKENS.map(token => ({
            ...token,
            taken: room.players.some(player => player.selectedToken === token.id)
        })),
        availableDreams: DREAMS
    };

    if (includePlayers) {
        sanitized.players = room.players.map(player => sanitizePlayer(player));
    }

    if (userId) {
        sanitized.currentPlayer = room.players.find(player => player.userId === userId.toString()) || null;
    }

    return sanitized;
};

const getRoomById = (roomId) => rooms.get(roomId);

const addPlayerToRoom = (room, { userId, name, avatar }) => {
    if (!room || !userId) {
        throw new Error('room and userId are required');
    }

    const existingPlayer = room.players.find(player => player.userId === userId.toString());
    if (existingPlayer) {
        existingPlayer.name = name || existingPlayer.name;
        existingPlayer.avatar = avatar || existingPlayer.avatar;
        return existingPlayer;
    }

    if (room.players.length >= room.maxPlayers) {
        throw new Error('Комната заполнена');
    }

    const newPlayer = createPlayer({ userId, name, avatar });
    room.players.push(newPlayer);
    room.game_data.player_balances.push(newPlayer.cash);
    room.game_data.credit_data.player_credits.push(0);
    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
    syncCreditData(room);
    return newPlayer;
};

const removePlayerFromRoom = (room, userId) => {
    if (!room) return;
    const index = room.players.findIndex(player => player.userId === userId.toString());
    if (index === -1) return;

    const [removed] = room.players.splice(index, 1);
    room.game_data.player_balances.splice(index, 1);
    room.game_data.credit_data.player_credits.splice(index, 1);

    if (removed && removed.selectedToken) {
        delete room.tokens.assigned[removed.selectedToken];
    }

    if (room.players.length === 0) {
        rooms.delete(room.id);
        return;
    }

    if (removed.isHost) {
        room.players[0].isHost = true;
        room.creatorId = room.players[0].userId;
        room.creatorName = room.players[0].name;
    }

    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
    syncCreditData(room);
};

const toggleReadyStatus = (room, userId) => {
    const player = room.players.find(p => p.userId === userId.toString());
    if (!player) {
        throw new Error('Игрок не найден в комнате');
    }

    if (!player.selectedDream) {
        throw new Error('Сначала выберите мечту');
    }

    player.isReady = !player.isReady;
    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
    return player.isReady;
};

const assignDreamToPlayer = (room, userId, dreamId) => {
    const player = room.players.find(p => p.userId === userId.toString());
    if (!player) {
        throw new Error('Игрок не найден в комнате');
    }

    const dream = DREAMS.find(d => d.id == dreamId);
    if (!dream) {
        throw new Error('Мечта не найдена');
    }

    player.selectedDream = dream.id;
    player.dreamAchieved = false;
    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
};

const assignTokenToPlayer = (room, userId, tokenId) => {
    const player = room.players.find(p => p.userId === userId.toString());
    if (!player) {
        throw new Error('Игрок не найден в комнате');
    }

    const token = TOKENS.find(t => t.id === tokenId);
    if (!token) {
        throw new Error('Фишка не найдена');
    }

    if (room.players.some(p => p.selectedToken === tokenId && p.userId !== userId.toString())) {
        throw new Error('Эта фишка уже занята');
    }

    player.selectedToken = tokenId;
    room.tokens.assigned[tokenId] = userId.toString();
    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
};

const initializeGame = (room) => {
    const readyPlayers = room.players.filter(player => player.isReady);
    if (readyPlayers.length < MIN_PLAYERS) {
        throw new Error('Недостаточно готовых игроков для начала игры');
    }

    if (readyPlayers.some(player => !player.selectedDream || !player.selectedToken)) {
        throw new Error('Все готовые игроки должны выбрать мечту и фишку');
    }

    // Сбрасываем состояние игроков
    room.players.forEach(player => {
        player.isReady = true;
        player.position = 0;
        player.track = 'inner';
        player.cash = STARTING_BALANCE;
        player.passiveIncome = 0;
        player.assets = [];
        player.stats = createPlayerStats();
        player.dreamAchieved = false;
    });

    // Создаем состояние игры
    room.gameState = {
        startedAt: Date.now(),
        activePlayerIndex: 0,
        turnOrder: shuffle(readyPlayers.map(player => player.userId.toString())),
        phase: 'awaiting_roll',
        lastRoll: null,
        pendingDeal: null,
        decks: {
            small: createDeck(SMALL_DEAL_CARDS),
            big: createDeck(BIG_DEAL_CARDS),
            expense: createDeck(EXPENSE_CARDS)
        },
        history: []
    };

    room.gameStarted = true;
    room.status = 'playing';
    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
    syncCreditData(room);
};

const getActivePlayer = (room) => {
    if (!room.gameState || !room.gameState.turnOrder.length) return null;
    const activePlayerId = room.gameState.turnOrder[room.gameState.activePlayerIndex];
    return room.players.find(player => player.userId === activePlayerId) || null;
};

const serializeGameState = (room, requestingUserId = null) => {
    const activePlayer = getActivePlayer(room);
    return {
        roomId: room.id,
        name: room.name,
        gameStarted: room.gameStarted,
        phase: room.gameState?.phase || 'awaiting_roll',
        activePlayerId: activePlayer?.userId || null,
        turnOrder: room.gameState?.turnOrder || [],
        lastRoll: room.gameState?.lastRoll || null,
        pendingDeal: room.gameState?.pendingDeal || null,
        decks: {
            smallRemaining: room.gameState?.decks?.small?.cards.length || 0,
            bigRemaining: room.gameState?.decks?.big?.cards.length || 0,
            expenseRemaining: room.gameState?.decks?.expense?.cards.length || 0
        },
        players: room.players.map(player => ({
            ...sanitizePlayer(player),
            isActiveTurn: activePlayer ? player.userId === activePlayer.userId : false
        })),
        requestingPlayer: requestingUserId ? sanitizePlayer(
            room.players.find(player => player.userId === requestingUserId.toString()) || {}
        ) : null
    };
};

const ensureCreditRoom = (roomId, playerIndex = 0, playerName) => {
    let room = creditRooms.get(roomId);
    if (!room) {
        room = {
            id: roomId,
            createdAt: new Date().toISOString(),
            players: [],
            game_data: {
                player_balances: [],
                credit_data: {
                    player_credits: [],
                    credit_history: []
                },
                transfers_history: []
            }
        };
        creditRooms.set(roomId, room);
    }

    while (room.players.length <= playerIndex) {
        const index = room.players.length;
        room.players.push({
            name: playerName || `Player ${index + 1}`
        });
    }

    while (room.game_data.player_balances.length <= playerIndex) {
        room.game_data.player_balances.push(0);
    }

    while (room.game_data.credit_data.player_credits.length <= playerIndex) {
        room.game_data.credit_data.player_credits.push(0);
    }

    return room;
};

const requireRoom = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
        const error = new Error('Комната не найдена');
        error.code = 'ROOM_NOT_FOUND';
        throw error;
    }
    return room;
};

const getRequestUserId = (req) => {
    return (req.body?.user_id || req.headers['x-user-id'] || req.query.user_id || '').toString();
};

const getRequestUserName = (req) => {
    return req.body?.user_name || req.body?.name || req.headers['x-user-name'] || 'Игрок';
};

const buildErrorResponse = (res, error) => {
    const status = error.code === 'ROOM_NOT_FOUND' ? 404 : 400;
    res.status(status).json({ success: false, message: error.message || 'Ошибка' });
};

const syncCreditData = (room) => {
    if (!room || !room.game_data) return;
    room.players.forEach((player, index) => {
        room.game_data.player_balances[index] = player.cash;
        if (room.game_data.credit_data.player_credits[index] === undefined) {
            room.game_data.credit_data.player_credits[index] = 0;
        }
    });
};

const getCellByIndex = (index) => {
    if (!Array.isArray(GAME_CELLS) || GAME_CELLS.length === 0) {
        return null;
    }
    const normalized = ((index % GAME_CELLS.length) + GAME_CELLS.length) % GAME_CELLS.length;
    return GAME_CELLS[normalized];
};

const isDealCell = (cell) => cell && (cell.type === 'business' || cell.type === 'opportunity');
const isExpenseCell = (cell) => cell && (cell.type === 'loss' || cell.type === 'expense');
const isIncomeCell = (cell) => cell && (cell.type === 'money');

const logGameEvent = (room, event) => {
    if (!room.gameState) return;
    room.gameState.history.push({ ...event, timestamp: Date.now() });
    if (room.gameState.history.length > 200) {
        room.gameState.history.shift();
    }
};

const applyIncome = (player, amount) => {
    const income = Number(amount) || 0;
    if (!income) return 0;
    player.cash += income;
    player.stats.incomeReceived += income;
    return income;
};

const applyExpense = (player, amount) => {
    const expense = Number(amount) || 0;
    if (!expense) return 0;
    player.cash -= expense;
    player.stats.expensesPaid += expense;
    return expense;
};

const rollDice = () => {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    return {
        values: [die1, die2],
        total: die1 + die2,
        isDouble: die1 === die2
    };
};

const setPhase = (room, phase) => {
    if (!room.gameState) return;
    room.gameState.phase = phase;
    room.updatedAt = new Date().toISOString();
    room.lastActivity = Date.now();
};

const movePlayerAndResolve = (room, player, rollResult) => {
    const totalCells = GAME_CELLS.length || 0;
    player.position = totalCells
        ? ((player.position + rollResult.total) % totalCells + totalCells) % totalCells
        : player.position + rollResult.total;
    player.stats.diceRolled += 1;

    const cell = getCellByIndex(player.position);
    const events = [];

    if (room.gameState) {
        room.gameState.lastRoll = {
            playerId: player.userId,
            values: rollResult.values,
            total: rollResult.total,
            isDouble: rollResult.isDouble,
            landedCell: cell ? cell.id : null
        };
    }

    if (cell) {
        events.push({
            type: 'cell',
            cellId: cell.id,
            cellName: cell.name,
            cellType: cell.type
        });

        if (isDealCell(cell)) {
            if (room.gameState) {
                room.gameState.pendingDeal = {
                    playerId: player.userId,
                    cellId: cell.id,
                    cell,
                    stage: 'choice',
                    sizeOptions: ['small', 'big']
                };
            }
            setPhase(room, 'awaiting_deal_choice');
            logGameEvent(room, { type: 'deal_choice', playerId: player.userId, cellId: cell.id });
            syncCreditData(room);
            return { cell, events, requiresDealChoice: true };
        }

        if (isIncomeCell(cell)) {
            const income = applyIncome(player, cell.income || cell.amount || 1000);
            events.push({ type: 'income', amount: income });
        }

        if (isExpenseCell(cell)) {
            const expense = applyExpense(player, cell.amount || cell.cost || 1000);
            events.push({ type: 'expense', amount: expense });
        }

        if (cell.type === 'charity') {
            const charityAmount = Math.max(100, Math.round(player.cash * 0.1));
            const expense = applyExpense(player, charityAmount);
            events.push({ type: 'charity', amount: expense });
        }

        if (cell.type === 'dream' && player.selectedDream && Number(player.selectedDream) === Number(cell.id)) {
            player.dreamAchieved = true;
            events.push({ type: 'dream', dreamId: cell.id });
        }
    }

    setPhase(room, 'awaiting_end');
    logGameEvent(room, { type: 'move', playerId: player.userId, position: player.position, roll: rollResult.values });
    syncCreditData(room);
    return { cell, events, requiresDealChoice: false };
};

const drawDealCard = (room, size) => {
    if (!room.gameState) {
        throw new Error('Игра не запущена');
    }
    const deck = size === 'small' ? room.gameState.decks.small : room.gameState.decks.big;
    if (!deck) {
        throw new Error('Колода сделок недоступна');
    }
    const card = drawFromDeck(deck);
    if (!card) {
        throw new Error('Карты в колоде закончились');
    }
    return card;
};

const chooseDeal = (room, player, size) => {
    if (!room.gameState || !room.gameState.pendingDeal || room.gameState.pendingDeal.playerId !== player.userId) {
        throw new Error('Нет ожидаемой сделки для игрока');
    }

    const normalizedSize = size === 'small' ? 'small' : 'big';
    const card = drawDealCard(room, normalizedSize);
    room.gameState.pendingDeal = {
        ...room.gameState.pendingDeal,
        stage: 'resolution',
        size: normalizedSize,
        card
    };
    setPhase(room, 'awaiting_deal_resolution');
    logGameEvent(room, { type: 'deal_drawn', playerId: player.userId, size: normalizedSize, cardId: card.id });
    return card;
};

const addAssetToPlayer = (player, card, size) => {
    const asset = {
        id: card.id,
        cardId: card.id,
        name: card.name,
        type: card.type,
        size,
        purchasePrice: card.amount || 0,
        monthlyIncome: card.income || 0,
        acquiredAt: Date.now()
    };
    player.assets.push(asset);
    player.stats.dealsBought += 1;
    player.stats.assetsOwned = player.assets.length;
    return asset;
};

const resolveDeal = (room, player, action) => {
    if (!room.gameState || !room.gameState.pendingDeal || room.gameState.pendingDeal.playerId !== player.userId) {
        throw new Error('Нет ожидаемой сделки для игрока');
    }

    const pending = room.gameState.pendingDeal;
    const deck = pending.size === 'small' ? room.gameState.decks.small : room.gameState.decks.big;

    if (action === 'buy') {
        const price = pending.card.amount || 0;
        if (player.cash < price) {
            throw new Error('Недостаточно средств для покупки');
        }
        applyExpense(player, price);
        const asset = addAssetToPlayer(player, pending.card, pending.size);
        setPhase(room, 'awaiting_end');
        room.gameState.pendingDeal = null;
        logGameEvent(room, { type: 'deal_purchase', playerId: player.userId, cardId: pending.card.id, price });
        syncCreditData(room);
        return { asset };
    }

    // skip deal
    returnCardToDeck(deck, pending.card);
    player.stats.dealsSkipped += 1;
    room.gameState.pendingDeal = null;
    setPhase(room, 'awaiting_end');
    logGameEvent(room, { type: 'deal_skipped', playerId: player.userId, cardId: pending.card.id });
    syncCreditData(room);
    return { skipped: true };
};

const sellAsset = (room, player, assetId) => {
    const index = player.assets.findIndex(asset => asset.id === assetId || asset.cardId === assetId);
    if (index === -1) {
        throw new Error('Актив не найден');
    }
    const [asset] = player.assets.splice(index, 1);
    const deck = asset.size === 'small' ? room.gameState.decks.small : room.gameState.decks.big;
    returnCardToDeck(deck, {
        id: asset.cardId,
        name: asset.name,
        amount: asset.purchasePrice,
        income: asset.monthlyIncome,
        type: asset.type
    });
    player.stats.assetsOwned = player.assets.length;
    player.stats.assetsSold += 1;
    applyIncome(player, asset.purchasePrice);
    syncCreditData(room);
    logGameEvent(room, { type: 'asset_sold', playerId: player.userId, assetId: asset.cardId, price: asset.purchasePrice });
    return asset;
};

const transferAsset = (room, fromPlayer, toPlayer, assetId) => {
    const index = fromPlayer.assets.findIndex(asset => asset.id === assetId || asset.cardId === assetId);
    if (index === -1) {
        throw new Error('Актив не найден у отправителя');
    }
    const [asset] = fromPlayer.assets.splice(index, 1);
    fromPlayer.stats.dealsTransferred += 1;
    toPlayer.assets.push(asset);
    toPlayer.stats.assetsOwned = toPlayer.assets.length;
    syncCreditData(room);
    logGameEvent(room, { type: 'asset_transferred', from: fromPlayer.userId, to: toPlayer.userId, assetId: asset.cardId });
    return asset;
};

const advanceTurn = (room) => {
    if (!room.gameState || !room.gameState.turnOrder.length) {
        return;
    }
    room.gameState.activePlayerIndex = (room.gameState.activePlayerIndex + 1) % room.gameState.turnOrder.length;
    room.gameState.lastRoll = null;
    room.gameState.pendingDeal = null;
    setPhase(room, 'awaiting_roll');
    logGameEvent(room, { type: 'turn_advanced', activePlayerId: getActivePlayer(room)?.userId || null });
};

// --- Middleware ----------------------------------------------------------
app.use(express.json());
app.use(express.static(resolvePath('.')));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Статические директории для отдельных модулей
app.use('/assets', express.static(resolvePath('assets')));
app.use('/game-board', express.static(resolvePath('game-board')));
app.use('/bank', express.static(resolvePath('bank-module-v4')));
app.use('/telegram-bot', express.static(resolvePath('telegram-bot')));

// Служебные эндпоинты
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Основные страницы приложения
[
    ['/', 'game-board/game.html'],
    ['/index', 'index.html'],
    ['/index-old', 'index_old.html'],
    ['/lobby', 'lobby.html'],
    ['/auth', 'auth.html'],
    ['/room', 'room.html'],
    ['/profile', 'profile.html'],
    ['/cashflow', 'cashflow.html'],
    ['/perfect', 'perfect.html'],
    ['/debug', 'debug.html'],
    ['/simple', 'simple.html'],
    ['/status', 'status.html'],
    ['/test', 'test-server.html'],
    ['/test-integration', 'test-integration.html'],
    ['/test-cells', 'test-cells.html'],
    ['/test-html', 'test.html'],
    ['/test-all', 'test-all-scenarios.html'],
    ['/working', 'working.html']
].forEach(([route, file]) => registerPage(route, file));

// Страницы Game Board модуля
[
    ['/game-board', 'game-board/index.html'],
    ['/game-board/index', 'game-board/index.html'],
    ['/game-board/auth', 'game-board/auth.html'],
    ['/game-board/lobby', 'game-board/lobby.html'],
    ['/game-board/game', 'game-board/game.html'],
    ['/game-board/test-board', 'game-board/test-board.html']
].forEach(([route, file]) => registerPage(route, file));

// Страница банковского модуля
registerPage('/bank/modal', 'bank-module-v4/bank-modal-v4.html');

// Динамические страницы
app.get('/room/:roomId', (req, res) => {
    res.sendFile(resolvePath('room.html'));
});

app.get('/game/:roomId', (req, res) => {
    res.sendFile(resolvePath('game-board/game.html'));
});

// ---------------------------- Health Check ----------------------------------
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'EM1 Game Board v2.0',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        gameLogic: {
            cellsAvailable: GAME_CELLS.length,
            roomsActive: rooms.size,
            creditRoomsActive: creditRooms.size
        }
    });
});

// ---------------------------- Auth & Profile API --------------------------
const normalizeEmail = (value = '') => (typeof value === 'string' ? value.trim().toLowerCase() : '');

app.post('/api/auth/register', async (req, res) => {
    try {
        await connectToMongo();
        if (!mongoConnected) {
            return res.status(503).json({ message: 'Сервис регистрации временно недоступен' });
        }

        const { firstName, lastName, email, password, referralCode } = req.body || {};
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' });
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await LegacyUser.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        let referredBy = null;
        if (referralCode) {
            referredBy = await LegacyUser.findOne({ referral_code: referralCode.trim() });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new LegacyUser({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            username: normalizedEmail.split('@')[0],
            referred_by: referredBy ? referredBy._id : null
        });

        await user.save();

        if (referredBy) {
            await LegacyUser.updateOne(
                { _id: referredBy._id },
                { $inc: { referrals_count: 1, referral_earnings: 100 } }
            );
        }

        return res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email или реферальный код уже используются' });
        }
        return res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        await connectToMongo();
        if (!mongoConnected) {
            return res.status(503).json({ message: 'Сервис авторизации временно недоступен' });
        }

        const { email, password, rememberMe } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await LegacyUser.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        if (user.is_active === false) {
            return res.status(403).json({ message: 'Аккаунт заблокирован' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        const expiresIn = rememberMe ? TOKEN_LIFETIME.remember : TOKEN_LIFETIME.regular;
        const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn });

        user.updated_at = new Date();
        await user.save();

        return res.json({
            message: 'Успешный вход',
            token,
            expiresIn,
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Ошибка сервера при авторизации' });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        await connectToMongo();
        if (!mongoConnected) {
            return res.status(503).json({ message: 'База данных недоступна' });
        }

        const user = await LegacyUser.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        return res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        await connectToMongo();
        if (!mongoConnected) {
            return res.status(503).json({ message: 'База данных недоступна' });
        }

        const { first_name, last_name, email, username } = req.body || {};
        const user = await LegacyUser.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        if (email) {
            const normalizedEmail = normalizeEmail(email);
            if (normalizedEmail !== user.email) {
                const emailHolder = await LegacyUser.findOne({ email: normalizedEmail });
                if (emailHolder && emailHolder._id.toString() !== user._id.toString()) {
                    return res.status(400).json({ message: 'Этот email уже используется' });
                }
                user.email = normalizedEmail;
                user.username = username || normalizedEmail.split('@')[0];
            }
        }

        if (typeof first_name === 'string') {
            user.first_name = first_name.trim();
        }
        if (typeof last_name === 'string') {
            user.last_name = last_name.trim();
        }
        if (typeof username === 'string' && username.trim()) {
            user.username = username.trim();
        }

        await user.save();
        return res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Profile update error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email уже используется' });
        }
        return res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
    }
});

app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        await connectToMongo();
        if (!mongoConnected) {
            return res.status(503).json({ message: 'База данных недоступна' });
        }

        const user = await LegacyUser.findById(req.user.userId).select(
            'games_played wins_count level experience balance referrals_count referral_earnings'
        );
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        return res.json({
            games_played: user.games_played || 0,
            wins_count: user.wins_count || 0,
            level: user.level || 1,
            experience: user.experience || 0,
            balance: user.balance || 0,
            referrals_count: user.referrals_count || 0,
            referral_earnings: user.referral_earnings || 0
        });
    } catch (error) {
        console.error('User stats error:', error);
        return res.status(500).json({ message: 'Ошибка сервера при получении статистики' });
    }
});

// ---------------------------- Rooms API ----------------------------------
app.get('/api/rooms', (req, res) => {
    const list = Array.from(rooms.values())
        .sort((a, b) => b.lastActivity - a.lastActivity)
        .map(room => sanitizeRoom(room));
    res.json({ success: true, rooms: list });
});

app.post('/api/rooms', (req, res) => {
    try {
        const userId = getRequestUserId(req);
        if (!userId) {
            throw new Error('Не указан идентификатор пользователя');
        }

        const room = createRoomInstance({
            name: req.body?.name,
            creatorId: userId,
            creatorName: getRequestUserName(req),
            creatorAvatar: req.body?.avatar,
            maxPlayers: req.body?.max_players || req.body?.maxPlayers,
            turnTime: req.body?.turn_time || req.body?.turnTime,
            professionMode: req.body?.assign_professions || req.body?.profession_mode
        });

        res.status(201).json({ success: true, room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.get('/api/rooms/:roomId', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        res.json({ success: true, room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        if (!userId) {
            throw new Error('Не указан идентификатор пользователя');
        }

        const player = addPlayerToRoom(room, {
            userId,
            name: getRequestUserName(req),
            avatar: req.body?.avatar
        });

        res.json({ success: true, player: sanitizePlayer(player), room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        if (!userId) {
            throw new Error('Не указан идентификатор пользователя');
        }

        removePlayerFromRoom(room, userId);
        res.json({ success: true });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/dream', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        assignDreamToPlayer(room, userId, req.body?.dream_id || req.body?.dreamId);
        res.json({ success: true, room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/token', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        assignTokenToPlayer(room, userId, req.body?.token_id || req.body?.tokenId);
        res.json({ success: true, room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/ready', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        const isReady = toggleReadyStatus(room, userId);
        res.json({ success: true, isReady, room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/start', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        if (room.creatorId && room.creatorId.toString() !== userId.toString()) {
            throw new Error('Только создатель комнаты может начать игру');
        }
        initializeGame(room);
        res.json({ success: true, room: sanitizeRoom(room, { includePlayers: true, userId }) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.get('/api/rooms/:roomId/game-state', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        if (!room.gameStarted || !room.gameState) {
            throw new Error('Игра еще не началась');
        }
        const userId = getRequestUserId(req);
        res.json({ success: true, state: serializeGameState(room, userId) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/roll', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        if (!room.gameStarted || !room.gameState) {
            throw new Error('Игра еще не началась');
        }
        const userId = getRequestUserId(req);
        const player = room.players.find(p => p.userId === userId.toString());
        if (!player) {
            throw new Error('Игрок не найден в комнате');
        }
        const activePlayer = getActivePlayer(room);
        if (!activePlayer || activePlayer.userId !== player.userId) {
            throw new Error('Сейчас не ваш ход');
        }
        if (room.gameState.phase !== 'awaiting_roll') {
            throw new Error('Бросок кубиков сейчас недоступен');
        }

        const rollResult = rollDice();
        const moveResult = movePlayerAndResolve(room, player, rollResult);
        res.json({
            success: true,
            roll: rollResult,
            move: moveResult,
            state: serializeGameState(room, userId)
        });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/deals/choose', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        const player = room.players.find(p => p.userId === userId.toString());
        if (!player) {
            throw new Error('Игрок не найден в комнате');
        }
        if (!room.gameState || room.gameState.phase !== 'awaiting_deal_choice') {
            throw new Error('Нет активного выбора сделки');
        }
        const card = chooseDeal(room, player, req.body?.size);
        res.json({ success: true, card, state: serializeGameState(room, userId) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/deals/resolve', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        const player = room.players.find(p => p.userId === userId.toString());
        if (!player) {
            throw new Error('Игрок не найден в комнате');
        }
        if (!room.gameState || room.gameState.phase !== 'awaiting_deal_resolution') {
            throw new Error('Нет сделки для обработки');
        }
        const action = req.body?.action === 'buy' ? 'buy' : 'skip';
        const result = resolveDeal(room, player, action);
        res.json({ success: true, result, state: serializeGameState(room, userId) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/assets/transfer', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        const player = room.players.find(p => p.userId === userId.toString());
        if (!player) {
            throw new Error('Игрок не найден в комнате');
        }
        const targetId = req.body?.target_user_id || req.body?.targetUserId;
        if (!targetId) {
            throw new Error('Не указан получатель актива');
        }
        const targetPlayer = room.players.find(p => p.userId === targetId.toString());
        if (!targetPlayer) {
            throw new Error('Получатель не найден');
        }
        const assetId = req.body?.asset_id || req.body?.assetId;
        const asset = transferAsset(room, player, targetPlayer, assetId);
        res.json({ success: true, asset, state: serializeGameState(room, userId) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/assets/sell', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        const player = room.players.find(p => p.userId === userId.toString());
        if (!player) {
            throw new Error('Игрок не найден в комнате');
        }
        const assetId = req.body?.asset_id || req.body?.assetId;
        const asset = sellAsset(room, player, assetId);
        res.json({ success: true, asset, state: serializeGameState(room, userId) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.post('/api/rooms/:roomId/end-turn', (req, res) => {
    try {
        const room = requireRoom(req.params.roomId);
        const userId = getRequestUserId(req);
        const player = room.players.find(p => p.userId === userId.toString());
        if (!player) {
            throw new Error('Игрок не найден в комнате');
        }
        const activePlayer = getActivePlayer(room);
        if (!activePlayer || activePlayer.userId !== player.userId) {
            throw new Error('Сейчас не ваш ход');
        }
        if (!room.gameState || !['awaiting_end', 'awaiting_roll'].includes(room.gameState.phase)) {
            throw new Error('Невозможно завершить ход сейчас');
        }

        player.stats.turnsTaken += 1;
        advanceTurn(room);
        res.json({ success: true, state: serializeGameState(room, userId) });
    } catch (error) {
        buildErrorResponse(res, error);
    }
});

app.get('/api/rooms/:roomId/credit', (req, res) => {
    const { roomId } = req.params;
    const playerIndex = Number(req.query.playerIndex || 0);

    try {
        const room = ensureCreditRoom(roomId, playerIndex);
        const info = creditService.getPlayerCredit(room, playerIndex);
        res.json({ success: true, roomId, playerIndex, ...info });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/rooms/:roomId/credit/take', async (req, res) => {
    const { roomId } = req.params;
    const { playerIndex = 0, amount, playerName } = req.body;

    const numericPlayerIndex = Number(playerIndex);
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    if (!Number.isInteger(numericPlayerIndex) || numericPlayerIndex < 0) {
        return res.status(400).json({ success: false, message: 'playerIndex must be a non-negative integer' });
    }

    try {
        const room = ensureCreditRoom(roomId, numericPlayerIndex, playerName);
        const result = await creditService.takeCredit(room, numericPlayerIndex, numericAmount);
        res.json({ success: true, roomId, playerIndex: numericPlayerIndex, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/rooms/:roomId/credit/payoff', async (req, res) => {
    const { roomId } = req.params;
    const { playerIndex = 0, amount } = req.body;

    const numericPlayerIndex = Number(playerIndex);
    const numericAmount = amount !== undefined ? Number(amount) : undefined;

    if (!Number.isInteger(numericPlayerIndex) || numericPlayerIndex < 0) {
        return res.status(400).json({ success: false, message: 'playerIndex must be a non-negative integer' });
    }
    if (numericAmount !== undefined && (!Number.isFinite(numericAmount) || numericAmount <= 0)) {
        return res.status(400).json({ success: false, message: 'amount must be a positive number when provided' });
    }

    try {
        const room = ensureCreditRoom(roomId, numericPlayerIndex);
        const result = await creditService.payoffCredit(room, numericPlayerIndex, numericAmount);
        res.json({ success: true, roomId, playerIndex: numericPlayerIndex, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/api/rooms/:roomId/credit/history', (req, res) => {
    const { roomId } = req.params;

    const room = creditRooms.get(roomId);
    if (!room) {
        return res.json({ success: true, roomId, history: [] });
    }

    const history = room.game_data.credit_data?.credit_history || [];
    res.json({ success: true, roomId, history });
});

// API для Telegram бота
app.get('/api/user/:userId/balance', (req, res) => {
    const { userId } = req.params;
    // Здесь должна быть логика получения баланса из базы данных
    res.json({ balance: 0 });
});

app.post('/api/user/:userId/balance', (req, res) => {
    const { userId } = req.params;
    const { amount, description, type } = req.body;
    
    console.log(`Updating balance for user ${userId}: +${amount} (${description})`);
    
    // Здесь должна быть логика обновления баланса
    res.json({ success: true, newBalance: amount });
});

app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;
    // Здесь должна быть логика получения информации о пользователе
    res.json({ 
        id: userId, 
        balance: 0, 
        referralCode: `EM${userId}`, 
        createdAt: new Date().toISOString() 
    });
});

app.post('/api/user/create', (req, res) => {
    const { telegramId, username, firstName, lastName, referralCode } = req.body;
    
    console.log(`Creating game user: ${telegramId} (${username})`);
    
    // Здесь должна быть логика создания пользователя
    res.json({ success: true, userId: telegramId });
});

app.post('/api/notification', (req, res) => {
    const { userId, message, type } = req.body;
    
    console.log(`Notification for user ${userId}: ${message}`);
    
    // Здесь должна быть логика отправки уведомления
    res.json({ success: true });
});

app.get('/api/user/:userId/stats', (req, res) => {
    const { userId } = req.params;
    
    // Здесь должна быть логика получения статистики
    res.json({
        gamesPlayed: 0,
        totalEarnings: 0,
        referrals: 0,
        level: 1
    });
});

app.post('/api/sync', (req, res) => {
    const { userId, botData } = req.body;
    
    console.log(`Syncing data for user ${userId}`);
    
    // Здесь должна быть логика синхронизации данных
    res.json({ success: true });
});

app.get('/api/user/:userId/referrals', (req, res) => {
    const { userId } = req.params;
    
    // Здесь должна быть логика получения реферальной статистики
    res.json({
        totalReferrals: 0,
        totalBonus: 0,
        referrals: []
    });
});

app.post('/api/user/:userId/referrals', (req, res) => {
    const { userId } = req.params;
    const { referralData } = req.body;
    
    console.log(`Updating referral stats for user ${userId}`);
    
    // Здесь должна быть логика обновления реферальной статистики
    res.json({ success: true });
});

app.get('/api/players/active', (req, res) => {
    // Здесь должна быть логика получения активных игроков
    res.json({ players: [] });
});

app.post('/api/notifications/mass', (req, res) => {
    const { message, userIds } = req.body;
    
    console.log(`Mass notification: ${message} to ${userIds.length} users`);
    
    // Здесь должна быть логика отправки массовых уведомлений
    res.json({ success: true });
});

let httpServer;

const startServer = async () => {
    await connectToMongo();
    httpServer = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 EM1 Game Board v2.0 Server running on port ${PORT}`);
        console.log(`🌐 Server accessible at http://0.0.0.0:${PORT}`);
        if (!mongoConnected) {
            console.warn('⚠️  MongoDB подключение отсутствует – авторизация работать не сможет');
        } else {
            console.log('✅ MongoDB connection active');
        }
        console.log('✅ Ready to serve files');
        console.log('🎮 Updated game logic active');
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

const gracefulShutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    if (httpServer) {
        httpServer.close(() => {
            console.log('✅ Server closed');
            mongoose.connection.close(false, () => {
                process.exit(0);
            });
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
