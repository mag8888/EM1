const express = require('express');
const path = require('path');

const CreditService = require('./credit-module/CreditService');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Shared services -----------------------------------------------------
const creditService = new CreditService();
const rooms = new Map();

// --- Helpers -------------------------------------------------------------
const resolvePath = (relativePath) => path.join(__dirname, relativePath);

const registerPage = (route, file) => {
    app.get(route, (req, res) => {
        res.sendFile(resolvePath(file));
    });
};

const ensureRoom = (roomId, playerIndex = 0, playerName) => {
    let room = rooms.get(roomId);
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
        rooms.set(roomId, room);
    }

    // Дополним список игроков до нужного индекса
    while (room.players.length <= playerIndex) {
        const index = room.players.length;
        room.players.push({
            name: playerName || `Player ${index + 1}`
        });
    }

    const balances = room.game_data.player_balances;
    while (balances.length <= playerIndex) {
        balances.push(0);
    }

    const credits = room.game_data.credit_data.player_credits;
    while (credits.length <= playerIndex) {
        credits.push(0);
    }

    return room;
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
    ['/', 'index.html'],
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

// API маршруты для устройств / ботов
app.get('/api/rooms', (req, res) => {
    const list = Array.from(rooms.values()).map((room) => ({
        id: room.id,
        players: room.players.map((player, index) => ({
            name: player.name,
            balance: room.game_data.player_balances[index] || 0,
            credit: room.game_data.credit_data.player_credits[index] || 0
        })),
        createdAt: room.createdAt || null
    }));

    res.json(list);
});

app.get('/api/rooms/:roomId/credit', (req, res) => {
    const { roomId } = req.params;
    const playerIndex = Number(req.query.playerIndex || 0);

    try {
        const room = ensureRoom(roomId, playerIndex);
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
        const room = ensureRoom(roomId, numericPlayerIndex, playerName);
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
        const room = ensureRoom(roomId, numericPlayerIndex);
        const result = await creditService.payoffCredit(room, numericPlayerIndex, numericAmount);
        res.json({ success: true, roomId, playerIndex: numericPlayerIndex, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/api/rooms/:roomId/credit/history', (req, res) => {
    const { roomId } = req.params;

    const room = rooms.get(roomId);
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

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`🚀 Minimal server running on port ${PORT}`);
    console.log('✅ Ready to serve files');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
