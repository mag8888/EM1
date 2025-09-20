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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 8080;

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
app.use(express.json());

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

// Маршрут для тестовой страницы
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-board.html'));
});

// Маршрут для документации
app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'README.md'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Страница не найдена',
        availableRoutes: [
            '/',
            '/auth',
            '/lobby', 
            '/game',
            '/test',
            '/docs',
            '/api/health'
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

// WebSocket подключения
io.on('connection', (socket) => {
    console.log('👤 Пользователь подключился:', socket.id);
    
    // Присоединение к комнате
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`🏠 Пользователь ${socket.id} присоединился к комнате ${roomId}`);
        
        // Отправляем обновленные балансы всем в комнате
        const balances = {};
        Object.keys(bankData.balances).forEach(key => {
            const [userId, userRoomId] = key.split('_');
            if (userRoomId === roomId) {
                balances[userId] = bankData.balances[key];
            }
        });
        
        socket.to(roomId).emit('roomUpdate', {
            type: 'userJoined',
            userId: socket.id,
            balances
        });
    });
    
    // Отключение от комнаты
    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`🚪 Пользователь ${socket.id} покинул комнату ${roomId}`);
    });
    
    // Отключение
    socket.on('disconnect', () => {
        console.log('👋 Пользователь отключился:', socket.id);
    });
});

// Запуск сервера
async function startServer() {
    try {
        // Initialize database first
        await initializeDatabase();
        
        // Start server
        server.listen(PORT, () => {
            console.log('🎮 Game Board v2.0 Server запущен!');
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
