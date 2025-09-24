// EventEmitter и RoomApi будут доступны глобально

class GameState extends EventEmitter {
    constructor({ roomId, pollInterval = 3500 } = {}) {
        super();
        this.roomId = roomId;
        this.api = new RoomApi();
        this.pollInterval = pollInterval;
        this.user = null;
        this.room = null;
        this.state = null;
        this.timer = null;
        this.isFetching = false;
        this.redirectOnMissingGame = true;
    }

    async init() {
        this.user = this.api?.getCurrentUser?.() || null;
        if (!this.user?.id) {
            console.log('Пользователь не найден, перенаправляем на авторизацию');
            window.location.assign('/auth');
            return;
        }
        
        // Проверяем пользователя с мягким фоллбэком (как в лобби)
        try {
            await this.api.getPublicProfile();
        } catch (error) {
            // Не разлогиниваем на 404/отсутствии данных, продолжаем с кэшем
            console.log('Профиль недоступен, продолжаем с локальными данными:', error?.message || error);
        }
        
        await this.ensureJoined();
        await this.refresh();
        this.startPolling();
    }

    destroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    getSnapshot() {
        return this.state ? JSON.parse(JSON.stringify(this.state)) : null;
    }

    getCurrentPlayer() {
        if (!this.state) return null;
        return this.state.players?.find(player => player.userId === this.user.id) || null;
    }

    getUserId() {
        return this.user?.id || null;
    }

    getTurnTimeSec(defaultSec = 120) {
        const mins = Number(this.room?.turnTime || 0);
        if (Number.isFinite(mins) && mins > 0) return Math.round(mins * 60);
        return defaultSec;
    }

    isMyTurn() {
        if (!this.state) return false;
        return this.state.activePlayerId === this.user.id;
    }

    async ensureJoined() {
        try {
            const room = await this.api.getRoom(this.roomId, { user_id: this.user.id });
            
            // Проверяем, что пользователь находится в комнате
            if (!room?.currentPlayer) {
                throw new Error('Вы не находитесь в этой комнате. Пожалуйста, присоединитесь к комнате сначала.');
            }
            
            // Проверяем, что игра началась
            if (!room.gameStarted && this.redirectOnMissingGame) {
                window.location.assign(`/room/u/${this.user.username || 'user'}`);
                return;
            }
            
            this.room = room;
            localStorage.setItem('currentRoom', JSON.stringify(room));
            localStorage.setItem('currentRoomId', this.roomId);
        } catch (error) {
            console.error('Ошибка при проверке принадлежности к комнате:', error);
            if (error.message.includes('не находитесь в этой комнате')) {
                window.location.assign(`/room/${this.roomId}`);
                return;
            }
            throw error;
        }
    }

    async refresh() {
        if (this.isFetching) {
            return;
        }
        this.isFetching = true;
        try {
            const state = await this.api.getGameState(this.roomId);
            this.applyState(state);
        } catch (error) {
            this.emit('error', error);
        } finally {
            this.isFetching = false;
        }
    }

    startPolling() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => this.refresh(), this.pollInterval);
    }

    applyState(state) {
        if (!state) return;
        this.state = state;
        this.emit('change', this.getSnapshot());
    }

    async rollDice() {
        try {
            const result = await this.api.rollDice(this.roomId);
            if (result?.state) {
                this.applyState(result.state);
            }
            this.emit('rolled', result);
            return result;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async chooseDeal(size) {
        try {
            const result = await this.api.chooseDeal(this.roomId, size);
            if (result?.state) {
                this.applyState(result.state);
            }
            return result;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async resolveDeal(action) {
        try {
            const result = await this.api.resolveDeal(this.roomId, action);
            if (result?.state) {
                this.applyState(result.state);
            }
            return result;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async transferAsset(assetId, targetUserId) {
        try {
            const result = await this.api.transferAsset(this.roomId, assetId, targetUserId);
            if (result?.state) {
                this.applyState(result.state);
            }
            return result;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async sellAsset(assetId) {
        try {
            const result = await this.api.sellAsset(this.roomId, assetId);
            if (result?.state) {
                this.applyState(result.state);
            }
            return result;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async endTurn() {
        try {
            const state = await this.api.endTurn(this.roomId);
            if (state) {
                this.applyState(state);
            }
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
}

// Экспортируем в window для совместимости
window.GameState = GameState;
export default GameState;
