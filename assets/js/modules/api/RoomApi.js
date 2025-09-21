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
        
        // Сначала попробуем простой запрос без дополнительных заголовков
        let config = {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            ...options
        };
        
        // Добавляем только базовые заголовки
        const basicHeaders = {
            'Accept': 'application/json'
        };
        
        // Добавляем авторизацию если есть токен
        const token = localStorage.getItem('authToken');
        if (token) {
            basicHeaders['Authorization'] = `Bearer ${token}`;
            console.log('Using auth token for request:', token.substring(0, 20) + '...');
            
            // Добавляем X-User-ID заголовок из токена или localStorage
            try {
                const user = localStorage.getItem('user');
                if (user) {
                    const userData = JSON.parse(user);
                    if (userData.id) {
                        basicHeaders['X-User-ID'] = userData.id;
                        console.log('Added X-User-ID header:', userData.id);
                    }
                }
            } catch (e) {
                console.warn('Failed to parse user data for X-User-ID header:', e);
            }
        } else {
            console.warn('No auth token found, request may fail');
            console.log('Available localStorage keys:', Object.keys(localStorage));
        }
        
        // Убираем Content-Type для GET запросов, так как это может вызывать CORS проблемы
        if (config.method === 'GET') {
            delete basicHeaders['Content-Type'];
        }
        
        config.headers = { ...basicHeaders, ...(options.headers || {}) };
        
        console.log('RoomApi request:', { url, config });

        try {
            console.log('Making fetch request to:', url);
            
            // Попробуем сначала fetch
            try {
                const response = await fetch(url, config);
                console.log('Fetch response received:', { status: response.status, ok: response.ok });
                if (!response.ok) {
                    if (response.status === 401) {
                        // Очищаем токен при 401 ошибке
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
                    }
                    const message = await this.extractError(response);
                    throw new Error(message || `Ошибка запроса ${response.status}`);
                }
                return response.json();
            } catch (fetchError) {
                console.warn('Fetch failed, trying XMLHttpRequest:', fetchError);
                
                // Если fetch не работает, попробуем XMLHttpRequest
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(config.method, url, true);
                    
                    // Устанавливаем только безопасные заголовки
                    const safeHeaders = ['Accept', 'Content-Type', 'Authorization', 'X-User-ID'];
                    Object.keys(config.headers || {}).forEach(key => {
                        if (safeHeaders.includes(key)) {
                            try {
                                xhr.setRequestHeader(key, config.headers[key]);
                            } catch (e) {
                                console.warn('Failed to set header:', key, e);
                            }
                        }
                    });
                    
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4) {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    const data = JSON.parse(xhr.responseText);
                                    resolve(data);
                                } catch (parseError) {
                                    reject(new Error('Ошибка парсинга ответа сервера'));
                                }
                            } else if (xhr.status === 401) {
                                localStorage.removeItem('authToken');
                                localStorage.removeItem('user');
                                reject(new Error('Сессия истекла. Пожалуйста, войдите снова.'));
                            } else {
                                reject(new Error(`Ошибка запроса ${xhr.status}`));
                            }
                        }
                    };
                    
                    xhr.onerror = function() {
                        reject(new Error('Ошибка сети. Проверьте подключение к интернету.'));
                    };
                    
                    xhr.send();
                });
            }
        } catch (error) {
            console.error('RoomApi request error:', error);
            if (error.name === 'TypeError') {
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('Ошибка сети. Проверьте подключение к интернету.');
                } else if (error.message.includes('Type error')) {
                    throw new Error('Ошибка типа данных. Попробуйте обновить страницу.');
                } else {
                    throw new Error('Ошибка запроса. Попробуйте еще раз.');
                }
            }
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
