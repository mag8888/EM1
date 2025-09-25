/**
 * EM1 Game Board v2.0 - Production Server for Railway.app with MongoDB Atlas
 * Все процессы работают только на сервере Railway.app через MongoDB
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SQLiteDatabase = require('./database-sqlite.js');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'em1-production-secret-key-2024-railway';

// MongoDB Configuration
let dbConnected = false;

// Try MongoDB Atlas connection
const initializeDatabase = async () => {
    try {
        console.log('🔄 Attempting MongoDB Atlas connection...');
        const { connectToMongoDB, setModels, dbWrapper } = require('./game-board/config/database-mongodb');
        const UserModel = require('./game-board/models/UserModel');
        const RoomModel = require('./game-board/models/RoomModel');
        
        await connectToMongoDB();
        setModels(UserModel, RoomModel);
        db = dbWrapper;
        dbConnected = true;
        console.log('✅ Connected to MongoDB Atlas');
        
        // Load users from MongoDB
        await loadUsersFromDatabase();
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('❌ Server requires MongoDB Atlas connection');
        
        // Проверяем, что мы на Railway или принудительно включен режим Railway
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.FORCE_RAILWAY_MODE;
        if (isRailway) {
            console.error('❌ Railway deployment requires MongoDB Atlas');
            process.exit(1);
        } else {
            console.warn('⚠️ Local development: MongoDB not required');
        }
    }
};

// Load users from MongoDB
const loadUsersFromDatabase = async () => {
    try {
        console.log('🔄 Загружаем пользователей из MongoDB...');
        const users = await db.getAllUsers();
        console.log(`📋 Найдено пользователей в MongoDB: ${users.length}`);
        
        users.forEach(user => {
            console.log(`👤 Загружаем пользователя: ${user.email} (ID: ${user._id || user.id})`);
        });
        
        console.log(`✅ Загружено пользователей в память: ${users.length}`);
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
    }
};

// Middleware
app.use(cors({
    origin: [
        "http://localhost:8080",
        "http://localhost:3000", 
        "https://em1-production.up.railway.app",
        "https://em1-production.railway.app"
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Name'],
    credentials: true
}));
// Ensure preflight requests are handled
app.options('*', cors({
    origin: [
        "http://localhost:8080",
        "http://localhost:3000", 
        "https://em1-production.up.railway.app",
        "https://em1-production.railway.app"
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Name'],
    credentials: true
}));
// Extra headers for some browsers (Safari)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-User-Name');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with no-cache to avoid stale assets after deploy
app.disable('etag');
const noCacheStatic = (dir) => express.static(dir, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store');
    }
});

app.use(noCacheStatic(path.join(__dirname)));
app.use('/game-board', noCacheStatic(path.join(__dirname, 'game-board')));

// In-memory storage for minimal functionality
const users = new Map();
const rooms = new Map();
// In-memory banking
const bankBalances = new Map(); // key: roomId:username -> { amount }
const bankHistory = new Map();  // key: roomId -> [ { from, to, amount, timestamp } ]
const bankLoans = new Map();    // key: roomId:username -> { amount }
// Turn timers
const turnTimers = new Map(); // roomId -> { timeout, deadline }

// SQLite Database
let sqliteDb = null;

// Initialize database and load rooms
async function initializeSQLite() {
    try {
        // Проверяем, что мы на Railway или принудительно включен режим Railway
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.FORCE_RAILWAY_MODE;
        if (!isRailway) {
            console.log('🔄 Not on Railway, skipping SQLite initialization');
            return;
        }
        
        sqliteDb = new SQLiteDatabase();
        await sqliteDb.init();
        console.log('✅ SQLite database initialized on Railway');
        
        // Load existing rooms from database
        await loadRoomsFromSQLite();
        console.log('✅ Rooms loaded from Railway database');
    } catch (error) {
        console.error('❌ Failed to initialize Railway database:', error);
    }
}

// Load rooms from database into memory
async function loadRoomsFromSQLite() {
    try {
        const allRooms = await sqliteDb.getAllRooms();
        for (const roomData of allRooms) {
            const roomState = await sqliteDb.loadRoomState(roomData.id);
            if (roomState) {
                // Ensure all players have proper tokenOffset for visual positioning
                if (roomState.players && roomState.players.length > 0) {
                    roomState.players.forEach((player, index) => {
                        player.tokenOffset = index; // Set visual offset for multiple players
                    });
                }
                
                rooms.set(roomState.id, roomState);
                console.log(`✅ Loaded room: ${roomState.id} (${roomState.status}) with ${roomState.players?.length || 0} players`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to load rooms from database:', error);
    }
}

// Save room state to database
async function saveRoomToSQLite(room) {
    if (!sqliteDb) return;
    try {
        console.log('💾 Saving room state to database:', {
            roomId: room.id,
            status: room.status,
            activeIndex: room.activeIndex,
            playersCount: room.players?.length || 0,
            players: room.players?.map(p => ({
                userId: p.userId,
                name: p.name,
                position: p.position,
                track: p.track,
                cash: p.cash,
                passiveIncome: p.passiveIncome
            }))
        });
        
        await sqliteDb.saveRoomState(room);
        console.log('✅ Room state saved successfully');
    } catch (error) {
        console.error('❌ Failed to save room to database:', error);
    }
}

// Cell event processing
function processCellEvent(player, position, roomId) {
    // Определяем тип клетки по позиции (1-24)
    const cellType = getCellTypeByPosition(position);
    
    switch (cellType) {
        case 'yellow_payday':
            return processSalaryDay(player, roomId);
        case 'purple_baby':
            return processBabyBorn(player);
        case 'green_opportunity':
            return processDealOpportunity(player, position);
        case 'blue_market':
            return processMarketEvent(player, position);
        case 'pink_expense':
            return processExpenseEvent(player, position);
        case 'orange_charity':
            return processCharityEvent(player, roomId);
        case 'black_loss':
            return processLossEvent(player, roomId);
        default:
            return null;
    }
}

// Обработка возможности сделки
function processDealOpportunity(player, position) {
    console.log(`💼 Возможность сделки для ${player.name} на позиции ${position}`);
    return {
        type: 'deal_opportunity',
        playerId: player.userId,
        position: position,
        cellType: 'green_opportunity'
    };
}

// Обработка события рынка
function processMarketEvent(player, position) {
    console.log(`🎯 Событие рынка для ${player.name} на позиции ${position}`);
    return {
        type: 'market_event',
        playerId: player.userId,
        position: position,
        cellType: 'blue_market'
    };
}

// Обработка события расходов
function processExpenseEvent(player, position) {
    console.log(`💸 Событие расходов для ${player.name} на позиции ${position}`);
    return {
        type: 'expense_event',
        playerId: player.userId,
        position: position,
        cellType: 'pink_expense'
    };
}

// Black Loss (Downsize): one-time choice: either pay 3x monthly expenses now OR 1x now
function processLossEvent(player, roomId) {
    const baseExpenses = Number(player?.profession?.expenses || 0);
    const childExpenses = Number(player?.children || 0) * 1000;
    const monthly = baseExpenses + childExpenses;
    return {
        type: 'loss_event',
        playerId: player.userId,
        cellType: 'black_loss',
        monthlyExpenses: monthly,
        options: [
            { id: 'pay3', label: 'Оплатить 3 платежа сразу', amount: monthly * 3 },
            { id: 'pay1', label: 'Оплатить 1 платеж сразу', amount: monthly }
        ]
    };
}

// Get cell type by position (1-24)
function getCellTypeByPosition(position) {
    // Явное соответствие 1..24 (внутренний круг)
    // Можно подправить при необходимости, чтобы синхронизировать с фронтендом
    const cellMap = {
        1: 'pink_expense',        // расходы
        2: 'green_opportunity',   // сделка
        3: 'blue_market',         // рынок
        4: 'orange_charity',      // благотворительность (10% → 3 хода 1/2 кубика)
        5: 'yellow_payday',       // PAYDAY
        6: 'green_opportunity',
        7: 'blue_market',
        8: 'pink_expense',
        9: 'green_opportunity',
        10: 'blue_market',
        11: 'pink_expense',
        12: 'purple_baby',        // ребёнок (шанс)
        13: 'yellow_payday',
        14: 'green_opportunity',
        15: 'blue_market',
        16: 'green_opportunity',
        17: 'pink_expense',
        18: 'green_opportunity',
        19: 'blue_market',
        20: 'black_loss',
        21: 'yellow_payday',
        22: 'green_opportunity',
        23: 'blue_market',
        24: 'green_opportunity'
    };
    return cellMap[position] || null;
}

// Charity event: pay 10% of total income to gain 3 power turns (1 or 2 dice)
function processCharityEvent(player, roomId) {
    console.log(`❤️ Charity opportunity for ${player.name}`);
    const income = Number((player?.profession?.salary || 0) + (player?.passiveIncome || 0));
    const donation = Math.floor(income * 0.10);
    return {
        type: 'charity',
        playerId: player.userId,
        cellType: 'orange_charity',
        canDonate: donation > 0 && (player.cash || 0) >= donation,
        donation,
        income
    };
}

// Process salary day event
function processSalaryDay(player, roomId) {
    console.log(`💰 PAYDAY: Обработка зарплаты для ${player.name}`);
    console.log(`💰 PAYDAY: Профессия:`, player.profession);
    console.log(`💰 PAYDAY: Текущий баланс: $${player.cash || 0}`);
    
    const salary = player.profession?.salary || 0;
    const passiveIncome = player.passiveIncome || 0;
    const totalIncome = salary + passiveIncome;
    
    console.log(`💰 PAYDAY: Зарплата: $${salary}, Пассивный доход: $${passiveIncome}, Итого: $${totalIncome}`);
    
    // Добавляем зарплату
    const oldCash = player.cash || 0;
    player.cash = oldCash + totalIncome;
    
    // Обрабатываем расходы (базовые + дети)
    const baseExpenses = player.profession?.expenses || 0;
    const childExpenses = (player.children || 0) * 1000;
    const totalExpenses = baseExpenses + childExpenses;
    
    console.log(`💰 PAYDAY: Базовые расходы: $${baseExpenses}, Расходы на детей: $${childExpenses}, Итого расходов: $${totalExpenses}`);
    
    if (totalExpenses > 0) {
        player.cash = Math.max(0, player.cash - totalExpenses);
    }
    
    console.log(`💰 PAYDAY для ${player.name}: +$${totalIncome}, -$${totalExpenses}, баланс: $${oldCash} → $${player.cash}`);

    // Синхронизируем с банковским балансом (интерфейс /api/bank)
    try {
        if (roomId && typeof ensureBalance === 'function') {
            const username = player.name || player.username || String(player.userId);
            const bankBal = ensureBalance(roomId, username, 0);
            const delta = (totalIncome - totalExpenses);
            bankBal.amount = Number(bankBal.amount || 0) + Number(delta || 0);
            pushHistory(roomId, { 
                type: 'payday', 
                username, 
                amount: delta, 
                reason: 'зарплата',
                timestamp: Date.now() 
            });
            console.log(`💰 PAYDAY Bank sync: ${username} ${delta >= 0 ? '+' : ''}${delta}, new bank balance: ${bankBal.amount}`);
        }
    } catch (e) {
        console.warn('⚠️ PAYDAY bank sync failed:', e?.message || e);
    }
    
    return {
        type: 'salary_day',
        income: totalIncome,
        expenses: totalExpenses,
        newBalance: player.cash,
        oldBalance: oldCash
    };
}

// Process baby born event
function processBabyBorn(player) {
    // Бросаем кубик (1-6)
    const babyDice = Math.floor(Math.random() * 6) + 1;
    console.log(`👶 Бросок кубика для рождения ребенка: ${babyDice}`);
    
    if (babyDice <= 4) {
        // Ребенок родился
        const currentChildren = player.children || 0;
        player.children = currentChildren + 1;
        
        // Выплачиваем подарок
        player.cash = (player.cash || 0) + 5000;
        
        console.log(`👶 Ребенок родился у ${player.name}! Всего детей: ${player.children}, +$5000`);
        
        return {
            type: 'baby_born',
            babyBorn: true,
            diceResult: babyDice,
            childrenCount: player.children,
            bonus: 5000
        };
    } else {
        // Ребенок не родился
        console.log(`👶 Ребенок не родился у ${player.name} (кубик: ${babyDice})`);
        
        return {
            type: 'baby_born',
            babyBorn: false,
            diceResult: babyDice
        };
    }
}

// Turn timer management
function startTurnTimer(roomId, turnTimeSec = 120) {
    clearTurnTimer(roomId);
    const deadline = Date.now() + (turnTimeSec * 1000);
    const timeout = setTimeout(() => {
        autoEndTurn(roomId);
    }, turnTimeSec * 1000);
    turnTimers.set(roomId, { timeout, deadline });
}

function clearTurnTimer(roomId) {
    const timer = turnTimers.get(roomId);
    if (timer) {
        clearTimeout(timer.timeout);
        turnTimers.delete(roomId);
    }
}

function getTurnTimeLeft(roomId) {
    const timer = turnTimers.get(roomId);
    if (!timer) return 0;
    const left = Math.max(0, Math.floor((timer.deadline - Date.now()) / 1000));
    return left;
}

function autoEndTurn(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') {
        // Clear timer if game is not playing
        clearTurnTimer(roomId);
        return;
    }
    
    // Ensure activeIndex is always a number
    if (typeof room.activeIndex !== 'number') room.activeIndex = 0;
    
    // Advance to next player
    const count = (room.players || []).length || 1;
    room.activeIndex = (room.activeIndex + 1) % count;
    room.updatedAt = new Date().toISOString();
    
    // Start timer for next player
    startTurnTimer(roomId, room.turnTime || 120);
    
    // Save to database
    saveRoomToSQLite(room);
    
    console.log(`Auto-ended turn for room ${roomId}, now active: ${room.activeIndex}`);
}

// Health Check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'EM1 Game Board v2.0',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        database: 'Memory',
        rooms: rooms.size,
        users: users.size
    });
});

// API Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'EM1 Game Board v2.0',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        database: 'Memory',
        rooms: rooms.size,
        users: users.size
    });
});

// List rooms (minimal implementation)
app.get('/api/rooms', (req, res) => {
    try {
        const list = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            turnTime: room.turnTime,
            status: room.status,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            players: room.players || []
        }));
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, rooms: list });
    } catch (error) {
        console.error('Ошибка получения списка комнат:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// CORS-friendly public endpoint for Safari fallback (no auth headers expected)
app.get('/api/rooms/safari', (req, res) => {
    try {
        const list = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            turnTime: room.turnTime,
            status: room.status,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            players: room.players || []
        }));
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, rooms: list });
    } catch (error) {
        console.error('Ошибка получения списка комнат (safari):', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Create room (requires user ID)
app.post('/api/rooms', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const name = String(req.body?.name || '').trim();
        const maxPlayers = Number(req.body?.max_players || req.body?.maxPlayers || 4);
        const turnTimeSec = Number(req.body?.turn_time || req.body?.turnTime || 120);
        if (name.length < 3 || name.length > 48) {
            return res.status(400).json({ success: false, message: 'Название комнаты должно быть 3-48 символов' });
        }
        if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) {
            return res.status(400).json({ success: false, message: 'maxPlayers должен быть от 2 до 8' });
        }
        const creatorName = req.headers['x-user-name'] || user.username || user.email || 'Игрок';
        const room = {
            id: Date.now().toString(),
            name,
            maxPlayers,
            // Store turn time in SECONDS consistently across the server
            turnTime: Math.max(5, Math.round(turnTimeSec || 120)),
            status: 'waiting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            activeIndex: 0, // Always start with 0
            creatorName: creatorName,
            lastActivity: Date.now(),
            players: [
                {
                    userId: String(user.id),
                    name: req.headers['x-user-name'] || user.username || user.email || 'Игрок',
                    isHost: true,
                    isReady: false,
                    selectedToken: null,
                    selectedDream: null,
                    position: 0,
                    cash: 10000,
                    passiveIncome: 0,
                    assets: [],
                    profession: {
                        id: 'entrepreneur',
                        name: 'Предприниматель',
                        description: 'Владелец бизнеса',
                        icon: '🚀',
                        salary: 10000,
                        expenses: 6200,
                        color: '#00ff96'
                    }
                }
            ]
        };
        rooms.set(room.id, room);
        
        // Save to database
        if (sqliteDb) {
            try {
                await sqliteDb.createRoom({
                    id: room.id,
                    name: room.name,
                    creatorId: String(user.id),
                    creatorName: creatorName,
                    creatorAvatar: user.avatar || null,
                    maxPlayers: room.maxPlayers,
                    minPlayers: 2,
                    turnTime: room.turnTime,
                    assignProfessions: false
                });
                
                // Create host player in database
                await sqliteDb.addPlayerToRoom(room.id, String(user.id), creatorName, user.avatar || null, true);
            } catch (dbError) {
                console.error('❌ Failed to save room to database:', dbError);
            }
        }
        
        res.status(201).json({ success: true, room });
    } catch (error) {
        console.error('Ошибка создания комнаты:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Helper to sanitize room for response
function sanitizeRoom(room) {
    if (!room) return null;
    const players = room.players || [];
    const readyCount = players.filter(p => p.isReady).length;
    const playersCount = players.length;
    const canStart = playersCount >= 2 && readyCount >= 2;
    
    // Собираем занятые фишки и мечты
    const takenTokens = players
        .filter(p => p.selectedToken)
        .map(p => p.selectedToken);
    
    // Мечты теперь можно выбирать нескольким игрокам, поэтому takenDreams не нужен
    
    return {
        id: room.id,
        name: room.name,
        maxPlayers: room.maxPlayers,
        turnTime: room.turnTime,
        status: room.status,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        playersCount,
        readyCount,
        canStart,
        gameStarted: room.status === 'playing',
        takenTokens, // Занятые фишки
        players: players.map(p => ({
            userId: p.userId,
            name: p.name,
            isHost: !!p.isHost,
            isReady: !!p.isReady,
            selectedToken: p.selectedToken ?? null,
            selectedDream: p.selectedDream ?? null,
            position: p.position ?? 0,
            cash: p.cash ?? 10000,
            passiveIncome: p.passiveIncome ?? 0,
            assets: Array.isArray(p.assets) ? p.assets : []
        }))
    };
}

// Get room by id (public GET without auth)
app.get('/api/rooms/:roomId', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        // Try to identify current user
        let currentUserId = null;
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
            try {
                const payload = jwt.verify(token, JWT_SECRET);
                currentUserId = String(payload.userId || payload.id || '') || null;
            } catch (_) {}
        }
        if (!currentUserId) {
            currentUserId = String(req.query.user_id || req.headers['x-user-id'] || '') || null;
        }

        const sanitized = sanitizeRoom(room);
        const currentPlayer = (room.players || []).find(p => currentUserId && String(p.userId) === String(currentUserId)) || null;

        res.set('Cache-Control', 'no-store');
        res.json({ success: true, room: { ...sanitized, currentPlayer } });
    } catch (error) {
        console.error('Ошибка получения комнаты:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Join room (requires user ID)
app.post('/api/rooms/:roomId/join', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        const already = (room.players || []).some(p => String(p.userId) === userId);
        if (!already) {
            if ((room.players || []).length >= room.maxPlayers) {
                return res.status(400).json({ success: false, message: 'Комната заполнена' });
            }
            room.players.push({
                userId: String(user.id),
                name: req.headers['x-user-name'] || user.username || user.email || 'Игрок',
                isHost: false,
                isReady: false,
                selectedToken: null,
                selectedDream: null,
                position: 0,
                cash: 10000,
                passiveIncome: 0,
                assets: [],
                profession: {
                    id: 'entrepreneur',
                    name: 'Предприниматель',
                    description: 'Владелец успешного бизнеса',
                    icon: '🚀',
                    salary: 10000,
                    expenses: 6200,
                    color: '#00ff96'
                }
            });
            room.updatedAt = new Date().toISOString();
            room.lastActivity = Date.now();
            
            // Save to database
            if (sqliteDb) {
                try {
                    const playerName = req.headers['x-user-name'] || user.username || user.email || 'Игрок';
                    await sqliteDb.addPlayerToRoom(room.id, String(user.id), playerName, user.avatar || null, false);
                } catch (dbError) {
                    console.error('❌ Failed to add player to database:', dbError);
                }
            }
            saveRoomToSQLite(room);
        }

        res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка присоединения к комнате:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Start game (requires user ID and host, and canStart)
app.post('/api/rooms/:roomId/start', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const hostId = String(room.players?.[0]?.userId || '');
        const s = sanitizeRoom(room);
        if (String(userId) !== hostId) {
            return res.status(403).json({ success: false, message: 'Только создатель комнаты может начать игру' });
        }
        if (!s.canStart) {
            return res.status(400).json({ success: false, message: 'Недостаточно готовых игроков' });
        }
        room.status = 'playing';
        // Случайно выбираем первого игрока
        const playersCount = (room.players || []).length || 1;
        room.activeIndex = Math.floor(Math.random() * playersCount);
        // Инициализация стартовых позиций на малом круге
        const order = (room.players || []).length;
        (room.players || []).forEach((p, idx) => {
            p.position = 0; // клетка 1 малого круга
            p.track = 'inner';
            p.tokenOffset = idx; // для визуального сдвига на клиенте
            p.passiveIncome = Number(p.passiveIncome || 0); // гарантируем число
            if (p.passiveIncome < 0 || !Number.isFinite(p.passiveIncome)) p.passiveIncome = 0;

            // Начальные сбережения: начисляем $3000 каждому игроку и пишем в историю
            const bal = ensureBalance(room.id, p.name, 0);
            bal.amount += 3000;
            pushHistory(room.id, { from: 'Банк', to: p.name, amount: 3000, roomId: room.id, timestamp: Date.now(), type: 'initial_deposit' });
        });
        room.updatedAt = new Date().toISOString();
        
        // Запускаем серверный таймер для первого игрока
        startTurnTimer(room.id, room.turnTime || 120);
        
        // Save to database
        saveRoomToSQLite(room);
        
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка запуска игры:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Select dream (requires user ID)
app.post('/api/rooms/:roomId/dream', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) return res.status(400).json({ success: false, message: 'Игрок не в комнате' });
        
        const dreamId = req.body?.dream_id ?? req.body?.dreamId;
        
        // Разрешаем мечты выбирать нескольким игрокам
        
        player.selectedDream = dreamId ?? null;
        room.updatedAt = new Date().toISOString();
        room.lastActivity = Date.now();
        
        // Save to database
        saveRoomToSQLite(room);
        
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка выбора мечты:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Select token (requires user ID)
app.post('/api/rooms/:roomId/token', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) return res.status(400).json({ success: false, message: 'Игрок не в комнате' });
        
        const tokenId = req.body?.token_id ?? req.body?.tokenId;
        
        // Проверяем, что фишка не выбрана другим игроком
        if (tokenId) {
            const isTokenTaken = (room.players || []).some(p => 
                String(p.userId) !== String(userId) && p.selectedToken === tokenId
            );
            
            if (isTokenTaken) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Эта фишка уже выбрана другим игроком' 
                });
            }
        }
        
        player.selectedToken = tokenId ?? null;
        room.updatedAt = new Date().toISOString();
        room.lastActivity = Date.now();
        
        // Save to database
        saveRoomToSQLite(room);
        
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка выбора фишки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Toggle ready (requires user ID)
app.post('/api/rooms/:roomId/ready', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) return res.status(400).json({ success: false, message: 'Игрок не в комнате' });
        player.isReady = !player.isReady;
        room.updatedAt = new Date().toISOString();
        room.lastActivity = Date.now();
        
        // Save to database
        saveRoomToSQLite(room);
        
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка готовности:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Get game state (requires user ID)
app.get('/api/rooms/:roomId/game-state', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.query.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }

        // Check if user is in the room
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) {
            return res.status(400).json({ success: false, message: 'Вы не находитесь в этой комнате. Пожалуйста, присоединитесь к комнате сначала.' });
        }

        // Return game state
        const activePlayer = room.players?.[room.activeIndex || 0] || null;
        const turnTimeLeft = getTurnTimeLeft(room.id);
        
        console.log('🔍 Game state - activeIndex:', room.activeIndex, 'activePlayer:', activePlayer, 'allPlayers:', room.players?.map(p => ({ userId: p.userId, name: p.name })));
        console.log('🔍 Game state - room.turnTime:', room.turnTime, 'turnTimeLeft:', turnTimeLeft, 'roomId:', room.id);
        
        // Ensure activeIndex is always a number
        const activeIndex = typeof room.activeIndex === 'number' ? room.activeIndex : 0;
        
        const gameState = {
            roomId: room.id,
            status: room.status,
            players: (room.players || []).map(player => ({
                userId: player.userId,
                name: player.name,
                position: player.position || 0,
                track: player.track || 'inner',
                tokenOffset: player.tokenOffset || 0,
                selectedToken: player.selectedToken || null,
                profession: player.profession || null,
                cash: player.cash || 0,
                passiveIncome: player.passiveIncome || 0,
                assets: player.assets || []
            })),
            currentPlayer: player,
            gameStarted: room.status === 'playing',
            turnTime: room.turnTime,
            maxPlayers: room.maxPlayers,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            activePlayerId: activePlayer?.userId || null,
            activeIndex: activeIndex,
            currentTurn: 1,
            phase: 'waiting',
            diceResult: null,
            pendingDeal: null,
            turnTimeLeft: turnTimeLeft
        };

        res.set('Cache-Control', 'no-store');
        res.json({ success: true, state: gameState });
    } catch (error) {
        console.error('Ошибка получения состояния игры:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ===== Banking API (minimal) =====
function getBalanceKey(roomId, username) {
    return `${roomId}:${username}`;
}

function ensureBalance(roomId, username, initial = 0) {
    const key = getBalanceKey(roomId, username);
    if (!bankBalances.has(key)) {
        bankBalances.set(key, { amount: initial });
    }
    return bankBalances.get(key);
}

function ensureLoan(roomId, username) {
    const key = getBalanceKey(roomId, username);
    if (!bankLoans.has(key)) {
        bankLoans.set(key, { amount: 0 });
    }
    return bankLoans.get(key);
}

function pushHistory(roomId, record) {
    if (!bankHistory.has(roomId)) bankHistory.set(roomId, []);
    bankHistory.get(roomId).push(record);
}

// Get balance
app.get('/api/bank/balance/:username/:roomId', (req, res) => {
    try {
        const { username, roomId } = req.params;
        const balance = ensureBalance(roomId, username);
        res.json({ amount: balance.amount });
    } catch (error) {
        console.error('Ошибка баланса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Player financial details endpoint
app.get('/api/bank/financials/:username/:roomId', (req, res) => {
    try {
        const { username, roomId } = req.params;
        const room = rooms.get(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        const player = (room?.players || []).find(p => p.name === username || p.username === username);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        const salary = Number(player?.profession?.salary || 0);
        const passiveIncome = Number(player?.passiveIncome || 0);
        const baseExpenses = Number(player?.profession?.expenses || 0);
        const childExpenses = Number(player?.children || 0) * 1000;
        const totalExpenses = baseExpenses + childExpenses;
        const netIncome = (salary + passiveIncome) - totalExpenses;
        
        res.json({
            salary,
            passiveIncome,
            baseExpenses,
            childExpenses,
            totalExpenses,
            netIncome,
            cash: player.cash || 0,
            children: player.children || 0,
            profession: player.profession
        });
    } catch (error) {
        console.error('Error getting financials:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get transfer history (last 100)
app.get('/api/bank/history/:roomId', (req, res) => {
    try {
        const { roomId } = req.params;
        const history = bankHistory.get(roomId) || [];
        res.json(history.slice(-100));
    } catch (error) {
        console.error('Ошибка истории переводов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Make transfer
app.post('/api/bank/transfer', (req, res) => {
    try {
        const { from, to, amount, roomId } = req.body || {};
        const sum = Number(amount);
        if (!roomId || !from || !to || !Number.isFinite(sum) || sum <= 0) {
            return res.status(400).json({ error: 'Неверные параметры перевода' });
        }
        const fromBal = ensureBalance(roomId, from);
        const toBal = ensureBalance(roomId, to);
        if (fromBal.amount < sum) {
            return res.status(400).json({ error: 'Недостаточно средств' });
        }
        fromBal.amount -= sum;
        toBal.amount += sum;
        const record = { 
            from, 
            to, 
            amount: sum, 
            roomId, 
            reason: 'перевод от игрока',
            timestamp: Date.now() 
        };
        pushHistory(roomId, record);
        res.json({ success: true, newBalance: { amount: fromBal.amount }, record });
    } catch (error) {
        console.error('Ошибка перевода:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== Push Notifications API =====
// Send balance change notification
app.post('/api/bank/notify/balance', (req, res) => {
    try {
        const { username, roomId, amount, reason } = req.body || {};
        
        if (!username || !roomId || typeof amount !== 'number') {
            return res.status(400).json({ error: 'Неверные параметры уведомления' });
        }
        
        // Add to history with reason
        pushHistory(roomId, { 
            type: 'notification',
            username, 
            amount, 
            reason: reason || 'пополнение баланса',
            timestamp: Date.now() 
        });
        
        console.log(`🔔 Push notification: ${username} ${amount >= 0 ? '+' : ''}$${amount} - ${reason || 'пополнение баланса'}`);
        
        res.json({ 
            success: true, 
            message: `Ваш счет пополнен на сумму $${amount}`,
            reason: reason || 'пополнение баланса'
        });
    } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== Credit API =====
// Get credit status
app.get('/api/bank/credit/status/:username/:roomId', (req, res) => {
    try {
        const { username, roomId } = req.params;
        const loan = ensureLoan(roomId, username);

        // Find room and player's income (passive income or salary)
        const room = rooms.get(roomId);
        const player = (room?.players || []).find(p => p.name === username || p.username === username);
        
        // Используем пассивный доход, если есть, иначе зарплату
        const passiveIncome = Number(player?.passiveIncome || 0);
        const salary = Number(player?.profession?.salary || 0);
        const cashflow = passiveIncome > 0 ? passiveIncome : salary;
        
        const step = 1000;
        const ratePerStep = 100; // cashflow decreases per 1000
        const maxSteps = Math.max(0, Math.floor(cashflow / ratePerStep));
        const maxAvailable = maxSteps * step;

        res.json({
            loanAmount: Number(loan.amount || 0),
            cashflow,
            maxAvailable,
            step,
            ratePerStep
        });
    } catch (error) {
        console.error('Credit status error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Take credit
app.post('/api/bank/credit/take', (req, res) => {
    try {
        const { username, roomId, amount } = req.body || {};
        const sum = Number(amount);
        if (!roomId || !username || !Number.isFinite(sum) || sum <= 0) {
            return res.status(400).json({ error: 'Неверные параметры' });
        }
        if (sum % 1000 !== 0) {
            return res.status(400).json({ error: 'Сумма должна быть кратна 1000' });
        }
        const room = rooms.get(roomId);
        if (!room) return res.status(404).json({ error: 'Комната не найдена' });
        const player = (room.players || []).find(p => p.name === username || p.username === username);
        if (!player) return res.status(404).json({ error: 'Игрок не найден' });

        const step = 1000;
        const ratePerStep = 100;
        
        // Используем пассивный доход, если есть, иначе зарплату
        const passiveIncome = Number(player.passiveIncome || 0);
        const salary = Number(player.profession?.salary || 0);
        const cashflow = passiveIncome > 0 ? passiveIncome : salary;
        
        const maxAvailable = Math.floor(cashflow / ratePerStep) * step;
        if (sum > maxAvailable) {
            return res.status(400).json({ error: 'Превышен лимит кредита' });
        }

        // Update loan and player
        const loan = ensureLoan(roomId, username);
        loan.amount = Number(loan.amount || 0) + sum;
        
        // Уменьшаем пассивный доход или зарплату
        if (passiveIncome > 0) {
            player.passiveIncome = Math.max(0, passiveIncome - (sum / 1000) * ratePerStep);
        } else {
            player.profession.salary = Math.max(0, salary - (sum / 1000) * ratePerStep);
        }

        // Credit funds to balance
        const bal = ensureBalance(roomId, username);
        bal.amount += sum;
        pushHistory(roomId, { 
            from: 'Банк', 
            to: username, 
            amount: sum, 
            roomId, 
            reason: 'взятие кредита',
            timestamp: Date.now(), 
            type: 'credit_take' 
        });

        res.json({ success: true, loanAmount: loan.amount, newBalance: bal, cashflow: player.passiveIncome });
    } catch (error) {
        console.error('Credit take error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Repay credit
app.post('/api/bank/credit/repay', (req, res) => {
    try {
        const { username, roomId, amount } = req.body || {};
        const sum = Number(amount);
        if (!roomId || !username || !Number.isFinite(sum) || sum <= 0) {
            return res.status(400).json({ error: 'Неверные параметры' });
        }
        if (sum % 1000 !== 0) {
            return res.status(400).json({ error: 'Сумма должна быть кратна 1000' });
        }
        const loan = ensureLoan(roomId, username);
        if (sum > loan.amount) {
            return res.status(400).json({ error: 'Сумма больше задолженности' });
        }
        const bal = ensureBalance(roomId, username);
        if (sum > bal.amount) {
            return res.status(400).json({ error: 'Недостаточно средств на балансе' });
        }

        // Update state
        loan.amount -= sum;
        bal.amount -= sum;

        // Restore cashflow on player (пассивный доход или зарплату)
        const room = rooms.get(roomId);
        const player = (room?.players || []).find(p => p.name === username || p.username === username);
        if (player) {
            const passiveIncome = Number(player.passiveIncome || 0);
            const salary = Number(player.profession?.salary || 0);
            const restoredAmount = (sum / 1000) * 100;
            
            if (passiveIncome > 0) {
                player.passiveIncome = passiveIncome + restoredAmount;
            } else {
                player.profession.salary = salary + restoredAmount;
            }
        }

        pushHistory(roomId, { 
            from: username, 
            to: 'Банк', 
            amount: sum, 
            roomId, 
            reason: 'погашение кредита',
            timestamp: Date.now(), 
            type: 'credit_repay' 
        });
        res.json({ success: true, loanAmount: loan.amount, newBalance: bal, cashflow: player?.passiveIncome || 0 });
    } catch (error) {
        console.error('Credit repay error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Registration API endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registration request received:', req.body);
        const { username, email, password, confirmPassword } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Пароли не совпадают' });
        }
        
        // Check if user exists
        for (let user of users.values()) {
            if (user.email === email) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = Date.now().toString();
        const newUser = {
            id: userId,
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            isActive: true
        };
        
        users.set(userId, newUser);
        console.log('✅ User created successfully:', newUser.username);
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            accessToken: token,
            token: token, // для совместимости
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

// Login API endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }
        
        // Find user
        let user = null;
        for (let u of users.values()) {
            if (u.email === email) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            // Auto-create user on login for minimal in-memory server (can be disabled with AUTH_AUTO_CREATE_ON_LOGIN=false)
            const allowAutoCreate = (process.env.AUTH_AUTO_CREATE_ON_LOGIN || 'true').toLowerCase() !== 'false';
            if (allowAutoCreate) {
                const usernameFromEmail = String(email).split('@')[0] || 'user';
                const hashedPassword = await bcrypt.hash(password, 10);
                const userId = Date.now().toString();
                user = {
                    id: userId,
                    username: usernameFromEmail,
                    email,
                    password: hashedPassword,
                    createdAt: new Date(),
                    isActive: true
                };
                users.set(userId, user);
                console.log('🆕 Auto-created user on login:', user.username);
            } else {
                return res.status(401).json({ error: 'Неверный email или пароль' });
            }
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Успешный вход',
            accessToken: token,
            token: token, // для совместимости
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

// Profile API endpoint
app.get('/api/user/profile/:username', (req, res) => {
    try {
        const { username } = req.params;
        
        // Find user by username
        let user = null;
        for (let u of users.values()) {
            if (u.username === username) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            isActive: user.isActive
        });
        
    } catch (error) {
        console.error('❌ Profile error:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении профиля' });
    }
});

// Current user profile (requires user ID)
app.get('/api/user/profile', (req, res) => {
    try {
        // Get user ID from headers
        const userId = req.headers['x-user-id'] || req.query.user_id;
        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            level: user.level || 1,
            experience: user.experience || 0,
            games_played: user.games_played || 0,
            wins_count: user.wins_count || 0,
            balance: user.balance || 0,
            createdAt: user.createdAt,
            isActive: user.isActive
        });
        
    } catch (error) {
        console.error('❌ Profile error:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении профиля' });
    }
});

// User stats endpoint (requires user ID)
app.get('/api/user/stats', (req, res) => {
    try {
        // Get user ID from headers
        const userId = req.headers['x-user-id'] || req.query.user_id;
        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }

        // Find user by ID
        let user = null;
        for (let u of users.values()) {
            if (String(u.id) === String(userId)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            games_played: user.games_played || 0,
            wins_count: user.wins_count || 0,
            level: user.level || 1,
            experience: user.experience || 0,
            balance: user.balance || 10000,
            online_users: users.size
        });
    } catch (error) {
        console.error('Ошибка получения статистики пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Profile page route
app.get('/game/u/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-board', 'profile.html'));
});

// Room page route (for minimal prod)
app.get('/room/u/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
});

// Direct room route by id (used by older links)
app.get('/room/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
});

// Game page route (return to game)
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-board', 'game.html'));
});

// Lobby routes aliases
app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-board', 'lobby.html'));
});
app.get('/game/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-board', 'lobby.html'));
});

// This endpoint was a duplicate - removed to avoid conflicts

// Simple cards endpoint for deals module
app.get('/api/cards', (req, res) => {
    try {
        // Minimal mock lists (IDs only) to provide counts to the UI
        const makeArray = (n, type) => Array.from({ length: n }, (_, i) => ({ id: `${type}_${i+1}` }));
        const marketCards = makeArray(24, 'market');
        const expenseCards = makeArray(24, 'expense');
        const smallDeals = makeArray(32, 'small');
        const bigDeals = makeArray(24, 'big');
        res.json({ success: true, marketCards, expenseCards, smallDeals, bigDeals });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка загрузки карт' });
    }
});

app.post('/api/rooms/:roomId/roll', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        // Only active player can roll
        const userId = req.headers['x-user-id'] || req.body?.user_id;
        const activePlayer = room.players?.[room.activeIndex || 0] || null;
        if (!userId || !activePlayer || String(activePlayer.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }

        // Dice roll: single by default; double=true for charity
        const useDouble = String(req.query.double || req.body?.double || '').toLowerCase() === 'true'
            || Number(activePlayer?.charityTurns || 0) > 0; // благотворительность позволяет 1 или 2 кубика
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = useDouble ? (Math.floor(Math.random() * 6) + 1) : null;
        const total = useDouble ? d1 + (d2 || 0) : d1;
        const isDouble = useDouble && d1 === d2;

        // Списываем один заряд благотворительности, если был активен
        if (Number(activePlayer?.charityTurns || 0) > 0) {
            activePlayer.charityTurns = Math.max(0, Number(activePlayer.charityTurns) - 1);
        }

        // Ensure activeIndex is always a number
        const activeIndex = typeof room.activeIndex === 'number' ? room.activeIndex : 0;
        
        res.json({ 
            success: true, 
            result: { dice1: d1, dice2: d2, total, isDouble },
            state: {
                roomId: room.id,
                status: room.status,
                activePlayerId: room.players?.[activeIndex]?.userId || null,
                activeIndex: activeIndex,
                players: room.players || [],
                currentTurn: 1,
                phase: 'moving',
                diceResult: { dice1: d1, dice2: d2, total, isDouble },
                pendingDeal: null,
                turnTimeLeft: getTurnTimeLeft(room.id),
                turnTime: room.turnTime || 120
            }
        });
    } catch (error) {
        console.error('Ошибка броска кубика:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Move active player by steps on inner circle (24 cells)
app.post('/api/rooms/:roomId/move', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        // Гарантируем наличие gameState, иначе возможен 500 при обращении к нему ниже
        room.gameState = room.gameState || {};
        const userId = req.headers['x-user-id'] || req.body?.user_id;
        const activePlayer = room.players?.[room.activeIndex || 0] || null;
        if (!userId || !activePlayer || String(activePlayer.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }
        const steps = Number(req.body?.steps || req.query.steps || 0);
        if (!Number.isFinite(steps) || steps <= 0) {
            return res.status(400).json({ success: false, message: 'Некорректные шаги' });
        }
        const INNER_COUNT = 24;
        const from = Number(activePlayer.position || 0);
        const path = [];
        for (let i = 1; i <= steps; i++) {
            path.push((from + i) % INNER_COUNT);
        }
        activePlayer.position = path[path.length - 1];
        room.updatedAt = new Date().toISOString();

        // Обработка события клетки
        console.log(`🎯 Обработка события клетки для игрока ${activePlayer.name} на позиции ${activePlayer.position}`);
        const cellEvent = processCellEvent(activePlayer, activePlayer.position, room.id);
        if (cellEvent) {
            console.log(`⚡ Событие клетки: ${cellEvent.type} для игрока ${activePlayer.name}`);
            console.log(`⚡ Детали события:`, cellEvent);
            
            // Применяем результат события к игроку
            if (cellEvent.type === 'salary_day') {
                console.log(`💰 Начислена зарплата: +$${cellEvent.income}, расходы: -$${cellEvent.expenses}`);
                console.log(`💰 Новый баланс игрока: $${activePlayer.cash}`);
                // Зарплата уже начислена в processSalaryDay
            } else if (cellEvent.type === 'baby_born') {
                console.log(`👶 Родился ребенок: +1 ребенок`);
                // Ребенок уже добавлен в processBabyBorn
            } else if (cellEvent.type === 'deal_opportunity') {
                console.log(`💼 Возможность сделки на позиции ${activePlayer.position}`);
                // Устанавливаем флаг ожидания выбора сделки
                room.gameState.pendingDeal = {
                    playerId: activePlayer.userId,
                    stage: 'size',
                    cellId: activePlayer.position
                };
                room.gameState.phase = 'awaiting_deal_choice';
            } else if (cellEvent.type === 'market_event') {
                console.log(`🎯 Событие рынка на позиции ${activePlayer.position}`);
                // Здесь можно добавить логику для событий рынка
            } else if (cellEvent.type === 'expense_event') {
                console.log(`💸 Событие расходов на позиции ${activePlayer.position}`);
                // Здесь можно добавить логику для событий расходов
            } else if (cellEvent.type === 'charity') {
                // Для благотворительности пока только сообщаем клиенту детали,
                // само списание и активация выполняется отдельным POST /charity
            }
        } else {
            console.log(`⚡ Нет события для позиции ${activePlayer.position}`);
        }

        // Save to database (без падения обработчика)
        try {
            saveRoomToSQLite(room);
        } catch (e) {
            console.warn('⚠️ saveRoomToSQLite failed in /move:', e?.message || e);
        }

        // Ensure activeIndex is always a number
        const activeIndex = typeof room.activeIndex === 'number' ? room.activeIndex : 0;
        
        // Return updated game state
        const updatedGameState = {
            roomId: room.id,
            status: room.status,
            activePlayerId: activePlayer.userId,
            activeIndex: activeIndex,
            players: room.players.map(player => ({
                userId: player.userId,
                name: player.name,
                position: player.position || 0,
                track: player.track || 'inner',
                tokenOffset: player.tokenOffset || 0,
                selectedToken: player.selectedToken || null,
                profession: player.profession || null,
                cash: player.cash || 0,
                passiveIncome: player.passiveIncome || 0,
                assets: player.assets || []
            })),
            currentTurn: 1,
            phase: 'waiting',
            diceResult: null,
            pendingDeal: null,
            turnTimeLeft: getTurnTimeLeft(room.id),
            turnTime: room.turnTime || 120,
            moveResult: {
                from,
                to: activePlayer.position,
                path,
                steps
            }
        };

        res.json({
            success: true,
            state: updatedGameState,
            from,
            to: activePlayer.position,
            path,
            message: `Игрок ${activePlayer.name} прошел ${steps} шагов`
        });
    } catch (error) {
        console.error('Ошибка перемещения /move:', {
            message: error?.message || String(error),
            stack: error?.stack,
            roomId: req.params?.roomId,
            userId: req.headers?.['x-user-id'] || req.body?.user_id,
            body: req.body
        });
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/end-turn', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        // Only active player can end turn
        const userId = req.headers['x-user-id'] || req.body?.user_id;
        const activePlayer = room.players?.[room.activeIndex || 0] || null;
        console.log('🔍 End turn check - userId:', userId, 'activePlayer:', activePlayer, 'activeIndex:', room.activeIndex);
        console.log('🔍 All players:', room.players?.map(p => ({ userId: p.userId, name: p.name, isHost: p.isHost })));
        console.log('🔍 String comparison - userId:', String(userId), 'activePlayer.userId:', String(activePlayer?.userId), 'match:', String(activePlayer?.userId) === String(userId));
        if (!userId || !activePlayer || String(activePlayer.userId) !== String(userId)) {
            console.log('🔍 End turn denied - userId mismatch or missing');
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }

        // Ensure activeIndex is always a number
        if (typeof room.activeIndex !== 'number') room.activeIndex = 0;
        
        // Advance active player in round-robin
        const count = (room.players || []).length || 1;
        room.activeIndex = (room.activeIndex + 1) % count;
        room.updatedAt = new Date().toISOString();
        
        // Restart timer for next player
        startTurnTimer(room.id, room.turnTime || 120);
        
        // Save to database
        saveRoomToSQLite(room);
        
        // Return updated state
        const gameState = {
            roomId: room.id,
            status: room.status,
            activePlayerId: room.players?.[room.activeIndex]?.userId || null,
            activeIndex: room.activeIndex,
            players: room.players || [],
            currentTurn: 1,
            phase: 'waiting',
            diceResult: null,
            pendingDeal: null,
            turnTimeLeft: getTurnTimeLeft(room.id),
            turnTime: room.turnTime || 120
        };
        
        res.json({ success: true, state: gameState });
    } catch (error) {
        console.error('Ошибка завершения хода:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/deals/choose', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        const { size } = req.body;
        
        // Simple deal simulation
        const deal = {
            id: Date.now().toString(),
            type: size === 'small' ? 'small_deal' : 'big_deal',
            name: size === 'small' ? 'Малая сделка' : 'Большая сделка',
            amount: size === 'small' ? 5000 : 50000,
            income: size === 'small' ? 500 : 5000,
            description: `Это ${size === 'small' ? 'малая' : 'большая'} сделка`
        };
        
        res.json({ 
            success: true, 
            deal,
            state: {
                roomId: room.id,
                status: room.status,
                activePlayerId: room.players?.[0]?.userId || null,
                players: room.players || [],
                currentTurn: 1,
                phase: 'dealing',
                diceResult: null,
                pendingDeal: {
                    stage: 'resolution',
                    card: deal,
                    playerId: room.players?.[0]?.userId || null
                }
            }
        });
    } catch (error) {
        console.error('Ошибка выбора сделки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/deals/resolve', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        const { action, deal } = req.body || {};

        // Apply effects: if user buys a deal, deduct cost and add passive income
        if (action === 'buy' && deal) {
            // Получаем активного игрока
            const activePlayerId = room.activePlayerId || room.players?.[0]?.userId;
            const player = (room.players || []).find(p => String(p.userId) === String(activePlayerId));
            if (player) {
                const dealCost = Number(deal.amount || deal.cost || 0);
                const dealIncome = Number(deal.income || 0);
                
                // Проверяем, достаточно ли денег у игрока
                if (player.cash < dealCost) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Недостаточно средств! Нужно: $${dealCost}, доступно: $${player.cash}` 
                    });
                }
                
                // Списываем деньги с баланса игрока
                player.cash = Math.max(0, player.cash - dealCost);
                
                // Добавляем пассивный доход
                player.passiveIncome = Number(player.passiveIncome || 0) + dealIncome;
                
                // Добавляем актив в портфель игрока
                if (!Array.isArray(player.assets)) player.assets = [];
                player.assets.push({
                    id: deal.id || Date.now().toString(),
                    name: deal.name || 'Сделка',
                    purchasePrice: dealCost,
                    monthlyIncome: dealIncome,
                    type: deal.type || 'smallDeal',
                });
            }
        }

        // Save to database
        saveRoomToSQLite(room);

        // Возвращаем обновленные данные игрока
        const response = { 
            success: true, 
            action,
            state: {
                roomId: room.id,
                status: room.status,
                activePlayerId: room.players?.[0]?.userId || null,
                players: room.players || [],
                currentTurn: 1,
                phase: 'waiting',
                diceResult: null,
                pendingDeal: null
            }
        };
        
        if (action === 'buy' && deal && player) {
            response.player = player;
        }
        
        res.json(response);
    } catch (error) {
        console.error('Ошибка разрешения сделки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/assets/transfer', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        res.json({ 
            success: true, 
            state: {
                roomId: room.id,
                status: room.status,
                activePlayerId: room.players?.[0]?.userId || null,
                players: room.players || [],
                currentTurn: 1,
                phase: 'waiting',
                diceResult: null,
                pendingDeal: null
            }
        });
    } catch (error) {
        console.error('Ошибка передачи актива:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/assets/sell', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        res.json({ 
            success: true, 
            state: {
                roomId: room.id,
                status: room.status,
                activePlayerId: room.players?.[0]?.userId || null,
                players: room.players || [],
                currentTurn: 1,
                phase: 'waiting',
                diceResult: null,
                pendingDeal: null
            }
        });
    } catch (error) {
        console.error('Ошибка продажи актива:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Resolve black loss event (one-time payment of expenses: 3x or 1x)
app.post('/api/rooms/:roomId/loss', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const userId = req.headers['x-user-id'] || req.body?.user_id;
        const activePlayer = room.players?.[room.activeIndex || 0] || null;
        if (!activePlayer || String(activePlayer.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }
        const base = Number(activePlayer?.profession?.expenses || 0);
        const child = Number(activePlayer?.children || 0) * 1000;
        const monthly = base + child;
        const mode = String(req.body?.mode || 'pay1'); // pay3 | pay1
        const amount = mode === 'pay3' ? monthly * 3 : monthly;
        if ((activePlayer.cash || 0) < amount) {
            return res.status(400).json({ success: false, message: 'Недостаточно средств. Возьмите кредит или уменьшите затраты.' });
        }
        activePlayer.cash -= amount;
        saveRoomToSQLite(room);
        res.json({ success: true, amountPaid: amount, mode });
    } catch (error) {
        console.error('Ошибка обработки black loss:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Activate charity benefit (pay 10% of total income to roll 1 or 2 dice for next 3 rolls)
app.post('/api/rooms/:roomId/charity', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const userId = req.headers['x-user-id'] || req.body?.user_id;
        const activePlayer = room.players?.[room.activeIndex || 0] || null;
        if (!activePlayer || String(activePlayer.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }
        const salary = Number(activePlayer?.profession?.salary || 0);
        const passive = Number(activePlayer?.passiveIncome || 0);
        const donation = Math.floor((salary + passive) * 0.10);
        if ((activePlayer.cash || 0) < donation) {
            return res.status(400).json({ success: false, message: 'Недостаточно средств для пожертвования' });
        }
        activePlayer.cash -= donation;
        activePlayer.charityTurns = 3;
        saveRoomToSQLite(room);
        res.json({ success: true, donation, charityTurns: activePlayer.charityTurns });
    } catch (error) {
        console.error('Ошибка благотворительности:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Main routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// Alias: /auth → /auth.html
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// Catch-all route
app.get('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Страница не найдена',
        requested: req.path,
        availableRoutes: [
            '/',
            '/auth.html',
            '/game/u/:username',
            '/health',
            '/api/health',
            '/api/auth/register',
            '/api/auth/login',
            '/api/user/profile/:username'
        ]
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Проверяем, что мы на Railway или принудительно включен режим Railway
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.FORCE_RAILWAY_MODE;
        
        // Initialize database first (only on Railway)
        if (isRailway) {
            await initializeSQLite();
        }
        
        app.listen(PORT, () => {
            console.log('🎮 EM1 Game Board v2.0 Production Server запущен!');
            console.log(`🚀 Сервер работает на порту ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 URL: ${process.env.RAILWAY_ENVIRONMENT ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`}`);
            
            if (isRailway) {
                console.log('🚂 Railway deployment detected');
                console.log(`💾 Database: ${dbConnected ? 'MongoDB Atlas + SQLite' : 'Memory only'}`);
            } else {
                console.log('💻 Local development mode');
                console.log(`💾 Database: ${dbConnected ? 'MongoDB Atlas' : 'Memory only'}`);
                console.log('⚠️ SQLite disabled for local development');
            }
            
            console.log('✅ Готов к обслуживанию файлов');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

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
