// Загружаем модули как скрипты
(async () => {
    // Ждем загрузки модулей
    await new Promise(resolve => {
        if (window.RoomApi && window.LobbyModule) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.RoomApi && window.LobbyModule) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });

    const lobby = new window.LobbyModule({ api: new window.RoomApi(), pollInterval: 10000 });
    try {
        await lobby.init();
    } catch (error) {
        console.error('Lobby initialisation failed:', error);
    }
})();
