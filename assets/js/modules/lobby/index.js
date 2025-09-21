// Загружаем модули как скрипты
(async () => {
    console.log('=== Инициализация лобби ===');
    
    // Ждем загрузки модулей с таймаутом
    await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд максимум
        
        const checkInterval = setInterval(() => {
            attempts++;
            console.log(`Попытка ${attempts}/${maxAttempts}: RoomApi=${!!window.RoomApi}, LobbyModule=${!!window.LobbyModule}`);
            
            if (window.RoomApi && window.LobbyModule) {
                clearInterval(checkInterval);
                console.log('✅ Модули загружены');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Таймаут загрузки модулей');
                reject(new Error('Модули не загрузились в течение 5 секунд'));
            }
        }, 100);
    });

    try {
        console.log('Создание экземпляра LobbyModule...');
        const lobby = new window.LobbyModule({ api: new window.RoomApi(), pollInterval: 10000 });
        console.log('Инициализация LobbyModule...');
        await lobby.init();
        console.log('✅ LobbyModule инициализирован успешно');
    } catch (error) {
        console.error('❌ Lobby initialisation failed:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
    }
})();
