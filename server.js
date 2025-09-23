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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/game-board', express.static(path.join(__dirname, 'game-board')));

// In-memory storage for minimal functionality
const users = new Map();
const rooms = new Map();

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
    return {
        id: room.id,
        name: room.name,
        maxPlayers: room.maxPlayers,
        turnTime: room.turnTime,
        status: room.status,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        players: (room.players || []).map(p => ({
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
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, room: sanitizeRoom(room) });
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
            token,
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
            return res.status(401).json({ error: 'Неверный email или пароль' });
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
            token,
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

// Profile page route
app.get('/game/u/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-board', 'profile.html'));
});

// Room page route (for minimal prod)
app.get('/room/u/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
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
