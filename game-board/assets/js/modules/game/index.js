/**
 * Game Module - основной модуль игровой доски
 */

// Импортируем модули
import LobbyModule from '../lobby/LobbyModule.js';

console.log('=== Загрузка Game Module ===');

// Инициализация игрового модуля
(async () => {
    try {
        console.log('🎮 Инициализация игрового модуля...');
        
        // Инициализируем лобби
        const lobby = new LobbyModule({ pollInterval: 10000 });
        console.log('✅ LobbyModule инициализирован');
        
        // Запускаем лобби
        await lobby.init();
        console.log('✅ Игровой модуль успешно инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации игрового модуля:', error);
    }
})();
