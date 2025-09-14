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
const MONGODB_URI = 'mongodb+srv://xqrmedia_db_user:aInHJMSt5gFkf8uk@cluster0.mongodb.net/energy_money_game?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    telegram_id: { type: Number, unique: true, required: false },
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
        const { firstName, lastName, email, password, referralCode } = req.body;

        // Проверка существования пользователя
        const existingUser = await User.findOne({
            email
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Поиск реферера
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referral_code: referralCode });
            if (referrer) {
                referredBy = referrer._id;
            }
        }

        // Создание пользователя
        const user = new User({
            first_name: firstName,
            last_name: lastName,
            email,
            password: hashedPassword,
            referred_by: referredBy
        });

        await user.save();

        // Обновление статистики реферера
        if (referredBy) {
            await User.findByIdAndUpdate(referredBy, {
                $inc: { referrals_count: 1, referral_earnings: 100 }
            });
        }

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
});

// Авторизация
app.post('/api/auth/login', async (req, res) => {
    try {
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI}`);
});
