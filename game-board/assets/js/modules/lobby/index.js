// Импортируем модули
import LobbyModule from './LobbyModule.js';

// Инициализируем лобби
(async () => {
    try {
        console.log('🎮 Инициализация лобби...');
        const lobby = new LobbyModule({ pollInterval: 10000 });
        await lobby.init();
        console.log('✅ Лобби успешно инициализировано');
    } catch (error) {
        console.error('❌ Ошибка инициализации лобби:', error);
    }
})();
