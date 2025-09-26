#!/usr/bin/env node

/**
 * Тест генерации ссылки для входа в игру через Telegram
 */

require('dotenv').config();
const Keyboards = require('./keyboards');

function testGameLinkGeneration() {
    console.log('🔄 Testing game link generation...');
    
    // Тест без telegramId
    console.log('\n1. Тест без telegramId:');
    const keyboard1 = Keyboards.getPlayGameKeyboard();
    console.log('Ссылка:', keyboard1.reply_markup.inline_keyboard[0][0].url);
    
    // Тест с telegramId
    console.log('\n2. Тест с telegramId:');
    const testTelegramId = 123456789;
    const keyboard2 = Keyboards.getPlayGameKeyboard(testTelegramId);
    console.log('Ссылка:', keyboard2.reply_markup.inline_keyboard[0][0].url);
    
    // Тест с кастомным URL
    console.log('\n3. Тест с кастомным URL:');
    const customUrl = 'https://test.example.com';
    const keyboard3 = Keyboards.getPlayGameKeyboard(testTelegramId, customUrl);
    console.log('Ссылка:', keyboard3.reply_markup.inline_keyboard[0][0].url);
    
    console.log('\n✅ Тест завершен!');
}

// Запуск теста
testGameLinkGeneration();
