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

        console.log('RoomApi request:', { url, method, headers: config.headers });
        console.log('Fetch available:', typeof fetch !== 'undefined');
        console.log('User agent:', navigator.userAgent);
        
        // Проверяем поддержку fetch
        if (typeof fetch === 'undefined') {
            throw new Error('Fetch API not supported in this browser');
        }
        
        // Специальная обработка для Safari
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        if (isSafari) {
            console.log('Safari detected, trying XMLHttpRequest first');
            try {
                const result = await this.xhrRequest(url, config);
                console.log('XMLHttpRequest succeeded, returning result');
                return result;
            } catch (xhrError) {
                console.log('XMLHttpRequest failed:', xhrError);
                console.log('Trying fetch with simplified headers as fallback');
                // Сохраняем Authorization заголовок для Safari
                const authHeader = config.headers.Authorization;
                config.headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                if (authHeader) {
                    config.headers.Authorization = authHeader;
                    console.log('Authorization header preserved for Safari');
                }
            }
        }
        
        let response;
        try {
            response = await fetch(url, config);
            console.log('RoomApi response:', { status: response.status, ok: response.ok, url: response.url });
        } catch (error) {
            console.error('RoomApi fetch error:', error);
            
            // Безопасная обработка свойств ошибки
            const errorDetails = {
                name: error?.name || 'Unknown',
                message: error?.message || 'Unknown error',
                stack: error?.stack || 'No stack trace',
                cause: error?.cause || 'No cause'
            };
            console.error('Error details:', errorDetails);
            
            // Специальная обработка для Safari CORS ошибок
            if (isSafari && (errorDetails.message === 'Type error' || errorDetails.message === 'Load failed')) {
                console.log('Safari CORS error detected, trying XMLHttpRequest fallback');
                try {
                    return await this.xhrRequest(url, config);
                } catch (xhrError) {
                    console.error('XMLHttpRequest also failed:', xhrError);
                    throw new Error('CORS error in Safari - please try refreshing the page');
                }
            }
            
            throw error;
        }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
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

        try {
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers.entries()));
            throw new Error(`Invalid JSON response from server: ${error.message}`);
        }
    }

    // Fallback метод для Safari с использованием XMLHttpRequest
    async xhrRequest(url, config) {
        return new Promise((resolve, reject) => {
            console.log('Using XMLHttpRequest fallback for Safari');
            console.log('XHR URL:', url);
            console.log('XHR method:', config.method);
            console.log('XHR headers:', config.headers);
            
            const xhr = new XMLHttpRequest();
            
            try {
                xhr.open(config.method, url, true);
                console.log('XHR opened successfully');
            } catch (error) {
                console.error('Failed to open XHR:', error);
                reject(new Error('Failed to open XMLHttpRequest'));
                return;
            }
            
            // Устанавливаем заголовки
            Object.keys(config.headers).forEach(key => {
                try {
                    xhr.setRequestHeader(key, config.headers[key]);
                    console.log(`XHR header set: ${key} = ${config.headers[key]}`);
                } catch (error) {
                    console.warn(`Failed to set header ${key}:`, error);
                }
            });
            
            xhr.onload = () => {
                console.log('XHR onload triggered');
                console.log('XHR response:', { 
                    status: xhr.status, 
                    statusText: xhr.statusText,
                    responseText: xhr.responseText?.substring(0, 200) + '...'
                });
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                        console.log('XHR success, data:', data);
                        resolve(data);
                    } catch (error) {
                        console.error('XHR JSON parse error:', error);
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    console.error('XHR error response:', xhr.status, xhr.statusText);
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };
            
            xhr.onerror = () => {
                console.error('XHR onerror triggered');
                reject(new Error('Network error'));
            };
            
            xhr.ontimeout = () => {
                console.error('XHR ontimeout triggered');
                reject(new Error('Request timeout'));
            };
            
            xhr.onabort = () => {
                console.error('XHR onabort triggered');
                reject(new Error('Request aborted'));
            };
            
            // Устанавливаем таймаут
            xhr.timeout = 15000;
            
            try {
                xhr.send(config.body);
                console.log('XHR send called');
            } catch (error) {
                console.error('Failed to send XHR:', error);
                reject(new Error('Failed to send XMLHttpRequest'));
            }
        });
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

window.RoomApi = RoomApi;
