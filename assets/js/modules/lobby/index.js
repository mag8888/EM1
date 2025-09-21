// Простая инициализация лобби
function initLobby() {
    console.log('=== Инициализация лобби ===');
    
    // Проверяем доступность модулей
    if (!window.RoomApi) {
        console.error('❌ RoomApi не найден');
        return;
    }
    
    if (!window.LobbyModule) {
        console.error('❌ LobbyModule не найден');
        return;
    }
    
    console.log('✅ Модули найдены');
    
    try {
        console.log('Создание экземпляра LobbyModule...');
        const lobby = new window.LobbyModule({ api: new window.RoomApi(), pollInterval: 10000 });
        console.log('Инициализация LobbyModule...');
        lobby.init().then(() => {
            console.log('✅ LobbyModule инициализирован успешно');
        }).catch(error => {
            console.error('❌ Lobby initialisation failed:', error);
        });
    } catch (error) {
        console.error('❌ Lobby creation failed:', error);
    }
}

// Инициализируем сразу или ждем загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLobby);
} else {
    initLobby();
}
