#!/usr/bin/env node

/**
 * Скрипт для запуска Telegram бота
 * Использование: node start-bot.js
 */

const TelegramBotApp = require('./index');

console.log('🚀 Запуск Telegram бота для игры "Энергия денег"...');
console.log('📋 Убедитесь, что настроены переменные окружения:');
console.log('   - BOT_TOKEN (токен Telegram бота)');
console.log('   - GAME_SERVER_URL (URL игрового сервера)');
console.log('');

// Проверка переменных окружения
if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'your_telegram_bot_token_here') {
    console.error('❌ Ошибка: Не настроен BOT_TOKEN');
    console.error('   Создайте бота через @BotFather и добавьте токен в переменные окружения');
    process.exit(1);
}

if (!process.env.GAME_SERVER_URL || process.env.GAME_SERVER_URL === 'http://localhost:3001') {
    console.warn('⚠️  Предупреждение: Используется локальный URL игрового сервера');
    console.warn('   Для продакшена измените GAME_SERVER_URL');
}

// Запуск бота
try {
    const app = new TelegramBotApp();
    
    // Получение информации о боте
    setTimeout(async () => {
        const botInfo = await app.getBotInfo();
        if (botInfo) {
            console.log(`✅ Бот @${botInfo.username} успешно запущен!`);
            console.log(`🔗 Ссылка на бота: https://t.me/${botInfo.username}`);
        }
    }, 2000);

} catch (error) {
    console.error('❌ Ошибка при запуске бота:', error.message);
    process.exit(1);
}

