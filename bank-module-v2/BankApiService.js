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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
            const url = `${this.baseUrl}/rooms/${roomId}/credit`;
            const data = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    amount: amount
                })
            });
            
            console.log('✅ BankApiService: Кредит запрошен успешно');
            return data;
        } catch (error) {
            console.error('❌ BankApiService: Ошибка запроса кредита:', error);
            throw error;
        }
    }
    
    /**
     * Погасить кредит
     */
    async payoffCredit(roomId, userId, amount) {
        console.log('💳 BankApiService: Погашение кредита', { roomId, userId, amount });
        
        try {
            const url = `${this.baseUrl}/rooms/${roomId}/payoff-credit`;
            const data = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
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
