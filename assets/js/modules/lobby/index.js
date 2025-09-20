import RoomApi from '../api/RoomApi.js';
import LobbyModule from './LobbyModule.js';

(async () => {
    const lobby = new LobbyModule({ api: new RoomApi(), pollInterval: 10000 });
    try {
        await lobby.init();
    } catch (error) {
        console.error('Lobby initialisation failed:', error);
    }
})();
