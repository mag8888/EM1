/**
 * RoomApi — высокоуровневый API-клиент для работы с лобби и комнатами
 */
class RoomApi {
    constructor(baseUrl = null) {
        if (baseUrl) {
            this.baseUrl = baseUrl.replace(/\/$/, '');
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.baseUrl = 'http://localhost:8080';
        } else {
            this.baseUrl = window.location.origin;
        }
    }

    getCurrentUser() {
        try {
            const stored = localStorage.getItem('user');
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (parsed && !parsed.id && parsed._id) {
                parsed.id = parsed._id;
            }
            return parsed;
        } catch (error) {
            console.warn('RoomApi: failed to parse user from storage', error);
            return null;
        }
    }

    buildHeaders(extra = {}) {
        const user = this.getCurrentUser();
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...extra
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (user?.id) {
            headers['X-User-ID'] = user.id;
            headers['X-User-Name'] = user.first_name || user.username || user.email || 'Игрок';
        }

        return headers;
    }

    async request(endpoint, { method = 'GET', headers = {}, body } = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method,
            headers: this.buildHeaders(headers)
        };

        if (body !== undefined && method !== 'GET') {
            config.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
            let message = response.statusText || `HTTP ${response.status}`;
            try {
                const data = await response.json();
                message = data?.message || data?.error || message;
            } catch (_) {
                // ignore body parse errors
            }
            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    async listRooms() {
        const data = await this.request('/api/rooms');
        return data?.rooms || [];
    }

    async createRoom(payload) {
        const data = await this.request('/api/rooms', {
            method: 'POST',
            body: payload
        });
        return data.room;
    }

    async getRoom(roomId, params = {}) {
        const query = new URLSearchParams({ ...params }).toString();
        const url = query ? `/api/rooms/${roomId}?${query}` : `/api/rooms/${roomId}`;
        const data = await this.request(url);
        return data.room;
    }

    async joinRoom(roomId, payload = {}) {
        return this.request(`/api/rooms/${roomId}/join`, {
            method: 'POST',
            body: payload
        });
    }

    async leaveRoom(roomId, payload = {}) {
        return this.request(`/api/rooms/${roomId}/leave`, {
            method: 'POST',
            body: payload
        });
    }

    async selectDream(roomId, dreamId) {
        const data = await this.request(`/api/rooms/${roomId}/dream`, {
            method: 'POST',
            body: { dream_id: dreamId }
        });
        return data.room;
    }

    async selectToken(roomId, tokenId) {
        const data = await this.request(`/api/rooms/${roomId}/token`, {
            method: 'POST',
            body: { token_id: tokenId }
        });
        return data.room;
    }

    async toggleReady(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/ready`, {
            method: 'POST',
            body: {}
        });
        return data.room;
    }

    async startGame(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/start`, {
            method: 'POST',
            body: {}
        });
        return data.room;
    }

    async getGameState(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/game-state`);
        return data.state;
    }

    async rollDice(roomId) {
        return this.request(`/api/rooms/${roomId}/roll`, {
            method: 'POST',
            body: {}
        });
    }

    async chooseDeal(roomId, size) {
        return this.request(`/api/rooms/${roomId}/deals/choose`, {
            method: 'POST',
            body: { size }
        });
    }

    async resolveDeal(roomId, action) {
        return this.request(`/api/rooms/${roomId}/deals/resolve`, {
            method: 'POST',
            body: { action }
        });
    }

    async transferAsset(roomId, assetId, targetUserId) {
        return this.request(`/api/rooms/${roomId}/assets/transfer`, {
            method: 'POST',
            body: { asset_id: assetId, target_user_id: targetUserId }
        });
    }

    async sellAsset(roomId, assetId) {
        return this.request(`/api/rooms/${roomId}/assets/sell`, {
            method: 'POST',
            body: { asset_id: assetId }
        });
    }

    async endTurn(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/end-turn`, {
            method: 'POST',
            body: {}
        });
        return data.state;
    }
}

export default RoomApi;
