/**
 * RoomApi - высокоуровневый API клиент для лобби и игровых комнат
 */
class RoomApi {
    constructor(baseUrl = window.location.origin) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
    }

    withUserHeaders(headers = {}) {
        const user = this.getCurrentUser();
        if (user?.id) {
            headers['X-User-ID'] = user.id;
            headers['X-User-Name'] = user.first_name || user.username || user.email || 'Игрок';
        }
        return headers;
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

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: 'GET',
            ...options,
            headers: this.withUserHeaders({ ...this.defaultHeaders, ...(options.headers || {}) })
        };

        const response = await fetch(url, config);
        if (!response.ok) {
            const message = await this.extractError(response);
            throw new Error(message || `Ошибка запроса ${response.status}`);
        }
        return response.json();
    }

    async extractError(response) {
        try {
            const data = await response.json();
            return data?.message || data?.error;
        } catch (error) {
            return response.statusText;
        }
    }

    async listRooms() {
        const data = await this.request('/api/rooms');
        return data.rooms || [];
    }

    async createRoom(payload) {
        const data = await this.request('/api/rooms', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data.room;
    }

    async getRoom(roomId, params = {}) {
        const query = new URLSearchParams({ ...params }).toString();
        const url = query ? `/api/rooms/${roomId}?${query}` : `/api/rooms/${roomId}`;
        const data = await this.request(url);
        return data.room;
    }

    async joinRoom(roomId, payload) {
        const data = await this.request(`/api/rooms/${roomId}/join`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data;
    }

    async leaveRoom(roomId, payload = {}) {
        const data = await this.request(`/api/rooms/${roomId}/leave`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data;
    }

    async selectDream(roomId, dreamId) {
        const data = await this.request(`/api/rooms/${roomId}/dream`, {
            method: 'POST',
            body: JSON.stringify({ dream_id: dreamId })
        });
        return data.room;
    }

    async selectToken(roomId, tokenId) {
        const data = await this.request(`/api/rooms/${roomId}/token`, {
            method: 'POST',
            body: JSON.stringify({ token_id: tokenId })
        });
        return data.room;
    }

    async toggleReady(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/ready`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        return data.room;
    }

    async startGame(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/start`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        return data.room;
    }

    async getGameState(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/game-state`);
        return data.state;
    }

    async rollDice(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/roll`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        return data;
    }

    async chooseDeal(roomId, size) {
        const data = await this.request(`/api/rooms/${roomId}/deals/choose`, {
            method: 'POST',
            body: JSON.stringify({ size })
        });
        return data;
    }

    async resolveDeal(roomId, action) {
        const data = await this.request(`/api/rooms/${roomId}/deals/resolve`, {
            method: 'POST',
            body: JSON.stringify({ action })
        });
        return data;
    }

    async transferAsset(roomId, assetId, targetUserId) {
        const data = await this.request(`/api/rooms/${roomId}/assets/transfer`, {
            method: 'POST',
            body: JSON.stringify({ asset_id: assetId, target_user_id: targetUserId })
        });
        return data;
    }

    async sellAsset(roomId, assetId) {
        const data = await this.request(`/api/rooms/${roomId}/assets/sell`, {
            method: 'POST',
            body: JSON.stringify({ asset_id: assetId })
        });
        return data;
    }

    async endTurn(roomId) {
        const data = await this.request(`/api/rooms/${roomId}/end-turn`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        return data.state;
    }
}

// Экспортируем в window для глобального доступа
window.RoomApi = RoomApi;
