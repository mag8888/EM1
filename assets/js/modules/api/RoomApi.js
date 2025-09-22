/**
 * RoomApi — высокоуровневый API-клиент для лобби и игровых комнат.
 * Содержит унифицированную обработку ошибок и резервные варианты для Safari.
 */

// Проверяем, не загружен ли уже модуль
if (window.RoomApi) {
    console.log('RoomApi уже загружен, пропускаем повторную загрузку');
} else {

const SAFARI_UA_PATTERN = /\bVersion\/\d+.*Safari\b/i;
const SAFARI_EXCLUDE_PATTERN = /\b(Chrome|CriOS|Chromium|Edg|OPR|SamsungBrowser)\b/i;
const DEFAULT_REQUEST_TIMEOUT = 15000;

function safeJsonParse(text) {
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
}

function detectSafari() {
    if (typeof navigator === 'undefined' || !navigator.userAgent) {
        return false;
    }
    const ua = navigator.userAgent;
    return SAFARI_UA_PATTERN.test(ua) && !SAFARI_EXCLUDE_PATTERN.test(ua);
}

class RoomApi {
    constructor(baseUrl = null) {
        if (baseUrl) {
            this.baseUrl = baseUrl.replace(/\/$/, '');
        } else if (typeof window !== 'undefined') {
            const { hostname, origin } = window.location;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                this.baseUrl = 'http://localhost:8080';
            } else {
                this.baseUrl = origin.replace(/\/$/, '');
            }
        } else {
            this.baseUrl = '';
        }

        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        this._isSafari = null;
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
        const headers = {
            ...this.defaultHeaders,
            ...extra
        };

        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.warn('RoomApi: unable to read authToken', error);
        }

        const user = this.getCurrentUser();
        if (user?.id) {
            headers['X-User-ID'] = user.id;
            headers['X-User-Name'] = user.first_name || user.username || user.email || 'Игрок';
        }

        return headers;
    }

    createFetchConfig(method, headers, body) {
        const config = {
            method,
            headers: this.buildHeaders(headers)
        };

        if (method !== 'GET' && body !== undefined) {
            config.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        return config;
    }

    async request(endpoint, { method = 'GET', headers = {}, body } = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = this.createFetchConfig(method, headers, body);
        const response = await this.sendWithFallback(url, config);

        if (!response.ok) {
            if (this.shouldDropAuthToken(response.status)) {
                try {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                } catch (error) {
                    console.warn('RoomApi: failed to clear auth storage', error);
                }
            }
            throw new Error(this.extractErrorMessage(response));
        }

        return response.data;
    }

    shouldDropAuthToken(status) {
        return status === 401 || status === 403;
    }

    extractErrorMessage(response) {
        const data = response.data;
        if (data && typeof data === 'object') {
            return data.message || data.error || data.detail || `HTTP ${response.status}`;
        }
        if (response.bodyText) {
            const text = response.bodyText.trim();
            return text || response.statusText || `HTTP ${response.status}`;
        }
        return response.statusText || `HTTP ${response.status}`;
    }

    async sendWithFallback(url, config) {
        try {
            return await this.sendViaFetch(url, config);
        } catch (error) {
            if (!this.isSafariBrowser() || !this.isLikelyCorsError(error)) {
                throw error;
            }

            const safariConfig = this.prepareSafariConfig(config);
            try {
                return await this.sendViaFetch(url, safariConfig);
            } catch (safariFetchError) {
                try {
                    return await this.sendViaXhr(url, safariConfig);
                } catch (xhrError) {
                    try {
                        return await this.sendViaFetch(url, this.prepareMinimalConfig(config));
                    } catch (minimalError) {
                        const fallbackError = new Error('CORS error in Safari - please try refreshing the page');
                        fallbackError.cause = minimalError;
                        throw fallbackError;
                    }
                }
            }
        }
    }

    async sendViaFetch(url, config) {
        if (typeof fetch === 'undefined') {
            throw new Error('Fetch API not supported in this browser');
        }

        const requestConfig = this.cloneRequestConfig(config);
        const response = await fetch(url, requestConfig);
        const bodyText = response.status === 204 ? '' : await response.text();

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: safeJsonParse(bodyText),
            bodyText
        };
    }

    sendViaXhr(url, config) {
        const requestConfig = this.cloneRequestConfig(config);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            try {
                xhr.open(requestConfig.method, url, true);
            } catch (error) {
                reject(new Error('Failed to open XMLHttpRequest'));
                return;
            }

            xhr.timeout = DEFAULT_REQUEST_TIMEOUT;

            Object.entries(requestConfig.headers || {}).forEach(([key, value]) => {
                try {
                    xhr.setRequestHeader(key, value);
                } catch (error) {
                    // Игнорируем невозможность установки заголовка
                }
            });

            xhr.onload = () => {
                const bodyText = xhr.responseText || '';
                resolve({
                    ok: xhr.status >= 200 && xhr.status < 300,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: null,
                    data: safeJsonParse(bodyText),
                    bodyText
                });
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));
            xhr.onabort = () => reject(new Error('Request aborted'));

            try {
                xhr.send(requestConfig.body);
            } catch (error) {
                reject(new Error('Failed to send XMLHttpRequest'));
            }
        });
    }

    cloneRequestConfig(config) {
        const cloned = {
            method: config.method,
            headers: { ...(config.headers || {}) }
        };

        if (config.body !== undefined) {
            cloned.body = config.body;
        }

        return cloned;
    }

    prepareSafariConfig(config) {
        const headers = {};

        if (config.headers?.Authorization) {
            headers.Authorization = config.headers.Authorization;
        }

        headers.Accept = 'application/json';

        if (config.body && config.headers?.['Content-Type']) {
            headers['Content-Type'] = config.headers['Content-Type'];
        }

        return {
            method: config.method,
            headers,
            body: config.body
        };
    }

    prepareMinimalConfig(config) {
        const minimal = {
            method: config.method,
            headers: {}
        };

        if (config.body !== undefined) {
            minimal.body = config.body;
        }

        return minimal;
    }

    isLikelyCorsError(error) {
        if (!error) {
            return false;
        }
        const message = String(error.message || error);
        const name = error.name || '';
        return name === 'TypeError' ||
            message.includes('Failed to fetch') ||
            message.includes('Load failed') ||
            message.includes('Network request failed');
    }

    isSafariBrowser() {
        if (this._isSafari === null) {
            this._isSafari = detectSafari();
        }
        return this._isSafari;
    }

    async listRooms() {
        // Для Safari используем специальный endpoint
        if (this.isSafariBrowser()) {
            try {
                console.log('Safari detected, using special rooms endpoint');
                const data = await this.request('/api/rooms/safari');
                return data?.rooms || [];
            } catch (error) {
                console.log('Safari endpoint failed, falling back to regular endpoint');
                const data = await this.request('/api/rooms');
                return data?.rooms || [];
            }
        }
        
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

window.RoomApi = RoomApi;

} // Конец блока else для проверки существования модуля
