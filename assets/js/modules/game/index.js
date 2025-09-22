import GameModule from './GameModule.js';

function getRoomId() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.pop();
}

(async () => {
    const roomId = getRoomId();
    if (!roomId) {
        console.error('Room ID not found in URL');
        return;
    }
    try {
        const module = new GameModule({ roomId });
        await module.init();
    } catch (error) {
        console.error('Failed to initialize GameModule:', error);
    }
})();
