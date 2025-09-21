// RoomModule будет доступен глобально

function extractRoomId() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.pop();
}

// Ждем загрузки RoomModule
function waitForRoomModule() {
    return new Promise((resolve) => {
        const checkModule = () => {
            if (window.RoomModule) {
                resolve();
            } else {
                setTimeout(checkModule, 100);
            }
        };
        checkModule();
    });
}

(async () => {
    try {
        console.log('Waiting for RoomModule...');
        await waitForRoomModule();
        console.log('RoomModule loaded, initializing...');
        
        const roomId = extractRoomId();
        const module = new window.RoomModule({ roomId });
        await module.init();
        console.log('Room module initialized successfully');
    } catch (error) {
        console.error('Инициализация комнаты завершилась с ошибкой:', error);
    }
})();
