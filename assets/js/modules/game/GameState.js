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
            window.location.assign('/auth');
            return;
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

    isMyTurn() {
        if (!this.state) return false;
        return this.state.activePlayerId === this.user.id;
    }

    async ensureJoined() {
        const room = await this.api.getRoom(this.roomId, { user_id: this.user.id });
        if (!room?.currentPlayer) {
            await this.api.joinRoom(this.roomId, {
                name: this.user.first_name || this.user.username || this.user.email || 'Игрок',
                avatar: this.user.avatar || this.user.photo || null
            });
        }
        if (!room.gameStarted && this.redirectOnMissingGame) {
            window.location.assign(`/room/${this.roomId}`);
            return;
        }
        this.room = room;
        localStorage.setItem('currentRoom', JSON.stringify(room));
        localStorage.setItem('currentRoomId', this.roomId);
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
