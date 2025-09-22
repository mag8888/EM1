#!/usr/bin/env node

/**
 * Тест системы сохранения данных
 * Проверяет, что комнаты и игроки сохраняются в базе данных
 */

const Database = require('./database-sqlite');
const roomState = require('./services/room-state');

async function testPersistence() {
    console.log('🧪 === ТЕСТ СИСТЕМЫ СОХРАНЕНИЯ ДАННЫХ ===\n');
    
    // Инициализируем базу данных
    const db = new Database();
    await db.init();
    console.log('✅ База данных инициализирована');
    
    // Устанавливаем ссылку на базу в room-state
    const { setDatabase, forceSaveAllRooms, rooms, users } = roomState;
    setDatabase(db);
    
    // Загружаем существующие данные
    await roomState.loadUsersFromDatabase(db);
    await roomState.loadRoomsFromDatabase();
    
    console.log(`📊 Текущее состояние:`);
    console.log(`   - Пользователей в памяти: ${users.size}`);
    console.log(`   - Комнат в памяти: ${rooms.size}`);
    
    // Проверяем данные в базе
    const dbUsers = await db.getAllUsers();
    const dbRooms = await db.getAllRooms();
    
    console.log(`   - Пользователей в базе: ${dbUsers.length}`);
    console.log(`   - Комнат в базе: ${dbRooms.length}`);
    
    // Выводим детали пользователей
    if (dbUsers.length > 0) {
        console.log('\n👥 Пользователи в базе:');
        for (const user of dbUsers) {
            console.log(`   - ${user.email} (${user.first_name} ${user.last_name})`);
        }
    }
    
    // Выводим детали комнат
    if (dbRooms.length > 0) {
        console.log('\n🏠 Комнаты в базе:');
        for (const room of dbRooms) {
            console.log(`   - ${room.name} (ID: ${room.id}, Статус: ${room.status})`);
            
            // Получаем игроков комнаты
            const roomWithPlayers = await db.getRoomWithPlayers(room.id);
            if (roomWithPlayers.players) {
                console.log(`     Игроки (${roomWithPlayers.players.length}):`);
                for (const player of roomWithPlayers.players) {
                    console.log(`       - ${player.name} (${player.is_host ? 'Хост' : 'Игрок'})`);
                    if (player.selected_dream) {
                        console.log(`         Мечта: ${player.selected_dream}`);
                    }
                    if (player.selected_token) {
                        console.log(`         Фишка: ${player.selected_token}`);
                    }
                }
            }
        }
    }
    
    // Тестируем принудительное сохранение
    console.log('\n💾 Тестируем принудительное сохранение...');
    const saveResult = await forceSaveAllRooms();
    console.log(`✅ Результат сохранения: ${saveResult ? 'Успешно' : 'С ошибками'}`);
    
    // Проверяем целостность данных
    console.log('\n🔍 Проверяем целостность данных...');
    
    for (const [roomId, room] of rooms) {
        const dbRoom = await db.getRoomWithPlayers(roomId);
        if (!dbRoom.room) {
            console.log(`❌ Комната ${room.name} (${roomId}) не найдена в базе данных`);
        } else {
            console.log(`✅ Комната ${room.name} (${roomId}) найдена в базе данных`);
            
            // Проверяем игроков
            const memoryPlayers = room.players;
            const dbPlayers = dbRoom.players || [];
            
            if (memoryPlayers.length !== dbPlayers.length) {
                console.log(`⚠️  Несоответствие количества игроков в комнате ${room.name}: память=${memoryPlayers.length}, база=${dbPlayers.length}`);
            } else {
                console.log(`✅ Количество игроков в комнате ${room.name} совпадает: ${memoryPlayers.length}`);
            }
        }
    }
    
    console.log('\n🎯 === ТЕСТ ЗАВЕРШЕН ===');
    process.exit(0);
}

// Запускаем тест
testPersistence().catch(error => {
    console.error('❌ Ошибка при выполнении теста:', error);
    process.exit(1);
});
