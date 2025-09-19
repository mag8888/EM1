/**
 * Game Board v2.0 Server
 * Express сервер для развертывания на Railway
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

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

// API маршруты для Game Board
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Game Board v2.0',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// Маршрут для тестовой страницы
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-board.html'));
});

// Маршрут для банковского игрового поля
app.get('/test-banking', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-banking-board.html'));
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
            '/test-banking',
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

// Запуск сервера
app.listen(PORT, () => {
    console.log('🎮 Game Board v2.0 Server запущен!');
    console.log(`🚀 Сервер работает на порту ${PORT}`);
    console.log(`📱 Локальный адрес: http://localhost:${PORT}`);
    console.log(`🌐 Railway адрес: https://your-app.railway.app`);
    console.log('✅ Готов к обслуживанию файлов');
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
