/**
 * Auth Module - микромодуль авторизации и профиля
 * Регистрирует все маршруты авторизации и профиля
 */

const jwt = require('jsonwebtoken');

function registerAuthModule({ app, db, jwtSecret, roomState }) {
    if (!app || !db || !jwtSecret) {
        throw new Error('Auth module requires app, db, and jwtSecret parameters');
    }
    
    // Получаем функции для работы с пользователями в памяти
    const { addUserToMemory, getUserFromMemory, getUserByEmailFromMemory, updateUserInMemory } = roomState || {};

    // Middleware для проверки JWT токена
    function authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Токен доступа отсутствует' });
        }

        try {
            const payload = jwt.verify(token, jwtSecret);
            req.user = payload;
            return next();
        } catch (error) {
            console.error('JWT verification failed:', error.message, 'Token:', token.substring(0, 20) + '...');
            if (error.name === 'JsonWebTokenError') {
                return res.status(403).json({ message: 'Недействительный токен' });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(403).json({ message: 'Токен истек' });
            } else {
                return res.status(403).json({ message: 'Ошибка проверки токена' });
            }
        }
    }

    // Функция для очистки данных пользователя
    function sanitizeUser(user) {
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
            is_active: plain.is_active ?? true,
            created_at: plain.created_at,
            updated_at: plain.updated_at
        };
    }

    // Регистрация пользователя
    app.post('/api/auth/register', async (req, res) => {
        const { email, password, first_name, last_name, referral_code } = req.body || {};
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }

        try {
            // Проверяем, существует ли пользователь
            const existingUser = await db.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
            }

            // Создаем нового пользователя
            const newUser = await db.createUser({
                email,
                password,
                first_name: first_name || '',
                last_name: last_name || '',
                balance: 10000,
                level: 1,
                experience: 0,
                games_played: 0,
                wins_count: 0,
                referrals_count: 0,
                referral_earnings: 0,
                is_active: true
            });
            
            // Сохраняем пользователя в память
            if (addUserToMemory) {
                addUserToMemory(newUser);
            }

            // Генерируем JWT токен
            const token = jwt.sign(
                { userId: newUser.id, email: newUser.email }, 
                jwtSecret, 
                { expiresIn: '24h' }
            );

            res.status(201).json({
                message: 'Пользователь успешно зарегистрирован',
                token,
                expiresIn: '24h',
                user: sanitizeUser(newUser)
            });

        } catch (error) {
            console.error('Ошибка регистрации:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    });

    // Вход пользователя
    app.post('/api/auth/login', async (req, res) => {
        const { email, password, rememberMe } = req.body || {};
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }

        try {
            console.log(`🔍 Попытка входа для email: ${email}`);
            
            // Сначала проверяем пользователя в памяти по email
            let user = getUserByEmailFromMemory ? getUserByEmailFromMemory(email) : null;
            console.log(`🔍 Поиск в памяти: ${user ? 'найден' : 'не найден'}`);
            
            // Если не найден в памяти, загружаем из базы данных
            if (!user) {
                console.log('🔍 Поиск в базе данных...');
                user = await db.getUserByEmail(email);
                if (user && addUserToMemory) {
                    console.log('💾 Сохраняем пользователя в память');
                    addUserToMemory(user);
                }
            }
            
            if (!user) {
                console.log('❌ Пользователь не найден ни в памяти, ни в базе данных');
                return res.status(401).json({ message: 'Пользователь не найден' });
            }
            
            console.log(`✅ Пользователь найден: ${user.email} (ID: ${user.id})`);

            // Проверяем пароль
            if (user.password !== password) {
                return res.status(401).json({ message: 'Неверный пароль' });
            }

            // Проверяем активность аккаунта
            if (!user.is_active) {
                return res.status(401).json({ message: 'Аккаунт заблокирован' });
            }

            // Генерируем JWT токен
            const token = jwt.sign(
                { userId: user.id, email: user.email }, 
                jwtSecret, 
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Успешный вход',
                token,
                expiresIn: '24h',
                user: sanitizeUser(user)
            });

        } catch (error) {
            console.error('Ошибка авторизации:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    });

    // Получение профиля пользователя
    app.get('/api/user/profile', authenticateToken, async (req, res) => {
        try {
            // Сначала проверяем пользователя в памяти
            let user = getUserFromMemory ? getUserFromMemory(req.user.userId) : null;
            
            // Если не найден в памяти, загружаем из базы данных
            if (!user) {
                user = await db.getUserById(req.user.userId);
                if (user && addUserToMemory) {
                    addUserToMemory(user);
                }
            }
            
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            res.json(sanitizeUser(user));
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    });

    // Получение статистики пользователя
    app.get('/api/user/stats', authenticateToken, async (req, res) => {
        try {
            const user = await db.getUserById(req.user.userId);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            
            res.json({
                games_played: user.games_played || 0,
                wins_count: user.wins_count || 0,
                level: user.level || 1,
                experience: user.experience || 0,
                balance: user.balance || 0
            });
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    });

    // Обновление профиля пользователя
    app.put('/api/user/profile', authenticateToken, async (req, res) => {
        try {
            const { first_name, last_name, username } = req.body || {};
            const userId = req.user.userId;

            // Обновляем данные пользователя
            const updatedUser = await db.updateUser(userId, {
                first_name: first_name || '',
                last_name: last_name || '',
                username: username || ''
            });

            if (!updatedUser) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            
            // Обновляем пользователя в памяти
            if (updateUserInMemory) {
                updateUserInMemory(userId, updatedUser);
            }

            res.json({
                message: 'Профиль обновлен',
                user: sanitizeUser(updatedUser)
            });

        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    });

    // Выход пользователя (опционально, так как JWT stateless)
    app.post('/api/auth/logout', authenticateToken, (req, res) => {
        res.json({ message: 'Успешный выход' });
    });

    return { sanitizeUser, authenticateToken };
}

module.exports = registerAuthModule;