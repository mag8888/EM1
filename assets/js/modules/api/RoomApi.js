/**
 * RoomApi - высокоуровневый API клиент для лобби и игровых комнат
 */
class RoomApi {
    constructor(baseUrl = null) {
        // Определяем базовый URL
        if (baseUrl) {
            this.baseUrl = baseUrl.replace(/\/$/, '');
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.baseUrl = 'http://localhost:8080';
        } else {
            // Для Railway используем полный URL
            this.baseUrl = window.location.origin;
        }
        
        console.log('RoomApi baseUrl:', this.baseUrl);
        console.log('Current location:', window.location.href);
        
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
    }

    withUserHeaders(headers = {}) {
        const user = this.getCurrentUser();
        const token = localStorage.getItem('authToken');
        
        // Упрощаем заголовки для тестирования
        const baseHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (token) {
            baseHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        if (user?.id) {
            baseHeaders['X-User-ID'] = user.id;
            baseHeaders['X-User-Name'] = user.first_name || user.username || user.email || 'Игрок';
        }
        
        return { ...baseHeaders, ...headers };
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
        
        console.log('RoomApi request (OLD METHOD):', { url, method: options.method || 'GET' });
        console.trace('Call stack for old request method:');

        // Получаем токен и данные пользователя
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        let userData = null;
        
        if (user) {
            try {
                userData = JSON.parse(user);
            } catch (e) {
                console.warn('Failed to parse user data:', e);
            }
        }

        // Для GET запросов используем простейший подход
        if ((options.method || 'GET') === 'GET') {
            try {
                // Пробуем простейший fetch без заголовков
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (response.ok) {
                    return await response.json();
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.warn('Simple GET failed, trying with auth headers:', error);
                
                // Если простой запрос не работает, пробуем с авторизацией
                try {
                    const headers = {};
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    if (userData && userData.id) {
                        headers['X-User-ID'] = userData.id;
                    }
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        mode: 'cors',
                        credentials: 'omit',
                        headers
                    });
                    
                    if (response.ok) {
                        return await response.json();
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (authError) {
                    console.error('Authenticated GET also failed:', authError);
                    // Возвращаем пустой массив для комнат как fallback
                    if (endpoint.includes('/rooms')) {
                        return [];
                    }
                    throw authError;
                }
            }
        }
        
        // Для POST/PUT запросов
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            if (userData && userData.id) {
                headers['X-User-ID'] = userData.id;
            }
            
            const response = await fetch(url, {
                method: options.method || 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
                }
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('POST/PUT request failed:', error);
            throw error;
        }
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
        console.log('=== listRooms called ===');
        console.log('Base URL:', this.baseUrl);
        
        // Пробуем несколько раз с retry
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Trying simple endpoint (attempt ${attempt})...`);
                const response = await fetch(`${this.baseUrl}/api/rooms/simple`, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                console.log('Simple endpoint response:', { status: response.status, ok: response.ok });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Simple rooms endpoint worked:', data);
                    return data;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.warn(`Simple rooms endpoint failed (attempt ${attempt}):`, error);
                
                if (attempt === 3) {
                    // Последняя попытка не удалась, возвращаем пустой массив
                    console.log('All attempts failed, returning empty array as fallback');
                    return [];
                } else {
                    // Ждем перед следующей попыткой
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
    }

    async createRoom(payload) {
        console.log('=== createRoom called ===');
        console.log('Payload:', payload);
        
        try {
            // Получаем токен и данные пользователя
            const token = localStorage.getItem('authToken');
            const user = localStorage.getItem('user');
            let userData = null;
            
            if (user) {
                try {
                    userData = JSON.parse(user);
                } catch (e) {
                    console.warn('Failed to parse user data:', e);
                }
            }
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('Using auth token for createRoom');
            }
            if (userData && userData.id) {
                headers['X-User-ID'] = userData.id;
                console.log('Added X-User-ID header:', userData.id);
            }
            
            console.log('Create room headers:', headers);
            
            const response = await fetch(`${this.baseUrl}/api/rooms`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers,
                body: JSON.stringify(payload)
            });
            
            console.log('Create room response:', { status: response.status, ok: response.ok });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Room created successfully:', data);
                return data.room;
            } else {
                const errorText = await response.text();
                console.error('Create room error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('Create room failed:', error);
            throw error;
        }
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
