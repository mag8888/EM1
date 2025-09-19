const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('.'));

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

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple.html'));
});

app.get('/status', (req, res) => {
    res.sendFile(path.join(__dirname, 'status.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-server.html'));
});

app.get('/working', (req, res) => {
    res.sendFile(path.join(__dirname, 'working.html'));
});

// API маршруты для Telegram бота
app.get('/api/rooms', (req, res) => {
    res.json([]);
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
