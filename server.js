/**
 * EM1 Game Board v2.0 - Minimal Server for Railway
 * Упрощенный сервер для стабильного развертывания
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'em1-production-secret-key-2024-railway';

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Name']
}));
// Ensure preflight requests are handled
app.options('*', cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Name']
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

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/game-board', express.static(path.join(__dirname, 'game-board')));

// In-memory storage for minimal functionality
const users = new Map();
const rooms = new Map();
// In-memory banking
const bankBalances = new Map(); // key: roomId:username -> { amount }
const bankHistory = new Map();  // key: roomId -> [ { from, to, amount, timestamp } ]

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

// Create room (requires JWT)
app.post('/api/rooms', (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        }
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(403).json({ success: false, message: 'Недействительный токен' });
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
        const room = {
            id: Date.now().toString(),
            name,
            maxPlayers,
            turnTime: Math.max(1, Math.round((turnTimeSec || 120) / 60)),
            status: 'waiting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            players: [
                {
                    userId: String(payload.userId || payload.id || 'host'),
                    name: req.headers['x-user-name'] || (payload.email ? payload.email.split('@')[0] : 'Игрок'),
                    isHost: true,
                    isReady: false,
                    selectedToken: null,
                    selectedDream: null,
                    position: 0,
                    cash: 10000,
                    passiveIncome: 0,
                    assets: []
                }
            ]
        };
        rooms.set(room.id, room);
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

// Join room (requires JWT)
app.post('/api/rooms/:roomId/join', (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        }
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(403).json({ success: false, message: 'Недействительный токен' });
        }

        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }

        const userId = String(payload.userId || payload.id || 'guest');
        const already = (room.players || []).some(p => String(p.userId) === userId);
        if (!already) {
            if ((room.players || []).length >= room.maxPlayers) {
                return res.status(400).json({ success: false, message: 'Комната заполнена' });
            }
            room.players.push({
                userId,
                name: req.headers['x-user-name'] || (payload.email ? payload.email.split('@')[0] : 'Игрок'),
                isHost: false,
                isReady: false,
                selectedToken: null,
                selectedDream: null,
                position: 0,
                cash: 10000,
                passiveIncome: 0,
                assets: []
            });
            room.updatedAt = new Date().toISOString();
        }

        res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка присоединения к комнате:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Start game (requires JWT and host, and canStart)
app.post('/api/rooms/:roomId/start', (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        let payload;
        try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(403).json({ success: false, message: 'Недействительный токен' }); }
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const userId = String(payload.userId || payload.id || 'guest');
        const hostId = String(room.players?.[0]?.userId || '');
        const s = sanitizeRoom(room);
        if (userId !== hostId) {
            return res.status(403).json({ success: false, message: 'Только создатель комнаты может начать игру' });
        }
        if (!s.canStart) {
            return res.status(400).json({ success: false, message: 'Недостаточно готовых игроков' });
        }
        room.status = 'playing';
        room.updatedAt = new Date().toISOString();
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка запуска игры:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Select dream (requires JWT)
app.post('/api/rooms/:roomId/dream', (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        let payload;
        try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(403).json({ success: false, message: 'Недействительный токен' }); }
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const userId = String(payload.userId || payload.id || 'guest');
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) return res.status(400).json({ success: false, message: 'Игрок не в комнате' });
        const dreamId = req.body?.dream_id ?? req.body?.dreamId;
        player.selectedDream = dreamId ?? null;
        room.updatedAt = new Date().toISOString();
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка выбора мечты:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Select token (requires JWT)
app.post('/api/rooms/:roomId/token', (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        let payload;
        try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(403).json({ success: false, message: 'Недействительный токен' }); }
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const userId = String(payload.userId || payload.id || 'guest');
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) return res.status(400).json({ success: false, message: 'Игрок не в комнате' });
        const tokenId = req.body?.token_id ?? req.body?.tokenId;
        player.selectedToken = tokenId ?? null;
        room.updatedAt = new Date().toISOString();
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка выбора фишки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Toggle ready (requires JWT)
app.post('/api/rooms/:roomId/ready', (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        let payload;
        try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(403).json({ success: false, message: 'Недействительный токен' }); }
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const userId = String(payload.userId || payload.id || 'guest');
        const player = (room.players || []).find(p => String(p.userId) === userId);
        if (!player) return res.status(400).json({ success: false, message: 'Игрок не в комнате' });
        player.isReady = !player.isReady;
        room.updatedAt = new Date().toISOString();
        return res.json({ success: true, room: sanitizeRoom(room) });
    } catch (error) {
        console.error('Ошибка готовности:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ===== Banking API (minimal) =====
function getBalanceKey(roomId, username) {
    return `${roomId}:${username}`;
}

function ensureBalance(roomId, username, initial = 1000) {
    const key = getBalanceKey(roomId, username);
    if (!bankBalances.has(key)) {
        bankBalances.set(key, { amount: initial });
    }
    return bankBalances.get(key);
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
        const record = { from, to, amount: sum, roomId, timestamp: Date.now() };
        pushHistory(roomId, record);
        res.json({ success: true, newBalance: { amount: fromBal.amount }, record });
    } catch (error) {
        console.error('Ошибка перевода:', error);
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

// Minimal current user profile (tries token first, then X-User-Name header)
app.get('/api/user/profile', (req, res) => {
    try {
        let username = null;
        // Try JWT
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
            try {
                const payload = jwt.verify(token, JWT_SECRET);
                // Find by email or id
                for (let user of users.values()) {
                    if ((payload.email && user.email === payload.email) || String(user.id) === String(payload.userId)) {
                        return res.json({
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            createdAt: user.createdAt,
                            isActive: user.isActive
                        });
                    }
                }
            } catch (_) { /* ignore */ }
        }
        // Try header fallback
        username = req.headers['x-user-name'] || null;
        if (username) {
            for (let u of users.values()) {
                if (u.username === username || u.email === username) {
                    return res.json({
                        id: u.id,
                        username: u.username,
                        email: u.email,
                        createdAt: u.createdAt,
                        isActive: u.isActive
                    });
                }
            }
        }
        // Если нет токена и нет username в заголовках, возвращаем 404
        return res.status(404).json({ message: 'Пользователь не найден' });
    } catch (error) {
        console.error('Ошибка профиля:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Minimal user stats endpoint (public, no auth required)
app.get('/api/user/stats', (req, res) => {
    try {
        // Возвращаем базовые нули для минимальной реализации
        res.json({
            games_played: 0,
            wins_count: 0,
            level: 1,
            experience: 0,
            balance: 10000,
            userId: 'guest'
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

// Game state endpoints
app.get('/api/rooms/:roomId/game-state', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        // Return minimal game state for now
        const gameState = {
            roomId: room.id,
            status: room.status,
            activePlayerId: room.players?.[0]?.userId || null,
            players: room.players || [],
            currentTurn: 1,
            phase: 'waiting',
            diceResult: null,
            pendingDeal: null
        };
        
        res.json({ success: true, state: gameState });
    } catch (error) {
        console.error('Ошибка получения состояния игры:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/roll', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        // Simple dice roll simulation
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;
        const isDouble = dice1 === dice2;
        
        res.json({ 
            success: true, 
            result: { dice1, dice2, total, isDouble },
            state: {
                roomId: room.id,
                status: room.status,
                activePlayerId: room.players?.[0]?.userId || null,
                players: room.players || [],
                currentTurn: 1,
                phase: 'moving',
                diceResult: { dice1, dice2, total, isDouble },
                pendingDeal: null
            }
        });
    } catch (error) {
        console.error('Ошибка броска кубика:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/rooms/:roomId/end-turn', (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        // Simple turn end - just return current state
        const gameState = {
            roomId: room.id,
            status: room.status,
            activePlayerId: room.players?.[0]?.userId || null,
            players: room.players || [],
            currentTurn: 1,
            phase: 'waiting',
            diceResult: null,
            pendingDeal: null
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
        
        const { action } = req.body;
        
        // Simple deal resolution
        res.json({ 
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
        });
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

// Main routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth.html', (req, res) => {
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

// Start server
app.listen(PORT, () => {
    console.log('🎮 EM1 Game Board v2.0 Minimal Server запущен!');
    console.log(`🚀 Сервер работает на порту ${PORT}`);
    console.log(`📱 Локальный адрес: http://localhost:${PORT}`);
    console.log(`🌐 Railway адрес: https://em1-production.up.railway.app`);
    console.log('✅ Готов к обслуживанию файлов');
    console.log('💾 Используется in-memory хранилище');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, завершение работы...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Получен сигнал SIGINT, завершение работы...');
    process.exit(0);
});
