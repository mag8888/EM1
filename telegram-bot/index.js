const TelegramBot = require('node-telegram-bot-api');
const Database = require('./database');
const Handlers = require('./handlers');
const config = require('./config');

class TelegramBotApp {
    constructor() {
        this.bot = new TelegramBot(config.BOT_TOKEN, { polling: true });
        this.db = new Database();
        this.handlers = new Handlers(this.bot, this.db);
        
        console.log('🤖 Telegram Bot запущен!');
        console.log('📊 База данных инициализирована');
        
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        this.bot.on('error', (error) => {
            console.error('Bot error:', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
        });
    }

    // Метод для отправки уведомлений
    async sendNotification(userId, message) {
        try {
            await this.bot.sendMessage(userId, message);
        } catch (error) {
            console.error(`Failed to send notification to ${userId}:`, error);
        }
    }

    // Метод для получения информации о боте
    async getBotInfo() {
        try {
            const me = await this.bot.getMe();
            console.log(`Bot @${me.username} is running`);
            return me;
        } catch (error) {
            console.error('Failed to get bot info:', error);
            return null;
        }
    }

    // Метод для остановки бота
    stop() {
        this.bot.stopPolling();
        this.db.close();
        console.log('🛑 Telegram Bot остановлен');
    }
}

// Запуск приложения
const app = new TelegramBotApp();

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал SIGINT. Завершение работы...');
    app.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM. Завершение работы...');
    app.stop();
    process.exit(0);
});

// Экспорт для использования в других модулях
module.exports = TelegramBotApp;

