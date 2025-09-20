/**
 * Game Board v2.0 Server
 * Express сервер для развертывания на Railway
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Database imports
const { connectToDatabase, getConnectionStatus } = require('./config/database');
const Room = require('./models/Room');
const User = require('./models/User');
const Profession = require('./models/Profession');
const BankAccount = require('./models/BankAccount');
const { GAME_CELLS, GameCellsUtils } = require('./config/game-cells');
const { MARKET_CARDS, EXPENSE_CARDS, SMALL_DEALS, BIG_DEALS, CardsUtils } = require('./config/cards-config');
const userManager = require('./utils/userManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Разрешаем все источники для Railway
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: false, // Отключаем credentials для Railway
        allowedHeaders: ["*"]
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
});
const PORT = process.env.PORT || 8080;

// Express CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Initialize Database Connection
async function initializeDatabase() {
    try {
        await connectToDatabase();
        console.log('✅ Database connection established');
        
        // Initialize default profession if not exists
        await initializeDefaultProfession();
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('🔄 Continuing with in-memory storage...');
    }
}

// Initialize default profession
async function initializeDefaultProfession() {
    try {
        const existingProfession = await Profession.findOne({ name: 'Предприниматель' });
        if (!existingProfession) {
            const defaultProfession = new Profession({
                name: 'Предприниматель',
                description: 'Владелец успешного бизнеса',
                category: 'entrepreneur',
                difficulty: 'medium',
                startingFinancials: {
                    income: 10000,
                    expenses: 6200,
                    cashflow: 3800,
                    startingBalance: 1000
                },
                liabilities: [
                    { name: 'Налоги', type: 'tax', payment: 1300, principal: 0 },
                    { name: 'Прочие расходы', type: 'expense', payment: 1500, principal: 0 },
                    { name: 'Кредит на авто', type: 'loan', payment: 700, principal: 14000 },
                    { name: 'Образовательный кредит', type: 'loan', payment: 500, principal: 10000 },
                    { name: 'Ипотека', type: 'mortgage', payment: 1200, principal: 240000 },
                    { name: 'Кредитные карты', type: 'credit_card', payment: 1000, principal: 20000 }
                ],
                totalLiabilities: 284000,
                paths: [
                    {
                        name: 'Business',
                        description: 'Развитие бизнеса',
                        difficulty: 'business',
                        requirements: { minIncome: 8000, minCashflow: 2000, maxLiabilities: 300000 },
                        benefits: { incomeMultiplier: 1.2, expenseReduction: 500 }
                    },
                    {
                        name: 'Сложный',
                        description: 'Сложный путь развития',
                        difficulty: 'hard',
                        requirements: { minIncome: 12000, minCashflow: 4000, maxLiabilities: 200000 },
                        benefits: { incomeMultiplier: 1.5, expenseReduction: 1000 }
                    }
                ]
            });
            
            await defaultProfession.save();
            console.log('✅ Default profession created');
        }
    } catch (error) {
        console.error('❌ Failed to create default profession:', error.message);
    }
}

// Middleware
app.use(express.static(path.join(__dirname)));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/favicon.svg', express.static(path.join(__dirname, '..', 'favicon.svg')));
app.use(express.json());

// Helpers --------------------------------------------------------------
const getPlayerIdentifier = (player) => player?.userId || player?.id || null;

const createRoomPlayer = ({ user, isHost = false, socketId = null }) => ({
    userId: user.id,
    id: user.id, // alias for backward compatibility
    name: user.username,
    email: user.email,
    isHost,
    isReady: false,
    selectedToken: null,
    selectedDream: null,
    socketId,
    joinedAt: new Date().toISOString()
});

const sanitizePlayer = (player = {}) => ({
    userId: player.userId || player.id || null,
    name: player.name || 'Игрок',
    email: player.email || null,
    isHost: Boolean(player.isHost),
    isReady: Boolean(player.isReady),
    selectedToken: player.selectedToken ?? player.token ?? null,
    selectedDream: player.selectedDream ?? player.dream ?? null,
    joinedAt: player.joinedAt || null
});

const sanitizeRoom = (room, { requestingUserId = null } = {}) => {
    const players = (room?.players || []).map(sanitizePlayer);
    const readyCount = players.filter(player => player.isReady).length;
    const playerCount = players.length;
    const host = players.find(player => player.isHost) || null;
    const currentPlayer = requestingUserId
        ? players.find(player => player.userId === requestingUserId.toString()) || null
        : null;

    return {
        id: room.id,
        name: room.name,
        maxPlayers: room.maxPlayers,
        turnTime: room.turnTime,
        status: room.status,
        gameStarted: room.status === 'playing',
        assignProfessions: Boolean(room.assignProfessions),
        defaultProfession: room.defaultProfession || null,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt || room.createdAt,
        creatorId: room.creatorId || host?.userId || null,
        creatorName: room.creatorName || host?.name || null,
        players,
        playerCount,
        readyCount,
        canStart: playerCount >= 2 && readyCount >= 2,
        currentPlayer
    };
};

const broadcastRoomsUpdate = () => {
    io.emit('roomsUpdate', serverRooms.map(room => sanitizeRoom(room)));
};

// Банковские данные (в реальном проекте это была бы база данных)
const bankData = {
    balances: {}, // { userId: { amount: 1000, roomId: 'room123' } }
    transferHistory: [] // { from: 'user1', to: 'user2', amount: 100, timestamp: Date, roomId: 'room123' }
};

// Функции банковских операций
function getBalance(userId, roomId) {
    const key = `${userId}_${roomId}`;
    return bankData.balances[key] || { amount: 1000, roomId }; // Стартовый баланс 1000
}

function setBalance(userId, roomId, amount) {
    const key = `${userId}_${roomId}`;
    bankData.balances[key] = { amount, roomId };
}

function addTransferHistory(from, to, amount, roomId) {
    bankData.transferHistory.push({
        from,
        to,
        amount,
        timestamp: new Date(),
        roomId
    });
}

function getTransferHistory(roomId) {
    return bankData.transferHistory.filter(t => t.roomId === roomId);
}

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Страницы комнаты (используем общий room.html из корня)
const rootRoomPath = path.join(__dirname, '..', 'room.html');

app.get('/room', (req, res) => {
    res.sendFile(rootRoomPath);
});

app.get('/room/:roomId', (req, res) => {
    res.sendFile(rootRoomPath);
});

// Маршруты для страниц
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'lobby.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/game-board', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-board.html'));
});

app.get('/bank-module', (req, res) => {
    res.sendFile(path.join(__dirname, 'bank-module.html'));
});

app.get('/profession-card', (req, res) => {
    res.sendFile(path.join(__dirname, 'profession-card.html'));
});

// API для мечт
app.get('/api/dreams', (req, res) => {
    try {
        const dreams = GameCellsUtils.getDreams();
        res.json(dreams);
    } catch (error) {
        console.error('Ошибка получения мечт:', error);
        res.status(500).json({ error: 'Ошибка получения мечт' });
    }
});

app.get('/api/dreams/random', (req, res) => {
    try {
        const randomDream = GameCellsUtils.getRandomCellByType('dream');
        res.json(randomDream);
    } catch (error) {
        console.error('Ошибка получения случайной мечты:', error);
        res.status(500).json({ error: 'Ошибка получения случайной мечты' });
    }
});

app.post('/api/room/select-dream', (req, res) => {
    try {
        const { userId, roomId, dream } = req.body;
        
        if (!userId || !roomId || !dream) {
            return res.status(400).json({ error: 'Недостаточно данных для выбора мечты' });
        }
        
        // Сохраняем выбранную мечту (в реальном проекте это будет в БД)
        const key = `dream_${userId}_${roomId}`;
        if (!bankData.selectedDreams) {
            bankData.selectedDreams = {};
        }
        
        bankData.selectedDreams[key] = {
            userId,
            roomId,
            dream,
            selectedAt: new Date()
        };
        
        // Отправляем push-событие всем участникам комнаты
        io.to(roomId).emit('dreamSelected', {
            type: 'dreamSelected',
            userId,
            roomId,
            dream,
            timestamp: new Date()
        });
        
        res.json({ 
            success: true, 
            message: 'Мечта успешно выбрана',
            dream: dream
        });
        
    } catch (error) {
        console.error('Ошибка выбора мечты:', error);
        res.status(500).json({ error: 'Ошибка выбора мечты' });
    }
});

app.get('/api/room/:roomId/dreams', (req, res) => {
    try {
        const { roomId } = req.params;
        const selectedDreams = {};
        
        // Получаем все выбранные мечты для комнаты
        if (bankData.selectedDreams) {
            Object.keys(bankData.selectedDreams).forEach(key => {
                const dreamData = bankData.selectedDreams[key];
                if (dreamData.roomId === roomId) {
                    selectedDreams[dreamData.userId] = dreamData.dream;
                }
            });
        }
        
        res.json(selectedDreams);
        
    } catch (error) {
        console.error('Ошибка получения мечт комнаты:', error);
        res.status(500).json({ error: 'Ошибка получения мечт комнаты' });
    }
});

// API для игровых клеток
app.get('/api/game-cells', (req, res) => {
    try {
        const { type, category } = req.query;
        let cells = GAME_CELLS;
        
        if (type) {
            cells = cells.filter(cell => cell.type === type);
        }
        
        res.json(cells);
    } catch (error) {
        console.error('Ошибка получения игровых клеток:', error);
        res.status(500).json({ error: 'Ошибка получения игровых клеток' });
    }
});

app.get('/api/game-cells/stats', (req, res) => {
    try {
        const stats = GameCellsUtils.getCellsStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики клеток:', error);
        res.status(500).json({ error: 'Ошибка получения статистики клеток' });
    }
});

app.get('/api/game-cells/:id', (req, res) => {
    try {
        const { id } = req.params;
        const cell = GameCellsUtils.getCellById(parseInt(id));
        
        if (!cell) {
            return res.status(404).json({ error: 'Клетка не найдена' });
        }
        
        res.json(cell);
    } catch (error) {
        console.error('Ошибка получения клетки:', error);
        res.status(500).json({ error: 'Ошибка получения клетки' });
    }
});

app.get('/dream-selection', (req, res) => {
    res.sendFile(path.join(__dirname, 'dream-selection.html'));
});

app.get('/room-entry', (req, res) => {
    res.sendFile(path.join(__dirname, 'room-entry.html'));
});

app.get('/room-dream-selection', (req, res) => {
    res.sendFile(path.join(__dirname, 'room-dream-selection.html'));
});

app.get('/deals-module', (req, res) => {
    res.sendFile(path.join(__dirname, 'deals-module.html'));
});

app.get('/lobby-module', (req, res) => {
    res.sendFile(path.join(__dirname, 'lobby-module.html'));
});

// Serve test routes page
app.get('/test-routes', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-routes.html'));
});

// API маршруты для Game Board
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Game Board v2.0',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// Банковские API маршруты
app.get('/api/bank/balance/:userId/:roomId', (req, res) => {
    const { userId, roomId } = req.params;
    const balance = getBalance(userId, roomId);
    res.json(balance);
});

app.post('/api/bank/transfer', (req, res) => {
    const { from, to, amount, roomId } = req.body;
    
    // Валидация
    if (!from || !to || !amount || !roomId) {
        return res.status(400).json({ error: 'Недостаточно данных для перевода' });
    }
    
    if (from === to) {
        return res.status(400).json({ error: 'Нельзя переводить самому себе' });
    }
    
    if (amount <= 0) {
        return res.status(400).json({ error: 'Сумма должна быть положительной' });
    }
    
    const fromBalance = getBalance(from, roomId);
    if (fromBalance.amount < amount) {
        return res.status(400).json({ error: 'Недостаточно средств для перевода' });
    }
    
    // Выполняем перевод
    const toBalance = getBalance(to, roomId);
    
    // Списываем у отправителя
    setBalance(from, roomId, fromBalance.amount - amount);
    
    // Зачисляем получателю
    setBalance(to, roomId, toBalance.amount + amount);
    
    // Добавляем в историю
    addTransferHistory(from, to, amount, roomId);
    
    // Отправляем push-события всем участникам комнаты
    io.to(roomId).emit('bankUpdate', {
        type: 'transfer',
        from,
        to,
        amount,
        roomId,
        timestamp: new Date()
    });
    
    res.json({ 
        success: true, 
        message: 'Перевод выполнен успешно',
        newBalance: getBalance(from, roomId)
    });
});

app.get('/api/bank/history/:roomId', (req, res) => {
    const { roomId } = req.params;
    const history = getTransferHistory(roomId);
    res.json(history);
});

app.get('/api/bank/room-balances/:roomId', (req, res) => {
    const { roomId } = req.params;
    const balances = {};
    
    // Получаем все балансы для комнаты
    Object.keys(bankData.balances).forEach(key => {
        const [userId, userRoomId] = key.split('_');
        if (userRoomId === roomId) {
            balances[userId] = bankData.balances[key];
        }
    });
    
    res.json(balances);
});

// API для управления профессиями
app.get('/api/profession/:userId/:roomId', (req, res) => {
    const { userId, roomId } = req.params;
    const key = `profession_${userId}_${roomId}`;
    
    // Возвращаем данные профессии или начальные значения
    const professionData = bankData.professions?.[key] || {
        profession: 'Предприниматель',
        income: 10000,
        expenses: 6200,
        cashflow: 3800,
        liabilities: {
            taxes: 1300,
            other: 1500,
            carLoan: { payment: 700, principal: 14000 },
            educationLoan: { payment: 500, principal: 10000 },
            mortgage: { payment: 1200, principal: 240000 },
            creditCards: { payment: 1000, principal: 20000 }
        },
        totalLiabilities: 284000
    };
    
    res.json(professionData);
});

app.post('/api/profession/update', (req, res) => {
    const { userId, roomId, updates } = req.body;
    
    if (!userId || !roomId || !updates) {
        return res.status(400).json({ error: 'Недостаточно данных для обновления' });
    }
    
    const key = `profession_${userId}_${roomId}`;
    
    // Инициализируем структуру данных профессий если нужно
    if (!bankData.professions) {
        bankData.professions = {};
    }
    
    // Получаем текущие данные или создаем новые
    const currentData = bankData.professions[key] || {
        profession: 'Предприниматель',
        income: 10000,
        expenses: 6200,
        cashflow: 3800,
        liabilities: {
            taxes: 1300,
            other: 1500,
            carLoan: { payment: 700, principal: 14000 },
            educationLoan: { payment: 500, principal: 10000 },
            mortgage: { payment: 1200, principal: 240000 },
            creditCards: { payment: 1000, principal: 20000 }
        },
        totalLiabilities: 284000
    };
    
    // Обновляем данные
    const updatedData = { ...currentData, ...updates };
    
    // Пересчитываем денежный поток
    updatedData.cashflow = updatedData.income - updatedData.expenses;
    
    // Пересчитываем общий долг
    if (updatedData.liabilities) {
        updatedData.totalLiabilities = 
            updatedData.liabilities.carLoan?.principal || 0 +
            updatedData.liabilities.educationLoan?.principal || 0 +
            updatedData.liabilities.mortgage?.principal || 0 +
            updatedData.liabilities.creditCards?.principal || 0;
    }
    
    // Сохраняем обновленные данные
    bankData.professions[key] = updatedData;
    
    // Отправляем push-событие всем участникам комнаты
    io.to(roomId).emit('professionUpdate', {
        type: 'professionChanged',
        userId,
        roomId,
        professionData: updatedData,
        timestamp: new Date()
    });
    
    res.json({ 
        success: true, 
        message: 'Данные профессии обновлены',
        professionData: updatedData
    });
});

// API для получения карточек сделок
app.get('/api/cards', (req, res) => {
    try {
        res.json({
            success: true,
            marketCards: MARKET_CARDS,
            expenseCards: EXPENSE_CARDS,
            smallDeals: SMALL_DEALS,
            bigDeals: BIG_DEALS,
            stats: CardsUtils.getCardsStatistics()
        });
    } catch (error) {
        console.error('Ошибка получения карточек:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения карточек сделок'
        });
    }
});

// API для получения карт рынка
app.get('/api/cards/market', (req, res) => {
    try {
        res.json({
            success: true,
            cards: MARKET_CARDS,
            count: MARKET_CARDS.length
        });
    } catch (error) {
        console.error('Ошибка получения карт рынка:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения карт рынка'
        });
    }
});

// API для получения карт расходов
app.get('/api/cards/expense', (req, res) => {
    try {
        res.json({
            success: true,
            cards: EXPENSE_CARDS,
            count: EXPENSE_CARDS.length
        });
    } catch (error) {
        console.error('Ошибка получения карт расходов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения карт расходов'
        });
    }
});

// API для получения малых сделок
app.get('/api/cards/small-deals', (req, res) => {
    try {
        res.json({
            success: true,
            cards: SMALL_DEALS,
            count: SMALL_DEALS.length
        });
    } catch (error) {
        console.error('Ошибка получения малых сделок:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения малых сделок'
        });
    }
});

// API для получения больших сделок
app.get('/api/cards/big-deals', (req, res) => {
    try {
        res.json({
            success: true,
            cards: BIG_DEALS,
            count: BIG_DEALS.length
        });
    } catch (error) {
        console.error('Ошибка получения больших сделок:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения больших сделок'
        });
    }
});

// Маршрут для тестовой страницы
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-board.html'));
});

// Маршрут для документации
app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'README.md'));
});

// API маршруты для комнат (для LobbyModule)
app.get('/api/rooms', (req, res) => {
    try {
        res.json({
            success: true,
            rooms: serverRooms.map(room => sanitizeRoom(room))
        });
    } catch (error) {
        console.error('Ошибка получения списка комнат:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rooms', (req, res) => {
    try {
        const { name, max_players, turn_time, assign_professions, password, profession } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Название комнаты обязательно' });
        }

        // Получаем пользователя из заголовков
        const userEmail = req.headers['x-user-name'] || 'guest@example.com';
        const user = userManager.getUserByEmail(userEmail) || userManager.registerUser({
            email: userEmail,
            username: userEmail.split('@')[0]
        });

        const newRoom = {
            id: Date.now().toString(),
            name,
            maxPlayers: max_players || 4,
            turnTime: turn_time || 3,
            players: [],
            status: 'waiting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignProfessions: Boolean(assign_professions),
            password: password || null,
            defaultProfession: profession || 'entrepreneur',
            creatorId: user.id,
            creatorEmail: user.email
        };
        
        serverRooms.push(newRoom);
        
        console.log(`🏠 Комната "${name}" создана пользователем ${user.username} (${user.id})`);

        res.json({
            success: true,
            room: sanitizeRoom(newRoom, { requestingUserId: user.id })
        });
    } catch (error) {
        console.error('Ошибка создания комнаты:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    try {
        const { roomId } = req.params;
        const { password } = req.body;
        
        const room = serverRooms.find(r => r.id === roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Комната не найдена' });
        }
        
        if (room.players.length >= room.maxPlayers) {
            return res.status(400).json({ success: false, error: 'Комната заполнена' });
        }
        
        if (room.status === 'playing') {
            return res.status(400).json({ success: false, error: 'Игра уже началась' });
        }
        
        // Проверка пароля (если требуется)
        if (room.password && room.password !== password) {
            return res.status(401).json({ success: false, error: 'Неверный пароль' });
        }
        
        // Получаем пользователя из заголовков
        const userEmail = req.headers['x-user-name'] || 'guest@example.com';
        const user = userManager.getUserByEmail(userEmail) || userManager.registerUser({
            email: userEmail,
            username: userEmail.split('@')[0]
        });
        
        // Проверяем, не находится ли пользователь уже в комнате
        const existingPlayer = room.players.find(p => getPlayerIdentifier(p) === user.id);
        if (existingPlayer) {
            return res.status(400).json({ success: false, error: 'Вы уже в этой комнате' });
        }
        
        // Добавляем игрока
        const newPlayer = createRoomPlayer({
            user,
            isHost: room.players.length === 0
        });

        room.players.push(newPlayer);
        room.updatedAt = new Date().toISOString();

        res.json({
            success: true,
            room: sanitizeRoom(room, { requestingUserId: user.id })
        });
    } catch (error) {
        console.error('Ошибка присоединения к комнате:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
    try {
        const { roomId } = req.params;
        const userEmail = req.headers['x-user-name'] || 'guest@example.com';
        const user = userManager.getUserByEmail(userEmail);
        
        if (!user) {
            return res.status(400).json({ success: false, error: 'Пользователь не найден' });
        }
        
        const room = serverRooms.find(r => r.id === roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Комната не найдена' });
        }
        
        // Удаляем игрока из комнаты
        const playerIndex = room.players.findIndex(p => getPlayerIdentifier(p) === user.id);
        if (playerIndex === -1) {
            return res.status(400).json({ success: false, error: 'Вы не находитесь в этой комнате' });
        }
        
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        // Если это был хост и в комнате остались игроки, назначаем нового хоста
        if (player.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
        }

        // Если комната пустая, удаляем её
        if (room.players.length === 0) {
            serverRooms.splice(serverRooms.indexOf(room), 1);
        }
        
        room.updatedAt = new Date().toISOString();

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка выхода из комнаты:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rooms/:roomId', (req, res) => {
    try {
        const { roomId } = req.params;
        const room = serverRooms.find(r => r.id === roomId);
        
        if (!room) {
            return res.status(404).json({ success: false, error: 'Комната не найдена' });
        }
        
        const requestingUserId = req.query.user_id || req.query.userId || req.headers['x-user-id'] || null;
        res.json({
            success: true,
            room: sanitizeRoom(room, { requestingUserId })
        });
    } catch (error) {
        console.error('Ошибка получения комнаты:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API маршруты для пользователя
app.get('/api/user/profile', (req, res) => {
    try {
        const userEmail = req.headers['x-user-name'] || 'guest@example.com';
        const user = userManager.getUserByEmail(userEmail) || userManager.registerUser({
            email: userEmail,
            username: userEmail.split('@')[0]
        });
        
        // Добавляем игровые данные
        const profile = {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            email: user.email,
            balance: 10000, // Можно добавить в userManager
            registeredAt: user.registeredAt,
            lastSeen: user.lastSeen,
            isOnline: user.isOnline,
            connections: user.socketConnections.size
        };
        
        res.json(profile);
    } catch (error) {
        console.error('Ошибка получения профиля пользователя:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/user/stats', (req, res) => {
    try {
        const userEmail = req.headers['x-user-name'] || 'guest@example.com';
        const user = userManager.getUserByEmail(userEmail);
        
        // Генерируем статистику на основе ID пользователя для стабильности
        const userHash = user ? parseInt(user.id.replace('user_', ''), 36) : Math.random() * 1000000;
        
        const stats = {
            gamesPlayed: Math.floor((userHash % 100) + 1),
            wins: Math.floor((userHash % 50) + 1),
            level: Math.floor((userHash % 20) + 1),
            totalUsers: userManager.getUserCount(),
            onlineUsers: userManager.getOnlineUserCount(),
            userId: user ? user.id : 'guest'
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики пользователя:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Страница не найдена',
        requested: req.originalUrl,
        availableRoutes: [
            '/',
            '/auth',
            '/lobby', 
            '/game',
            '/lobby-module',
            '/test-routes',
            '/test',
            '/docs',
            '/api/health',
            '/api/rooms',
            '/api/user/profile'
        ]
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Произошла внутренняя ошибка сервера'
    });
});

// Серверное хранилище комнат и пользователей
let serverRooms = [];
let connectedUsers = new Map();

// WebSocket подключения
io.on('connection', (socket) => {
    console.log('👤 Пользователь подключился:', socket.id);
    console.log('🔌 Transport:', socket.conn.transport.name);
    console.log('🌐 Origin:', socket.handshake.headers.origin);
    
    // Обработка ошибок подключения
    socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
    });
    
    socket.on('disconnect', (reason) => {
        console.log('👋 Пользователь отключился:', socket.id, 'Причина:', reason);
    });
    
                // Регистрация пользователя
                socket.on('registerUser', (userData) => {
                    try {
                        // Если нет данных пользователя, создаем гостевого пользователя
                        if (!userData || !userData.email) {
                            userData = {
                                email: `guest_${Date.now()}@example.com`,
                                username: 'Гость',
                                first_name: 'Гость'
                            };
                        }
                        
                        // Валидируем данные пользователя
                        const validatedData = userManager.validateUserData(userData);
                        
                        // Регистрируем пользователя с единым ID
                        const user = userManager.registerUser(validatedData);
                        
                        // Добавляем WebSocket соединение
                        userManager.addSocketConnection(user.id, socket.id);
                        
                        // Сохраняем связь socket.id -> user.id
                        connectedUsers.set(socket.id, user);
                        
                        console.log('👤 Пользователь подключился:', user.username, 'ID:', user.id, 'Socket:', socket.id);
                        console.log('📊 Статистика:', userManager.getStats());
                        
                        // Отправляем обновленный список комнат
                        socket.emit('roomsUpdate', serverRooms.map(room => sanitizeRoom(room, { requestingUserId: user.id })));
                        
                    } catch (error) {
                        console.error('❌ Ошибка регистрации пользователя:', error.message);
                        socket.emit('error', { message: error.message });
                    }
                });
    
    // Создание комнаты
    socket.on('createRoom', (roomData) => {
        const user = connectedUsers.get(socket.id);
        if (!user) {
            socket.emit('error', { message: 'Пользователь не зарегистрирован' });
            return;
        }
        
        const newRoom = {
            id: Date.now().toString(),
            name: roomData.name,
            maxPlayers: roomData.maxPlayers,
            turnTime: roomData.turnTime,
            players: [createRoomPlayer({ user, isHost: true, socketId: socket.id })],
            status: 'waiting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignProfessions: Boolean(roomData.assignProfessions),
            defaultProfession: roomData.defaultProfession || roomData.profession || 'entrepreneur',
            creatorId: user.id,
            creatorEmail: user.email
        };

        serverRooms.push(newRoom);

        // Отправляем обновленный список всем пользователям
        broadcastRoomsUpdate();

        // Присоединяем создателя к комнате
        socket.join(newRoom.id);
        socket.emit('roomCreated', sanitizeRoom(newRoom, { requestingUserId: user.id }));

        console.log(`🏠 Создана комната ${newRoom.id} пользователем ${user.username}`);
    });
    
    // Присоединение к комнате
    socket.on('joinRoom', (roomId) => {
        const user = connectedUsers.get(socket.id);
        if (!user) {
            socket.emit('error', { message: 'Пользователь не зарегистрирован' });
            return;
        }
        
        const room = serverRooms.find(r => r.id === roomId);
        if (!room) {
            console.log(`❌ Комната ${roomId} не найдена. Доступные комнаты:`, serverRooms.map(r => r.id));
            socket.emit('error', { message: 'Комната не найдена' });
            return;
        }
        
        if (room.players.length >= room.maxPlayers) {
            socket.emit('error', { message: 'Комната заполнена' });
            return;
        }
        
        // Проверяем, не находится ли пользователь уже в этой комнате
        const existingPlayer = room.players.find(p => p.socketId === socket.id);
        if (existingPlayer) {
            socket.emit('error', { message: 'Вы уже в этой комнате' });
            return;
        }
        
        // Добавляем игрока в комнату
        room.players.push(createRoomPlayer({ user, isHost: false, socketId: socket.id }));
        room.updatedAt = new Date().toISOString();

        socket.join(roomId);

        // Отправляем обновленный список всем пользователям
        broadcastRoomsUpdate();

        // Отправляем обновление комнаты всем участникам
        io.to(roomId).emit('roomUpdate', sanitizeRoom(room));

        // Уведомляем пользователя об успешном присоединении
        socket.emit('roomJoined', sanitizeRoom(room, { requestingUserId: user.id }));
        
        console.log(`🏠 Пользователь ${user.username} присоединился к комнате ${roomId}`);
    });
    
    // Покидание комнаты
    socket.on('leaveRoom', (roomId) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;
        
        const room = serverRooms.find(r => r.id === roomId);
        if (!room) return;
        
        // Удаляем игрока из комнаты
        room.players = room.players.filter(p => p.socketId !== socket.id);

        // Если это был хост и в комнате остались игроки, назначаем нового хоста
        if (room.players.length > 0) {
            room.players[0].isHost = true;
        }

        // Если комната пустая, удаляем её
        if (room.players.length === 0) {
            serverRooms = serverRooms.filter(r => r.id !== roomId);
        }
        
        room.updatedAt = new Date().toISOString();

        socket.leave(roomId);

        // Отправляем обновления
        broadcastRoomsUpdate();
        if (room.players.length > 0) {
            io.to(roomId).emit('roomUpdate', sanitizeRoom(room));
        }

        console.log(`🚪 Пользователь ${user.username} покинул комнату ${roomId}`);
    });
    
    // Выбор фишки
    socket.on('selectToken', (data) => {
        const { roomId, tokenId } = data;
        const user = connectedUsers.get(socket.id);
        if (!user) return;
        
        const room = serverRooms.find(r => r.id === roomId);
        if (!room) return;
        
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) return;
        
        // Проверяем, не выбрана ли уже эта фишка другим игроком
        const tokenInUse = room.players.some(p => p.selectedToken === tokenId && p.socketId !== socket.id);
        if (tokenInUse) {
            socket.emit('error', { message: 'Эта фишка уже выбрана другим игроком' });
            return;
        }
        
        // Присваиваем фишку игроку
        player.selectedToken = tokenId;
        room.updatedAt = new Date().toISOString();

        // Отправляем обновление комнаты всем участникам
        io.to(roomId).emit('roomUpdate', sanitizeRoom(room));

        console.log(`🎯 Игрок ${user.username} выбрал фишку ${tokenId} в комнате ${roomId}`);
    });
    
    // Выбор мечты
    socket.on('selectDream', (data) => {
        const { roomId, dreamId } = data;
        const user = connectedUsers.get(socket.id);
        if (!user) return;
        
        const room = serverRooms.find(r => r.id === roomId);
        if (!room) return;
        
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) return;
        
        // Присваиваем мечту игроку
        player.selectedDream = dreamId;
        room.updatedAt = new Date().toISOString();

        // Отправляем обновление комнаты всем участникам
        io.to(roomId).emit('roomUpdate', sanitizeRoom(room));

        console.log(`🌟 Игрок ${user.username} выбрал мечту ${dreamId} в комнате ${roomId}`);
    });
    
    // Отключение от комнаты
    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`🚪 Пользователь ${socket.id} покинул комнату ${roomId}`);
    });
    
    // Отключение
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            console.log('👋 Пользователь отключился:', user.username, 'ID:', user.id, 'Socket:', socket.id);
            
            // Удаляем WebSocket соединение
            userManager.removeSocketConnection(user.id, socket.id);
            
            // Удаляем пользователя из всех комнат
            serverRooms.forEach(room => {
                const playerIndex = room.players.findIndex(p => getPlayerIdentifier(p) === user.id);
                if (playerIndex !== -1) {
                    const player = room.players[playerIndex];
                    room.players.splice(playerIndex, 1);
                    
                    // Если это был хост и в комнате остались игроки, назначаем нового хоста
                    if (player.isHost && room.players.length > 0) {
                        room.players[0].isHost = true;
                    }
                    
                    // Если комната пустая, удаляем её
                    if (room.players.length === 0) {
                        serverRooms = serverRooms.filter(r => r.id !== room.id);
                    } else {
                        room.updatedAt = new Date().toISOString();
                        // Отправляем обновление комнаты оставшимся участникам
                        io.to(room.id).emit('roomUpdate', sanitizeRoom(room));
                    }
                }
            });
            
            // Отправляем обновленный список комнат всем пользователям
            broadcastRoomsUpdate();
            
            // Удаляем пользователя из списка подключенных
            connectedUsers.delete(socket.id);
            
            console.log('📊 Статистика после отключения:', userManager.getStats());
        } else {
            console.log('👋 Неизвестный пользователь отключился:', socket.id);
        }
    });
});

// Запуск сервера
async function startServer() {
    try {
        // Initialize database first
        await initializeDatabase();
        
        // Start server
        server.listen(PORT, () => {
            console.log('🎮 Game Board v2.8 Server запущен!');
            console.log(`🚀 Сервер работает на порту ${PORT}`);
            console.log(`📱 Локальный адрес: http://localhost:${PORT}`);
            console.log(`🌐 Railway адрес: https://your-app.railway.app`);
            console.log('✅ Готов к обслуживанию файлов');
            console.log('🔌 WebSocket сервер активен');
            
            // Display database status
            const dbStatus = getConnectionStatus();
            if (dbStatus.isConnected) {
                console.log(`📊 База данных подключена: ${dbStatus.name}@${dbStatus.host}`);
            } else {
                console.log('⚠️  База данных недоступна - используется локальное хранилище');
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, завершение работы...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Получен сигнал SIGINT, завершение работы...');
    process.exit(0);
});
