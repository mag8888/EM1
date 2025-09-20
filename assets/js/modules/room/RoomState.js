import EventEmitter from '../shared/EventEmitter.js';

export default class RoomState extends EventEmitter {
    constructor({ roomId, api, pollInterval = 4000 } = {}) {
        super();
        this.api = api;
        this.roomId = roomId;
        this.pollInterval = pollInterval;
        this.user = null;
        this.room = null;
        this.timer = null;
        this.isFetching = false;
    }

    async init() {
        this.user = this.api?.getCurrentUser?.() || null;
        if (!this.user?.id) {
            throw new Error('Пользователь не найден. Авторизуйтесь заново.');
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
        return this.room ? JSON.parse(JSON.stringify(this.room)) : null;
    }

    async ensureJoined() {
        try {
            const room = await this.api.getRoom(this.roomId, { user_id: this.user.id });
            if (!room?.currentPlayer) {
                const joinResult = await this.api.joinRoom(this.roomId, {
                    name: this.user.first_name || this.user.username || this.user.email || 'Игрок',
                    avatar: this.user.avatar || this.user.photo || null,
                    user_id: this.user.id
                });
                if (joinResult?.room) {
                    this.handleUpdate(joinResult.room);
                }
            }
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async refresh({ silent = false } = {}) {
        if (this.isFetching) {
            return;
        }
        this.isFetching = true;
        try {
            if (!silent) {
                this.emit('loading', true);
            }
            const room = await this.api.getRoom(this.roomId, { user_id: this.user.id });
            this.handleUpdate(room);
        } catch (error) {
            this.emit('error', error);
        } finally {
            if (!silent) {
                this.emit('loading', false);
            }
            this.isFetching = false;
        }
    }

    startPolling() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => this.refresh({ silent: true }), this.pollInterval);
    }

    async selectDream(dreamId) {
        try {
            const room = await this.api.selectDream(this.roomId, dreamId);
            this.handleUpdate(room);
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async selectToken(tokenId) {
        try {
            const room = await this.api.selectToken(this.roomId, tokenId);
            this.handleUpdate(room);
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async toggleReady() {
        try {
            const room = await this.api.toggleReady(this.roomId);
            this.handleUpdate(room);
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async startGame() {
        try {
            const room = await this.api.startGame(this.roomId);
            this.handleUpdate(room);
            return room;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    handleUpdate(room) {
        if (!room) {
            return;
        }
        this.room = room;
        localStorage.setItem('currentRoomId', this.roomId);
        localStorage.setItem('currentRoom', JSON.stringify(room));
        this.emit('change', this.getSnapshot());
    }
}
