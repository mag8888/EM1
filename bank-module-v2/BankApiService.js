/**
 * Банковский модуль - API Сервис
 * Управляет всеми API запросами к серверу
 */

class BankApiService {
    constructor() {
        console.log('🌐 BankApiService: Инициализация API сервиса');
        this.baseUrl = '/api';
        this.timeout = 10000;
    }
    
    /**
     * Получить индекс текущего игрока
     */
    getCurrentPlayerIndex(roomData) {
        const userId = this.getUserId();
        console.log('🔍 BankApiService: Поиск player_index', { userId, players: roomData?.players });
        
        if (!userId || !roomData?.players) {
            console.warn('⚠️ BankApiService: userId или players не найдены, возвращаем 0');
            return 0;
        }
        
        // Показываем все ID игроков для отладки
        const playerIds = roomData.players.map((player, index) => ({ index, _id: player._id, user_id: player.user_id, name: player.name }));
        console.log('🔍 BankApiService: Все игроки:', playerIds);
        console.log('🔍 BankApiService: Ищем userId:', userId);
        console.log('🔍 BankApiService: Сравнение:', roomData.players.map(p => ({ user_id: p.user_id, matches: p.user_id === userId })));
        
        const playerIndex = roomData.players.findIndex(player => player.user_id === userId);
        console.log('🔍 BankApiService: Найден player_index:', playerIndex);
        
        if (playerIndex < 0) {
            console.warn('⚠️ BankApiService: Игрок не найден в списке, возвращаем 0');
            return 0;
        }
        
        return playerIndex;
    }
    
    /**
     * Получить ID пользователя
     */
    getUserId() {
        try {
            // 1) Из объекта user в localStorage
            const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (rawUser) {
                const user = JSON.parse(rawUser);
                const candidate = user?.id || user?._id || user?.user_id || user?.userId;
                if (candidate) return candidate;
            }
            // 2) Отдельные ключи
            const direct = localStorage.getItem('user_id') || localStorage.getItem('userId') || sessionStorage.getItem('user_id') || sessionStorage.getItem('userId');
            if (direct) return direct;
            // 3) Глобальные переменные
            if (window.currentUser?.id) return window.currentUser.id;
            if (window.user?.id) return window.user.id;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка получения ID пользователя:', error);
        }
        return null;
    }
    
    /**
     * Выполнить HTTP запрос
     */
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                let serverMsg = '';
                try {
                    const errJson = await response.json();
                    serverMsg = errJson?.message || '';
                } catch (_) {}
                throw new Error(`HTTP ${response.status}: ${response.statusText}${serverMsg ? ' - ' + serverMsg : ''}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    /**
     * Загрузить данные комнаты
     */
    async loadRoomData(roomId, userId) {
        console.log('📡 BankApiService: Загрузка данных комнаты', { roomId, userId });
        
        try {
            const url = `${this.baseUrl}/rooms/${roomId}?user_id=${userId}`;
            const data = await this.makeRequest(url);
            
            console.log('✅ BankApiService: Данные комнаты загружены');
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка загрузки данных комнаты:', error);
            throw error;
        }
    }
    
    /**
     * Выполнить перевод
     */
    async executeTransfer(roomId, userId, recipientIndex, amount) {
        console.log('💸 BankApiService: Выполнение перевода', { 
            roomId, userId, recipientIndex, amount 
        });
        
        try {
            const url = `${this.baseUrl}/rooms/${roomId}/transfer`;
            const data = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    recipient_index: recipientIndex,
                    amount: amount
                })
            });
            
            console.log('✅ BankApiService: Перевод выполнен успешно');
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка выполнения перевода:', error);
            throw error;
        }
    }
    
    /**
     * Загрузить финансовые данные игрока
     */
    async loadPlayerFinancialData(roomId, playerIndex) {
        console.log('💰 BankApiService: Загрузка финансовых данных', { roomId, playerIndex });
        
        try {
            const url = `${this.baseUrl}/rooms/${roomId}/player/${playerIndex}/financial`;
            const data = await this.makeRequest(url);
            
            console.log('✅ BankApiService: Финансовые данные загружены');
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка загрузки финансовых данных:', error);
            throw error;
        }
    }
    
    /**
     * Загрузить информацию о ходе
     */
    async loadTurnInfo(roomId) {
        console.log('🔄 BankApiService: Загрузка информации о ходе', { roomId });
        
        try {
            const url = `${this.baseUrl}/rooms/${roomId}/turn`;
            const data = await this.makeRequest(url);
            
            console.log('✅ BankApiService: Информация о ходе загружена');
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка загрузки информации о ходе:', error);
            throw error;
        }
    }
    
    /**
     * Запросить кредит
     */
    async requestCredit(roomId, userId, amount) {
        console.log('💳 BankApiService: Запрос кредита', { roomId, userId, amount });
        
        try {
            // Сначала получаем данные комнаты чтобы найти player_index
            console.log('📡 BankApiService: Загружаем данные комнаты для определения player_index');
            const roomData = await this.loadRoomData(roomId, userId);
            const playerIndex = this.getCurrentPlayerIndex(roomData);
            
            console.log('📡 BankApiService: Отправляем запрос на кредит', { playerIndex, amount });
            const url = `${this.baseUrl}/rooms/${roomId}/take-credit`;
            console.log('📡 BankApiService: URL запроса', url);
            const data = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify({
                    player_index: playerIndex,
                    amount: amount
                })
            });
            
            console.log('✅ BankApiService: Кредит запрошен успешно', data);
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка запроса кредита:', error);
            console.error('❌ BankApiService: Детали ошибки:', {
                message: error.message,
                status: error.status,
                response: error.response
            });
            throw error;
        }
    }
    
    /**
     * Погасить кредит
     */
    async payoffCredit(roomId, userId, amount) {
        console.log('💳 BankApiService: Погашение кредита', { roomId, userId, amount });
        
        try {
            // Сначала получаем данные комнаты чтобы найти player_index
            const roomData = await this.loadRoomData(roomId, userId);
            const playerIndex = this.getCurrentPlayerIndex(roomData);
            
            const url = `${this.baseUrl}/rooms/${roomId}/payoff-credit`;
            const data = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify({
                    player_index: playerIndex,
                    amount: amount
                })
            });
            
            console.log('✅ BankApiService: Кредит погашен успешно');
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка погашения кредита:', error);
            throw error;
        }
    }
}

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.BankApiService = BankApiService;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankApiService;
}
