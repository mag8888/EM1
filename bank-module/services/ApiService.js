/**
 * СЕРВИС API
 * Централизованная работа с API сервера
 */

import { ErrorHandler } from '../core/ErrorHandler.js';

export class ApiService {
    constructor(config, logger, errorHandler) {
        this.config = config;
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.baseUrl = '/api';
    }

    /**
     * Выполнить HTTP запрос
     * @param {string} endpoint - Конечная точка API
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Ответ сервера
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            this.logger.debug(`Making API request to ${url}`, requestOptions);

            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw this.errorHandler.createApiError(
                    errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                    { status: response.status, statusText: response.statusText, url }
                );
            }

            const data = await response.json();
            this.logger.debug(`API response received`, { url, data });
            
            return data;
        } catch (error) {
            if (error instanceof BankError) {
                throw error;
            }
            throw this.errorHandler.handle(error, `API request to ${url}`);
        }
    }

    /**
     * Получить данные комнаты
     * @param {string} roomId - ID комнаты
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} Данные комнаты
     */
    async getRoomData(roomId, userId) {
        return this.request(`/rooms/${roomId}?user_id=${userId}`);
    }

    /**
     * Получить финансовые данные игрока
     * @param {string} roomId - ID комнаты
     * @param {number} playerIndex - Индекс игрока
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} Финансовые данные
     */
    async getPlayerFinancialData(roomId, playerIndex, userId) {
        return this.request(`/rooms/${roomId}/player/${playerIndex}/profession?user_id=${userId}`);
    }

    /**
     * Выполнить перевод
     * @param {string} roomId - ID комнаты
     * @param {Object} transferData - Данные перевода
     * @returns {Promise<Object>} Результат перевода
     */
    async executeTransfer(roomId, transferData) {
        return this.request(`/rooms/${roomId}/transfer`, {
            method: 'POST',
            body: JSON.stringify(transferData)
        });
    }

    /**
     * Взять кредит
     * @param {string} roomId - ID комнаты
     * @param {Object} creditData - Данные кредита
     * @returns {Promise<Object>} Результат взятия кредита
     */
    async takeCredit(roomId, creditData) {
        return this.request(`/rooms/${roomId}/take-credit`, {
            method: 'POST',
            body: JSON.stringify(creditData)
        });
    }

    /**
     * Погасить кредит
     * @param {string} roomId - ID комнаты
     * @param {Object} payoffData - Данные погашения
     * @returns {Promise<Object>} Результат погашения
     */
    async payOffCredit(roomId, payoffData) {
        return this.request(`/rooms/${roomId}/payoff-credit`, {
            method: 'POST',
            body: JSON.stringify(payoffData)
        });
    }

    /**
     * Получить информацию о ходе
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Object>} Информация о ходе
     */
    async getTurnInfo(roomId) {
        return this.request(`/rooms/${roomId}/turn`);
    }
}
