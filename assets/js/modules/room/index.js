import RoomModule from './RoomModule.js';

function extractRoomId() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.pop();
}

(async () => {
    const roomId = extractRoomId();
    const module = new RoomModule({ roomId });
    try {
        await module.init();
    } catch (error) {
        console.error('Инициализация комнаты завершилась с ошибкой:', error);
    }
})();
