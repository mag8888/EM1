// EM1 Game Board v2.0 - Main Server with Updated Game Logic
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
// Используем SQLite Database для Railway deployment
const Database = require('./database-sqlite');
const registerAuthModule = require('./modules/auth');
const registerRoomsModule = require('./modules/rooms');
const { ensureAuth: createEnsureAuth } = require('./modules/rooms');
const roomState = require('./services/room-state');
const { GAME_CELLS } = require('./game-board/config/game-cells');

// const CreditService = require('./credit-module/CreditService');
// const { SMALL_DEAL_CARDS, BIG_DEAL_CARDS, EXPENSE_CARDS, createDeck, shuffleDeck, drawCard } = require('./assets/js/utils/cards-config.js');
// const userManager = require('./game-board/utils/userManager');
// const LegacyUser = require('./models/LegacyUser'); // Отключено для SQLite

const app = express();
const PORT = process.env.PORT || 8080;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'em1-production-secret-key-2024-railway';

// --- Shared services -----------------------------------------------------
// const creditService = new CreditService();
const { rooms, creditRooms, users, drawFromDeck, returnCardToDeck, createRoomInstance, addPlayerToRoom, loadUsersFromDatabase, getUserByEmailFromMemory, setDatabase, forceSaveRoom, forceSaveAllRooms } = roomState;

// Инициализация базы данных
const db = new Database();
let dbConnected = false;

// --- Helpers -------------------------------------------------------------
const resolvePath = (relativePath) => path.join(__dirname, relativePath);

const registerPage = (route, file) => {
    app.get(route, (req, res) => {
        res.sendFile(resolvePath(file));
    });
};

const connectToDatabase = async () => {
    if (dbConnected) {
        return;
    }

    try {
        await db.init();
        dbConnected = true;
        console.log('✅ Connected to SQLite database');
        
        // Создаем тестового пользователя если его нет
        const testUser = await db.getUserByEmail('test@example.com');
        if (!testUser) {
            await db.createUser({
                email: 'test@example.com',
                password: 'test123',
                first_name: 'Тестовый',
                last_name: 'Пользователь'
            });
            console.log('✅ Создан тестовый пользователь: test@example.com / test123');
        }
        
        // Устанавливаем ссылку на базу данных в room-state
        setDatabase(db);
        
        // Загружаем пользователей из базы данных
        await loadUsersFromDatabase(db);
        
        // Загружаем существующие комнаты из SQLite в память
        await loadRoomsFromDatabase();
    } catch (error) {
        dbConnected = false;
        console.error('❌ Database connection error:', error.message);
    }
};

const loadRoomsFromDatabase = async () => {
    try {
        console.log('🔄 Загружаем комнаты из SQLite...');
        const dbRooms = await db.getAllRooms();
        console.log(`📋 Найдено комнат в SQLite: ${dbRooms.length}`);
        
        for (const row of dbRooms) {
            // Загружаем комнату с игроками
            const roomWithPlayers = await db.getRoomWithPlayers(row.id);
            if (roomWithPlayers?.room) {
                // Создаем экземпляр комнаты в памяти
                const room = createRoomInstance({
                    id: roomWithPlayers.room.id,
                    name: roomWithPlayers.room.name,
                    creator: {
                        id: roomWithPlayers.room.creator_id,
                        name: roomWithPlayers.room.creator_name || 'Создатель'
                    },
                    maxPlayers: roomWithPlayers.room.max_players,
                    turnTime: roomWithPlayers.room.turn_time,
                    assignProfessions: roomWithPlayers.room.assign_professions
                });
                
                // Устанавливаем дополнительные свойства
                room.creatorId = roomWithPlayers.room.creator_id;
                room.status = roomWithPlayers.room.status;
                room.gameStarted = Boolean(roomWithPlayers.room.game_started);
                room.createdAt = roomWithPlayers.room.created_at;
                room.updatedAt = roomWithPlayers.room.updated_at;
                
                // Добавляем игроков
                for (const playerRow of roomWithPlayers.players || []) {
                    console.log(`👤 Загружаем игрока: ${playerRow.name} (мечта: ${playerRow.selected_dream}, фишка: ${playerRow.selected_token})`);
                    const player = addPlayerToRoom(room, {
                        userId: playerRow.user_id,
                        name: playerRow.name,
                        avatar: playerRow.avatar,
                        isHost: playerRow.is_host === 1,
                        isReady: playerRow.is_ready === 1,
                        selectedDream: playerRow.selected_dream,
                        selectedToken: playerRow.selected_token
                    });
                    console.log(`✅ Игрок добавлен: ${player.name} (мечта: ${player.selectedDream}, фишка: ${player.selectedToken}, isHost: ${player.isHost})`);
                }
                
                console.log(`✅ Загружена комната: ${room.name} (${room.players.length} игроков)`);
            }
        }
        
        console.log(`✅ Загружено комнат в память: ${rooms.size}`);
        
        // Запускаем периодическое сохранение комнат
        setInterval(saveRoomsToDatabase, 30000); // каждые 30 секунд
    } catch (error) {
        console.error('❌ Ошибка загрузки комнат из SQLite:', error);
    }
};

const saveRoomsToDatabase = async () => {
    if (!dbConnected) return;
    
    try {
        for (const [roomId, room] of rooms) {
            // Обновляем данные комнаты в SQLite
            await db.updateRoom(roomId, {
                name: room.name,
                status: room.gameStarted ? 'playing' : 'waiting',
                gameStarted: room.gameStarted,
                updated_at: new Date().toISOString()
            });
            
            // Обновляем данные игроков
            for (const player of room.players) {
                await db.updatePlayerSelection(roomId, player.userId, {
                    dreamId: player.selectedDream,
                    tokenId: player.selectedToken
                });
                await db.updatePlayerReady(roomId, player.userId, player.isReady);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения комнат в SQLite:', error);
    }
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
    // Приоритет: JWT токен > x-user-id > body > query
    if (req.user?.userId) {
        return req.user.userId.toString();
    }
    return (req.body?.user_id || req.headers['x-user-id'] || req.query.user_id || '').toString();
};

const buildErrorResponse = (res, error) => {
    const status = error.code === 'ROOM_NOT_FOUND' ? 404 : 400;
    res.status(status).json({ success: false, message: error.message || 'Ошибка' });
};

const sanitizePlayer = (player = {}) => ({
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
// Добавляем обработку ошибок JSON парсинга
app.use(express.json({
    verify: (req, res, buf, encoding) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            console.warn('⚠️ Invalid JSON received:', buf.toString());
            // Не выбрасываем ошибку, просто логируем
        }
    }
}));

app.use(express.static(resolvePath('.')));

// CORS
app.use((req, res, next) => {
    // Специфичный для браузеров CORS: с credentials нельзя ставить '*'
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-ID, X-User-Name, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    // Дополнительные заголовки для Safari
    res.header('Access-Control-Expose-Headers', 'Content-Length, X-JSON, Content-Type, Authorization');
    res.header('Vary', 'Origin');
    
    // Дополнительные заголовки для Safari CORS
    res.header('Access-Control-Allow-Private-Network', 'true');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Обработка ошибок JSON парсинга
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.warn('⚠️ JSON parse error:', error.message);
        return res.status(400).json({ success: false, message: 'Invalid JSON format' });
    }
    next(error);
});

// Специальный endpoint для Safari без авторизации (должен быть ДО регистрации модулей)
app.get('/api/rooms/safari', async (req, res) => {
    try {
        console.log('Safari rooms endpoint called');
        
        // Получаем комнаты из памяти (они уже загружены при старте сервера)
        const roomsList = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            creatorId: room.creatorId,
            creatorName: room.creatorName,
            maxPlayers: room.maxPlayers,
            turnTime: room.turnTime,
            assignProfessions: room.assignProfessions,
            gameStarted: room.gameStarted,
            players: room.players.map(player => ({
                userId: player.userId,
                name: player.name,
                avatar: player.avatar,
                isHost: player.isHost,
                isReady: player.isReady,
                selectedDream: player.selectedDream,
                selectedToken: player.selectedToken
            }))
        }));
        
        console.log(`Safari endpoint returning ${roomsList.length} rooms`);
        res.json({ success: true, rooms: roomsList });
    } catch (error) {
        console.error('Ошибка получения списка комнат для Safari:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Регистрируем модуль авторизации после middleware
const { sanitizeUser, authenticateToken } = registerAuthModule({ app, db, jwtSecret: JWT_SECRET, roomState });

registerRoomsModule({
    app,
    db,
    auth: { sanitizeUser, authenticateToken },
    isDbReady: () => dbConnected
});

// Создаем ensureAuth middleware для игровых endpoints
const ensureAuth = createEnsureAuth(authenticateToken);

// ==================== ИГРОВЫЕ ENDPOINTS ====================

// Получение состояния игры
app.get('/api/rooms/:roomId/game-state', ensureAuth, (req, res) => {
    try {
        console.log(`🔍 Запрос game-state для комнаты: ${req.params.roomId}`);
        const room = requireRoom(req.params.roomId);
        console.log(`📊 Комната найдена: ${room ? 'да' : 'нет'}, игра началась: ${room?.gameStarted}, состояние: ${room?.gameState ? 'есть' : 'нет'}`);
        
        if (!room.gameStarted || !room.gameState) {
            throw new Error('Игра еще не началась');
        }
        
        // Проверяем, что пользователь находится в комнате
        const userId = req.user?.userId || req.headers['x-user-id'];
        const player = room.players.find(p => p.userId === userId);
        if (!player) {
            throw new Error('Вы не находитесь в этой комнате');
        }
        
        res.json({ success: true, state: serializeGameState(room, userId) });
    } catch (error) {
        console.error(`❌ Ошибка game-state для комнаты ${req.params.roomId}:`, error.message);
        buildErrorResponse(res, error);
    }
});

// Бросок кубиков
app.post('/api/rooms/:roomId/roll', ensureAuth, (req, res) => {
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

// Выбор сделки
app.post('/api/rooms/:roomId/deals/choose', ensureAuth, (req, res) => {
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

// Разрешение сделки
app.post('/api/rooms/:roomId/deals/resolve', ensureAuth, (req, res) => {
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

// Передача актива
app.post('/api/rooms/:roomId/assets/transfer', ensureAuth, (req, res) => {
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

// Продажа актива
app.post('/api/rooms/:roomId/assets/sell', ensureAuth, (req, res) => {
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

// Завершение хода
app.post('/api/rooms/:roomId/end-turn', ensureAuth, (req, res) => {
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

// Кредитная система
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

app.post('/api/rooms/:roomId/credit/take', ensureAuth, async (req, res) => {
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

app.post('/api/rooms/:roomId/credit/payoff', ensureAuth, async (req, res) => {
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

// ==================== API ДЛЯ TELEGRAM БОТА ====================

app.get('/api/user/:userId/balance', (req, res) => {
    const { userId } = req.params;
    res.json({ balance: 0 });
});

app.post('/api/user/:userId/balance', (req, res) => {
    const { userId } = req.params;
    const { amount, description, type } = req.body;
    
    console.log(`Updating balance for user ${userId}: +${amount} (${description})`);
    res.json({ success: true, newBalance: amount });
});

app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;
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
    res.json({ success: true, userId: telegramId });
});

app.post('/api/notification', (req, res) => {
    const { userId, message, type } = req.body;
    
    console.log(`Notification for user ${userId}: ${message}`);
    res.json({ success: true });
});

app.post('/api/sync', (req, res) => {
    const { userId, botData } = req.body;
    
    console.log(`Syncing data for user ${userId}`);
    res.json({ success: true });
});

app.get('/api/user/:userId/referrals', (req, res) => {
    const { userId } = req.params;
    
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
    res.json({ success: true });
});

app.get('/api/players/active', (req, res) => {
    res.json({ players: [] });
});

app.post('/api/notifications/mass', (req, res) => {
    const { message, userIds } = req.body;
    
    console.log(`Mass notification: ${message} to ${userIds.length} users`);
    res.json({ success: true });
});

// API для принудительного сохранения
app.post('/api/admin/force-save', (req, res) => {
    if (!dbConnected) {
        return res.status(503).json({ success: false, message: 'База данных недоступна' });
    }
    
    forceSaveAllRooms().then(success => {
        if (success) {
            res.json({ success: true, message: 'Все комнаты успешно сохранены' });
        } else {
            res.status(500).json({ success: false, message: 'Ошибка при сохранении некоторых комнат' });
        }
    }).catch(error => {
        console.error('Ошибка принудительного сохранения:', error);
        res.status(500).json({ success: false, message: 'Ошибка принудительного сохранения' });
    });
});


// Статические директории для отдельных модулей
app.use('/assets', express.static(resolvePath('assets')));
app.use('/game-board', express.static(resolvePath('game-board')));
app.use('/game', express.static(resolvePath('game-board'))); // Добавляем статический маршрут для /game
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

// Игровые endpoints будут определены после ensureAuth

// Игровые endpoints будут определены после ensureAuth

// Игровые endpoints будут определены после ensureAuth

let httpServer;

const startServer = async () => {
    await connectToDatabase();
    httpServer = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 EM1 Game Board v2.0 Server running on port ${PORT}`);
        console.log(`🌐 Server accessible at http://0.0.0.0:${PORT}`);
        if (!dbConnected) {
            console.warn('⚠️  База данных недоступна – комнаты не будут сохраняться');
        } else {
            console.log('✅ SQLite database connection active');
        }
        console.log('✅ Ready to serve files');
        console.log('🎮 Updated game logic active');
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

const gracefulShutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`);
    if (httpServer) {
        httpServer.close(async () => {
            console.log('✅ Server closed');
            await db.close();
            process.exit(0);
        });
    } else {
        await db.close();
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
