const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://xqrmedia_db_user:9URuHWBY9lUQPOsj@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0';

// Добавляем более детальную обработку ошибок подключения
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => {
    console.log('MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code
    });
    
    // Если не удается подключиться к MongoDB, продолжаем работу без базы данных
    console.log('Continuing without database connection...');
});

// User Schema
const userSchema = new mongoose.Schema({
    telegram_id: { type: Number, required: false, sparse: true }, // sparse: true позволяет множественные null значения
    username: { type: String, default: '' },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 3000 },
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    games_played: { type: Number, default: 0 },
    wins_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true },
    referral_code: { type: String, unique: true },
    referred_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referrals_count: { type: Number, default: 0 },
    referral_earnings: { type: Number, default: 0 }
});

// Generate referral code
userSchema.pre('save', function(next) {
    if (!this.referral_code) {
        this.referral_code = 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
    next();
});

const User = mongoose.model('User', userSchema);

// Room Schema
const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creator_profession: { type: String, required: true },
    assign_professions: { type: Boolean, default: true },
    max_players: { type: Number, required: true, min: 2, max: 6 },
    password: { type: String, default: null },
    turn_time: { type: Number, required: true, default: 2, min: 1, max: 5 },
    players: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        profession: { type: String, default: null },
        profession_data: {
            name: { type: String, default: 'Предприниматель' },
            description: { type: String, default: 'Владелец успешного бизнеса' },
            salary: { type: Number, default: 10000 },
            expenses: { type: Number, default: 6200 },
            cash_flow: { type: Number, default: 3800 },
            debts: [{
                name: { type: String },
                monthly_payment: { type: Number },
                principal: { type: Number }
            }]
        },
        position: { type: Number, default: 0 },
        balance: { type: Number, default: 10000 },
        is_ready: { type: Boolean, default: false },
        selected_dream: { type: Number, default: null }
    }],
    game_started: { type: Boolean, default: false },
    game_start_time: { type: Date, default: null }, // Время начала игры
    current_player: { type: Number, default: 0 },
    game_data: {
        board_state: { type: mongoose.Schema.Types.Mixed, default: {} },
        cell_owners: { type: mongoose.Schema.Types.Mixed, default: {} },
        game_timer: { type: Number, default: 0 }
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Токен доступа не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        
        // Проверяем подключение к базе данных
        if (mongoose.connection.readyState !== 1) {
            console.log('Database connection state:', mongoose.connection.readyState);
            return res.status(503).json({ message: 'База данных недоступна. Попробуйте позже.' });
        }

        const { firstName, lastName, email, password, referralCode } = req.body;
        console.log('Registration data:', { firstName, lastName, email, referralCode });

        // Валидация данных
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
        }

        // Проверка существования пользователя
        const existingUser = await User.findOne({ email });
        console.log('Existing user check:', existingUser ? 'User exists' : 'User not found');

        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // Хеширование пароля
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Поиск реферера
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referral_code: referralCode });
            if (referrer) {
                referredBy = referrer._id;
                console.log('Referrer found:', referrer._id);
            }
        }

        // Создание пользователя
        console.log('Creating user...');
        const user = new User({
            first_name: firstName,
            last_name: lastName,
            email,
            password: hashedPassword,
            referred_by: referredBy
        });

        await user.save();
        console.log('User created successfully:', user._id);

        // Обновление статистики реферера
        if (referredBy) {
            await User.findByIdAndUpdate(referredBy, {
                $inc: { referrals_count: 1, referral_earnings: 100 }
            });
            console.log('Referrer stats updated');
        }

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (error) {
        console.error('Registration error details:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Ошибка сервера при регистрации',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Авторизация
app.post('/api/auth/login', async (req, res) => {
    try {
        // Проверяем подключение к базе данных
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'База данных недоступна. Попробуйте позже.' });
        }

        const { email, password } = req.body;

        // Поиск пользователя
        const user = await User.findOne({
            email
        });

        if (!user) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        // Проверка активности
        if (!user.is_active) {
            return res.status(401).json({ message: 'Аккаунт заблокирован' });
        }

        // Генерация токена
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                telegramId: user.telegram_id 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Возврат данных пользователя (без пароля)
        const userData = {
            id: user._id,
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            balance: user.balance,
            level: user.level,
            experience: user.experience,
            games_played: user.games_played,
            wins_count: user.wins_count,
            referral_code: user.referral_code,
            referrals_count: user.referrals_count,
            referral_earnings: user.referral_earnings,
            created_at: user.created_at
        };

        res.json({
            message: 'Успешная авторизация',
            token,
            user: userData
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Ошибка сервера при авторизации' });
    }
});

// Получение профиля пользователя
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
    }
});

// Обновление профиля пользователя
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, email, username } = req.body;
        
        // Проверка уникальности email
        if (email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: req.user.userId } 
            });
            if (existingUser) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            {
                first_name,
                last_name,
                email,
                username,
                updated_at: new Date()
            },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
    }
});

// Обновление баланса (для игровых операций)
app.put('/api/user/balance', authenticateToken, async (req, res) => {
    try {
        const { amount, operation } = req.body; // operation: 'add' или 'subtract'
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        let newBalance;
        if (operation === 'add') {
            newBalance = user.balance + amount;
        } else if (operation === 'subtract') {
            if (user.balance < amount) {
                return res.status(400).json({ message: 'Недостаточно средств' });
            }
            newBalance = user.balance - amount;
        } else {
            return res.status(400).json({ message: 'Неверная операция' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { 
                balance: newBalance,
                updated_at: new Date()
            },
            { new: true }
        ).select('-password');

        res.json({ 
            message: 'Баланс обновлен',
            balance: updatedUser.balance 
        });
    } catch (error) {
        console.error('Balance update error:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении баланса' });
    }
});

// Получение статистики пользователя
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const stats = {
            level: user.level,
            experience: user.experience,
            balance: user.balance,
            games_played: user.games_played,
            wins_count: user.wins_count,
            referrals_count: user.referrals_count,
            referral_earnings: user.referral_earnings,
            win_rate: user.games_played > 0 ? (user.wins_count / user.games_played * 100).toFixed(1) : 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении статистики' });
    }
});

// Обновление игровой статистики
app.post('/api/user/game-result', authenticateToken, async (req, res) => {
    try {
        const { won, experience_gained } = req.body;
        
        const updateData = {
            games_played: 1,
            updated_at: new Date()
        };

        if (won) {
            updateData.wins_count = 1;
        }

        if (experience_gained) {
            updateData.experience = experience_gained;
        }

        await User.findByIdAndUpdate(req.user.userId, {
            $inc: updateData
        });

        res.json({ message: 'Статистика обновлена' });
    } catch (error) {
        console.error('Game result update error:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении статистики' });
    }
});

// Room API endpoints

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const { user_id } = req.query;
        
        // Удаляем старые комнаты (старше 6 часов)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        await Room.deleteMany({ 
            created_at: { $lt: sixHoursAgo }
        });
        
        const rooms = await Room.find({ game_started: false })
            .populate('creator_id', 'first_name last_name')
            .sort({ created_at: -1 })
            .limit(20);
            
        console.log('Found rooms in lobby:', rooms.length);
        rooms.forEach(room => {
            console.log('Room in lobby:', {
                id: room._id,
                name: room.name,
                game_started: room.game_started,
                players_count: room.players.length,
                created_at: room.created_at
            });
        });
        
        const roomsData = rooms.map(room => ({
            id: room._id,
            name: room.name,
            creator_name: `${room.creator_id.first_name} ${room.creator_id.last_name}`,
            creator_profession: room.creator_profession,
            assign_professions: room.assign_professions,
            max_players: room.max_players,
            password: room.password ? true : false,
            turn_time: room.turn_time,
            players: room.players,
            game_started: room.game_started,
            created_at: room.created_at
        }));
        
        res.json(roomsData);
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка комнат' });
    }
});

// Create room
app.post('/api/rooms/create', async (req, res) => {
    try {
        const { name, creator_id, creator_profession, assign_professions, max_players, turn_time, password } = req.body;
        
        // Validate input
        if (!name || !creator_id || !creator_profession || !max_players || !turn_time) {
            return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
        }
        
        if (max_players < 2 || max_players > 6) {
            return res.status(400).json({ message: 'Количество игроков должно быть от 2 до 6' });
        }
        
        if (turn_time < 1 || turn_time > 5) {
            return res.status(400).json({ message: 'Время на ход должно быть от 1 до 5 минут' });
        }
        
        // Get user data
        const user = await User.findById(creator_id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        
        // Create room with entrepreneur profession data
        const entrepreneurData = {
            name: 'Предприниматель',
            description: 'Владелец успешного бизнеса',
            salary: 10000,
            expenses: 6200,
            cash_flow: 3800,
            debts: [
                { name: 'Налоги', monthly_payment: 1300, principal: 0 },
                { name: 'Прочие расходы', monthly_payment: 1500, principal: 0 },
                { name: 'Кредит на авто', monthly_payment: 700, principal: 14000 },
                { name: 'Образовательный кредит', monthly_payment: 500, principal: 10000 },
                { name: 'Ипотека', monthly_payment: 1200, principal: 240000 },
                { name: 'Кредитные карты', monthly_payment: 1000, principal: 20000 }
            ]
        };

        console.log('Creating room with turn_time:', turn_time, 'type:', typeof turn_time);
        
        const room = new Room({
            name,
            creator_id: creator_id,
            creator_profession,
            assign_professions: assign_professions !== false, // Default to true
            max_players,
            password: password || null,
            turn_time,
            players: [{
                user_id: creator_id,
                name: `${user.first_name} ${user.last_name}`,
                profession: creator_profession,
                profession_data: entrepreneurData,
                position: 0,
                balance: 10000,
                is_ready: false
            }]
        });
        
        await room.save();
        
        console.log('Room created successfully:', {
            id: room._id,
            name: room.name,
            creator_id: room.creator_id,
            players_count: room.players.length,
            created_at: room.created_at
        });
        
        res.status(201).json({ 
            message: 'Комната успешно создана',
            room_id: room._id
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ message: 'Ошибка сервера при создании комнаты' });
    }
});

// Join room
app.post('/api/rooms/join', async (req, res) => {
    try {
        const { room_id, user_id, password } = req.body;
        
        if (!room_id || !user_id) {
            return res.status(400).json({ message: 'ID комнаты и пользователя обязательны' });
        }
        
        // Find room
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        if (room.game_started) {
            return res.status(400).json({ message: 'Игра уже началась' });
        }
        
        if (room.players.length >= room.max_players) {
            return res.status(400).json({ message: 'Комната заполнена' });
        }
        
        // Check password
        if (room.password && room.password !== password) {
            return res.status(401).json({ message: 'Неверный пароль комнаты' });
        }
        
        // Check if user is already in room
        const existingPlayer = room.players.find(p => p.user_id.toString() === user_id);
        if (existingPlayer) {
            return res.status(200).json({ 
                message: 'Вы уже находитесь в этой комнате',
                room_id: room_id,
                redirect: true
            });
        }
        
        // Get user data
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        
        // Add player to room with entrepreneur data
        const entrepreneurData = {
            name: 'Предприниматель',
            description: 'Владелец успешного бизнеса',
            salary: 10000,
            expenses: 6200,
            cash_flow: 3800,
            debts: [
                { name: 'Налоги', monthly_payment: 1300, principal: 0 },
                { name: 'Прочие расходы', monthly_payment: 1500, principal: 0 },
                { name: 'Кредит на авто', monthly_payment: 700, principal: 14000 },
                { name: 'Образовательный кредит', monthly_payment: 500, principal: 10000 },
                { name: 'Ипотека', monthly_payment: 1200, principal: 240000 },
                { name: 'Кредитные карты', monthly_payment: 1000, principal: 20000 }
            ]
        };

        const newPlayer = {
            user_id: user_id,
            name: `${user.first_name} ${user.last_name}`,
            profession: room.assign_professions ? room.creator_profession : null,
            profession_data: room.assign_professions ? entrepreneurData : null,
            position: 0,
            balance: 10000,
            is_ready: false
        };
        
        room.players.push(newPlayer);
        room.updated_at = new Date();
        
        await room.save();
        
        res.json({ 
            message: 'Успешно присоединились к комнате',
            room_id: room._id
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ message: 'Ошибка сервера при присоединении к комнате' });
    }
});

// Quick join
app.post('/api/rooms/quick-join', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ message: 'ID пользователя обязателен' });
        }
        
        // Find a room with available slots
        const room = await Room.findOne({
            game_started: false,
            password: null,
            $expr: { $lt: [{ $size: '$players' }, '$max_players'] }
        }).sort({ created_at: -1 });
        
        if (!room) {
            return res.status(404).json({ message: 'Нет доступных комнат для быстрого присоединения' });
        }
        
        // Check if user is already in this room
        const existingPlayer = room.players.find(p => p.user_id.toString() === user_id);
        if (existingPlayer) {
            return res.json({ room_id: room._id });
        }
        
        // Get user data
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        
        // Add player to room with entrepreneur data
        const entrepreneurData = {
            name: 'Предприниматель',
            description: 'Владелец успешного бизнеса',
            salary: 10000,
            expenses: 6200,
            cash_flow: 3800,
            debts: [
                { name: 'Налоги', monthly_payment: 1300, principal: 0 },
                { name: 'Прочие расходы', monthly_payment: 1500, principal: 0 },
                { name: 'Кредит на авто', monthly_payment: 700, principal: 14000 },
                { name: 'Образовательный кредит', monthly_payment: 500, principal: 10000 },
                { name: 'Ипотека', monthly_payment: 1200, principal: 240000 },
                { name: 'Кредитные карты', monthly_payment: 1000, principal: 20000 }
            ]
        };

        const newPlayer = {
            user_id: user_id,
            name: `${user.first_name} ${user.last_name}`,
            profession: room.assign_professions ? room.creator_profession : null,
            profession_data: room.assign_professions ? entrepreneurData : null,
            position: 0,
            balance: 10000,
            is_ready: false
        };
        
        room.players.push(newPlayer);
        room.updated_at = new Date();
        
        await room.save();
        
        res.json({ room_id: room._id });
    } catch (error) {
        console.error('Quick join error:', error);
        res.status(500).json({ message: 'Ошибка сервера при быстром присоединении' });
    }
});

// Get room details
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const { user_id } = req.query;
        
        const room = await Room.findById(req.params.id)
            .populate('creator_id', 'first_name last_name');
        
        if (!room) {
            console.log('Room not found in GET /api/rooms/:id:', req.params.id);
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        console.log('Room found in GET /api/rooms/:id:', {
            id: room._id,
            name: room.name,
            game_started: room.game_started,
            game_start_time: room.game_start_time,
            players_count: room.players.length,
            created_at: room.created_at
        });
        
        // Check if user is in this room
        const userInRoom = user_id ? room.players.find(p => p.user_id.toString() === user_id) : null;
        if (!userInRoom) {
            return res.status(403).json({ message: 'Вы не являетесь участником этой комнаты' });
        }
        
        res.json({
            id: room._id,
            name: room.name,
            creator_id: room.creator_id._id,
            creator_name: `${room.creator_id.first_name} ${room.creator_id.last_name}`,
            creator_profession: room.creator_profession,
            assign_professions: room.assign_professions,
            max_players: room.max_players,
            turn_time: room.turn_time,
            players: room.players,
            game_started: room.game_started,
            game_start_time: room.game_start_time,
            current_player: room.current_player,
            game_data: room.game_data,
            created_at: room.created_at
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении данных комнаты' });
    }
});

// Toggle player ready status
app.post('/api/rooms/:id/ready', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ message: 'ID пользователя обязателен' });
        }
        
        const room = await Room.findById(req.params.id);
        
        if (!room) {
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        if (room.game_started) {
            return res.status(400).json({ message: 'Игра уже началась' });
        }
        
        // Find player in room
        const playerIndex = room.players.findIndex(p => p.user_id.toString() === user_id);
        if (playerIndex === -1) {
            return res.status(403).json({ message: 'Вы не являетесь участником этой комнаты' });
        }
        
        // Toggle ready status
        room.players[playerIndex].is_ready = !room.players[playerIndex].is_ready;
        room.updated_at = new Date();
        
        await room.save();
        
        res.json({ 
            message: `Статус готовности изменен на ${room.players[playerIndex].is_ready ? 'готов' : 'не готов'}`,
            is_ready: room.players[playerIndex].is_ready
        });
    } catch (error) {
        console.error('Toggle ready error:', error);
        res.status(500).json({ message: 'Ошибка сервера при изменении статуса готовности' });
    }
});

// Leave room
app.post('/api/rooms/:id/leave', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ message: 'ID пользователя обязателен' });
        }
        
        const room = await Room.findById(req.params.id);
        
        if (!room) {
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        if (room.game_started) {
            return res.status(400).json({ message: 'Нельзя покинуть комнату во время игры' });
        }
        
        // Remove player from room
        room.players = room.players.filter(p => p.user_id.toString() !== user_id);
        room.updated_at = new Date();
        
        // Save room without deleting it
        await room.save();
        res.json({ message: 'Вы покинули комнату' });
    } catch (error) {
        console.error('Leave room error:', error);
        res.status(500).json({ message: 'Ошибка сервера при выходе из комнаты' });
    }
});

// Save player dream selection
app.post('/api/rooms/:id/dream', async (req, res) => {
    try {
        const { user_id, dream_id } = req.body;
        
        if (!user_id || !dream_id) {
            return res.status(400).json({ message: 'ID пользователя и мечты обязательны' });
        }
        
        const room = await Room.findById(req.params.id);
        
        if (!room) {
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        // Find player in room
        const playerIndex = room.players.findIndex(p => p.user_id.toString() === user_id);
        if (playerIndex === -1) {
            return res.status(403).json({ message: 'Вы не являетесь участником этой комнаты' });
        }
        
        // Update player's dream
        room.players[playerIndex].selected_dream = dream_id;
        room.updated_at = new Date();
        
        await room.save();
        
        res.json({ message: 'Мечта сохранена' });
    } catch (error) {
        console.error('Save dream error:', error);
        res.status(500).json({ message: 'Ошибка сервера при сохранении мечты' });
    }
});

// Start game
app.post('/api/rooms/:id/start', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ message: 'ID пользователя обязателен' });
        }
        
        const room = await Room.findById(req.params.id);
        
        if (!room) {
            console.log('Room not found in POST /api/rooms/:id/start:', req.params.id);
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        console.log('Room found for start game:', {
            id: room._id,
            name: room.name,
            game_started: room.game_started,
            players_count: room.players.length
        });
        
        // Check if user is the creator
        if (room.creator_id.toString() !== user_id) {
            return res.status(403).json({ message: 'Только создатель комнаты может начать игру' });
        }
        
        // Check if game is already started
        if (room.game_started) {
            return res.status(400).json({ message: 'Игра уже началась' });
        }
        
        // Check if there are at least 2 players
        if (room.players.length < 2) {
            return res.status(400).json({ message: 'Недостаточно игроков для начала игры' });
        }
        
        // Check if at least 2 players are ready
        const readyPlayers = room.players.filter(p => p.is_ready).length;
        if (readyPlayers < 2) {
            return res.status(400).json({ message: 'Недостаточно готовых игроков для начала игры' });
        }
        
        // Start the game
        room.game_started = true;
        room.game_start_time = new Date(); // Время начала игры
        room.current_player = 0;
        room.turn_start_time = new Date(); // Время начала хода
        
        // Принудительно устанавливаем turn_start_time
        console.log('Setting turn_start_time to:', room.turn_start_time);
        room.game_data = {
            player_positions: new Array(room.players.length).fill(0),
            player_balances: new Array(room.players.length).fill(10000), // Начальный баланс
            player_finances: new Array(room.players.length).fill({
                totalIncome: 0,
                totalExpenses: 0,
                monthlyIncome: 0,
                currentCredit: 0,
                maxCredit: 10000
            }),
            transfers_history: []
        };
        room.updated_at = new Date();
        
        console.log('Starting game with turn_time:', room.turn_time, 'type:', typeof room.turn_time);
        console.log('Game start time set to:', room.game_start_time);
        console.log('Turn start time set to:', room.turn_start_time);
        
        await room.save();
        
        console.log('Room saved successfully, ID:', room._id);
        
        // Проверяем, что turn_start_time сохранился
        const savedRoom = await Room.findById(room._id);
        console.log('Saved room turn_start_time:', savedRoom.turn_start_time);
        
        res.json({ message: 'Игра началась!' });
    } catch (error) {
        console.error('Start game error:', error);
        res.status(500).json({ message: 'Ошибка сервера при запуске игры' });
    }
});

// Transfer funds between players
app.post('/api/rooms/:id/transfer', async (req, res) => {
    try {
        const { user_id, recipient_index, amount } = req.body;
        
        console.log('Transfer request:', { user_id, recipient_index, amount, room_id: req.params.id });
        
        if (!user_id || recipient_index === undefined || !amount) {
            return res.status(400).json({ message: 'Все поля обязательны' });
        }
        
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        console.log('Room found:', { 
            game_started: room.game_started, 
            players_count: room.players.length,
            has_game_data: !!room.game_data 
        });
        
        if (!room.game_started) {
            return res.status(400).json({ message: 'Игра еще не началась' });
        }
        
        // Find sender and recipient
        const senderIndex = room.players.findIndex(p => p.user_id.toString() === user_id);
        if (senderIndex === -1) {
            return res.status(403).json({ message: 'Вы не являетесь участником этой комнаты' });
        }
        
        if (recipient_index < 0 || recipient_index >= room.players.length) {
            return res.status(400).json({ message: 'Неверный индекс получателя' });
        }
        
        if (senderIndex === recipient_index) {
            return res.status(400).json({ message: 'Нельзя переводить средства самому себе' });
        }
        
        // Initialize game data if not exists
        if (!room.game_data) {
            console.log('Initializing game_data for room');
            room.game_data = {
                player_positions: new Array(room.players.length).fill(0),
                player_balances: new Array(room.players.length).fill(10000),
                player_finances: new Array(room.players.length).fill({
                    totalIncome: 0,
                    totalExpenses: 0,
                    monthlyIncome: 0,
                    currentCredit: 0,
                    maxCredit: 10000
                }),
                transfers_history: []
            };
        }
        
        console.log('Game data:', {
            player_balances: room.game_data.player_balances,
            sender_index: senderIndex,
            recipient_index: recipient_index
        });
        
        // Check sufficient funds
        if (room.game_data.player_balances[senderIndex] < amount) {
            return res.status(400).json({ message: 'Недостаточно средств для перевода' });
        }
        
        // Execute transfer
        room.game_data.player_balances[senderIndex] -= amount;
        room.game_data.player_balances[recipient_index] += amount;
        
        // Add to transfer history
        const transfer = {
            sender: room.players[senderIndex].name || `Игрок ${senderIndex + 1}`,
            recipient: room.players[recipient_index].name || `Игрок ${recipient_index + 1}`,
            amount: amount,
            timestamp: new Date(),
            sender_index: senderIndex,
            recipient_index: recipient_index
        };
        
        if (!room.game_data.transfers_history) {
            room.game_data.transfers_history = [];
        }
        room.game_data.transfers_history.unshift(transfer);
        
        await room.save();
        
        console.log('Transfer completed successfully');
        res.json({ 
            message: 'Перевод выполнен успешно',
            new_balance: room.game_data.player_balances[senderIndex],
            transfer: transfer
        });
    } catch (error) {
        console.error('Transfer error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ message: 'Ошибка сервера при выполнении перевода' });
    }
});

// Маршруты для HTML страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/table', (req, res) => {
    res.sendFile(path.join(__dirname, 'table.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/bank', (req, res) => {
    res.sendFile(path.join(__dirname, 'bank.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'lobby.html'));
});

app.get('/room/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
});

// Запуск сервера
// Get current turn info
app.get('/api/rooms/:id/turn', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            console.log('Room not found for turn info:', req.params.id);
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        console.log('Room found for turn info:', {
            id: room._id,
            name: room.name,
            game_started: room.game_started,
            game_start_time: room.game_start_time,
            players_count: room.players.length
        });

        if (!room.game_started) {
            return res.status(400).json({ message: 'Игра еще не началась' });
        }

        const now = new Date();
        
        // Проверяем и инициализируем turn_start_time только если игра только что началась
        if (!room.turn_start_time && room.game_started) {
            console.log('turn_start_time is null for started game, initializing...');
            room.turn_start_time = room.game_start_time || new Date();
            await room.save();
            console.log('turn_start_time initialized and saved:', room.turn_start_time);
        }
        
        const turnStartTime = new Date(room.turn_start_time);
        const elapsedSeconds = Math.floor((now - turnStartTime) / 1000);
        const turnDuration = room.turn_time * 60; // turn_time в минутах, конвертируем в секунды
        const remainingSeconds = Math.max(0, turnDuration - elapsedSeconds);
        const isTurnExpired = remainingSeconds <= 0;

        console.log('Turn info debug:', {
            roomId: req.params.id,
            turn_time: room.turn_time,
            turn_start_time: room.turn_start_time,
            turnStartTime: turnStartTime,
            now: now,
            turnDuration: turnDuration,
            elapsedSeconds: elapsedSeconds,
            remainingSeconds: remainingSeconds,
            isTurnExpired: isTurnExpired
        });

        // Если ход истек, автоматически переходим к следующему игроку
        if (isTurnExpired) {
            console.log('Turn expired, transitioning to next player');
            room.current_player = (room.current_player + 1) % room.players.length;
            room.turn_start_time = new Date();
            room.updated_at = new Date();
            await room.save();
            console.log('Turn transitioned to player', room.current_player, 'at', room.turn_start_time);
            
            // Пересчитываем время для нового хода
            const newTurnStartTime = new Date(room.turn_start_time);
            const newElapsedSeconds = Math.floor((now - newTurnStartTime) / 1000);
            const newRemainingSeconds = Math.max(0, turnDuration - newElapsedSeconds);
            
            res.json({
                current_player: room.current_player,
                turn_start_time: room.turn_start_time,
                elapsed_seconds: newElapsedSeconds,
                remaining_seconds: newRemainingSeconds,
                turn_duration: turnDuration,
                is_turn_expired: false
            });
        } else {
            res.json({
                current_player: room.current_player,
                turn_start_time: room.turn_start_time,
                elapsed_seconds: elapsedSeconds,
                remaining_seconds: remainingSeconds,
                turn_duration: turnDuration,
                is_turn_expired: isTurnExpired
            });
        }
    } catch (error) {
        console.error('Get turn info error:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении информации о ходе' });
    }
});

// Next turn
app.post('/api/rooms/:id/next-turn', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ message: 'user_id обязателен' });
        }

        const room = await Room.findById(req.params.id);
        if (!room) {
            console.log('Room not found in POST /api/rooms/:id/next-turn:', req.params.id);
            return res.status(404).json({ message: 'Комната не найдена' });
        }
        
        console.log('Room found for next turn:', {
            id: room._id,
            name: room.name,
            game_started: room.game_started,
            current_player: room.current_player,
            players_count: room.players.length
        });

        if (!room.game_started) {
            return res.status(400).json({ message: 'Игра еще не началась' });
        }

        // Проверяем, что это ход текущего игрока
        const playerIndex = room.players.findIndex(p => p.user_id.toString() === user_id);
        if (playerIndex !== room.current_player) {
            return res.status(403).json({ message: 'Не ваш ход' });
        }

        // Переходим к следующему игроку
        console.log('Manual turn transition from player', room.current_player, 'to next player');
        room.current_player = (room.current_player + 1) % room.players.length;
        room.turn_start_time = new Date();
        room.updated_at = new Date();

        await room.save();
        console.log('Turn manually transitioned to player', room.current_player, 'at', room.turn_start_time);

        res.json({ 
            message: 'Ход передан следующему игроку',
            current_player: room.current_player,
            turn_start_time: room.turn_start_time
        });
    } catch (error) {
        console.error('Next turn error:', error);
        res.status(500).json({ message: 'Ошибка сервера при переходе хода' });
    }
});

// Функция для очистки старых комнат (старше 6 часов)
async function cleanupOldRooms() {
    console.log('CLEANUP FUNCTION CALLED - THIS SHOULD NOT HAPPEN!');
    try {
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        
        // Удаляем комнаты, где игра началась более 6 часов назад
        // ИЛИ комнаты без игроков старше 1 часа
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
        
        const result = await Room.deleteMany({
            $or: [
                // Игра началась более 6 часов назад
                {
                    game_started: true,
                    game_start_time: { $lt: sixHoursAgo }
                },
                // Комната без игроков старше 1 часа (игра не началась)
                {
                    game_started: false,
                    players: { $size: 0 },
                    created_at: { $lt: oneHourAgo }
                }
            ]
        });
        
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} old rooms`);
        }
        
        // Отладочная информация
        const totalRooms = await Room.countDocuments();
        const activeGames = await Room.countDocuments({ game_started: true });
        const emptyRooms = await Room.countDocuments({ players: { $size: 0 } });
        
        console.log(`Room stats: Total=${totalRooms}, Active games=${activeGames}, Empty=${emptyRooms}`);
    } catch (error) {
        console.error('Error cleaning up old rooms:', error);
    }
}

// Запускаем очистку каждые 30 минут (отключено для отладки)
// setInterval(cleanupOldRooms, 30 * 60 * 1000);

// Запускаем очистку при старте сервера (отключено для отладки)
// cleanupOldRooms();

// API для ручной очистки старых комнат
app.post('/api/admin/cleanup-rooms', async (req, res) => {
    try {
        await cleanupOldRooms();
        res.json({ message: 'Очистка комнат выполнена' });
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({ message: 'Ошибка при очистке комнат' });
    }
});

// API для исправления turn_start_time в существующих комнатах
app.post('/api/admin/fix-turn-start-time', async (req, res) => {
    try {
        const rooms = await Room.find({ 
            game_started: true, 
            turn_start_time: null 
        });
        
        console.log(`Found ${rooms.length} rooms with null turn_start_time`);
        
        for (const room of rooms) {
            room.turn_start_time = room.game_start_time || new Date();
            await room.save();
            console.log(`Fixed turn_start_time for room ${room._id}: ${room.turn_start_time}`);
        }
        
        res.json({ 
            message: `Fixed turn_start_time for ${rooms.length} rooms`,
            fixed_rooms: rooms.length
        });
    } catch (error) {
        console.error('Fix turn_start_time error:', error);
        res.status(500).json({ message: 'Ошибка при исправлении turn_start_time' });
    }
});

// API для отладки - получить все комнаты
app.get('/api/admin/all-rooms', async (req, res) => {
    try {
        const allRooms = await Room.find({})
            .populate('creator_id', 'first_name last_name')
            .sort({ created_at: -1 });
            
        console.log('All rooms in database:', allRooms.length);
        allRooms.forEach(room => {
            console.log('Room in DB:', {
                id: room._id,
                name: room.name,
                game_started: room.game_started,
                game_start_time: room.game_start_time,
                players_count: room.players.length,
                created_at: room.created_at
            });
        });
        
        res.json({
            total: allRooms.length,
            rooms: allRooms.map(room => ({
                id: room._id,
                name: room.name,
                game_started: room.game_started,
                game_start_time: room.game_start_time,
                players_count: room.players.length,
                created_at: room.created_at
            }))
        });
    } catch (error) {
        console.error('Get all rooms error:', error);
        res.status(500).json({ message: 'Ошибка при получении всех комнат' });
    }
});

// Функция очистки старых комнат
async function cleanupOldRooms() {
    try {
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const deletedRooms = await Room.deleteMany({ 
            created_at: { $lt: sixHoursAgo }
        });
        
        if (deletedRooms.deletedCount > 0) {
            console.log(`Очищено ${deletedRooms.deletedCount} старых комнат`);
        }
    } catch (error) {
        console.error('Ошибка при очистке старых комнат:', error);
    }
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI}`);
    console.log('Room cleanup scheduled every 30 minutes');
    
    // Очищаем старые комнаты при запуске
    cleanupOldRooms();
    
    // Очищаем старые комнаты каждые 30 минут
    setInterval(cleanupOldRooms, 30 * 60 * 1000);
});
