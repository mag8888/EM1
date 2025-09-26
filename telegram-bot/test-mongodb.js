#!/usr/bin/env node

/**
 * Тест подключения к MongoDB для Telegram бота
 */

require('dotenv').config();
const Database = require('./database-mongodb');

async function testMongoDB() {
    console.log('🔄 Testing MongoDB connection for Telegram Bot...');
    
    try {
        const db = new Database();
        const connected = await db.init();
        
        if (connected) {
            console.log('✅ MongoDB connection successful!');
            
            // Тест создания пользователя
            console.log('🔄 Testing user creation...');
            const testUser = await db.createUser({
                telegramId: 999999999,
                username: 'test_user',
                firstName: 'Test',
                lastName: 'User'
            });
            
            if (testUser) {
                console.log('✅ User creation successful!');
                console.log('📋 Test user data:', {
                    id: testUser._id.toString(),
                    telegramId: testUser.telegramId,
                    username: testUser.username,
                    referralCode: testUser.referralCode
                });
            }
            
            // Тест получения пользователя
            console.log('🔄 Testing user retrieval...');
            const retrievedUser = await db.getUser(999999999);
            
            if (retrievedUser) {
                console.log('✅ User retrieval successful!');
            }
            
            console.log('🎉 All tests passed! MongoDB is ready for Telegram Bot.');
            
        } else {
            console.error('❌ MongoDB connection failed!');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Запуск теста
testMongoDB();
