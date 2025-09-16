/**
 * СЕРВИС ХРАНИЛИЩА
 * Централизованная работа с localStorage и кэшированием
 */

import { ErrorHandler } from '../core/ErrorHandler.js';

export class StorageService {
    constructor(config, logger, errorHandler) {
        this.config = config;
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }

    /**
     * Получить данные пользователя
     * @returns {Object|null} Данные пользователя
     */
    getUser() {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                this.logger.warn('User data not found in localStorage');
                return null;
            }

            const user = JSON.parse(userData);
            this.validateUser(user);
            return user;
        } catch (error) {
            this.errorHandler.handle(error, 'Getting user from storage');
            return null;
        }
    }

    /**
     * Сохранить данные пользователя
     * @param {Object} user - Данные пользователя
     */
    setUser(user) {
        try {
            this.validateUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            this.logger.debug('User data saved to localStorage');
        } catch (error) {
            this.errorHandler.handle(error, 'Saving user to storage');
        }
    }

    /**
     * Получить ID комнаты из URL
     * @returns {string|null} ID комнаты
     */
    getRoomIdFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const roomId = urlParams.get('room');
            
            if (!roomId) {
                this.logger.warn('Room ID not found in URL');
                return null;
            }

            return roomId;
        } catch (error) {
            this.errorHandler.handle(error, 'Getting room ID from URL');
            return null;
        }
    }

    /**
     * Получить данные из кэша
     * @param {string} key - Ключ кэша
     * @returns {*} Данные из кэша
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        // Проверяем, не истек ли кэш
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired for key: ${key}`);
            return null;
        }

        this.logger.debug(`Cache hit for key: ${key}`);
        return cached.data;
    }

    /**
     * Сохранить данные в кэш
     * @param {string} key - Ключ кэша
     * @param {*} data - Данные для кэширования
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        this.logger.debug(`Data cached with key: ${key}`);
    }

    /**
     * Очистить кэш
     * @param {string} key - Ключ кэша (опционально)
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            this.logger.debug(`Cache cleared for key: ${key}`);
        } else {
            this.cache.clear();
            this.logger.debug('All cache cleared');
        }
    }

    /**
     * Получить данные комнаты из кэша
     * @param {string} roomId - ID комнаты
     * @returns {Object|null} Данные комнаты
     */
    getRoomDataFromCache(roomId) {
        return this.getFromCache(`room_${roomId}`);
    }

    /**
     * Сохранить данные комнаты в кэш
     * @param {string} roomId - ID комнаты
     * @param {Object} data - Данные комнаты
     */
    setRoomDataCache(roomId, data) {
        this.setCache(`room_${roomId}`, data);
    }

    /**
     * Получить финансовые данные из кэша
     * @param {string} roomId - ID комнаты
     * @param {number} playerIndex - Индекс игрока
     * @returns {Object|null} Финансовые данные
     */
    getFinancialDataFromCache(roomId, playerIndex) {
        return this.getFromCache(`financial_${roomId}_${playerIndex}`);
    }

    /**
     * Сохранить финансовые данные в кэш
     * @param {string} roomId - ID комнаты
     * @param {number} playerIndex - Индекс игрока
     * @param {Object} data - Финансовые данные
     */
    setFinancialDataCache(roomId, playerIndex, data) {
        this.setCache(`financial_${roomId}_${playerIndex}`, data);
    }

    /**
     * Валидировать данные пользователя
     * @param {Object} user - Данные пользователя
     * @throws {BankError} Если данные невалидны
     */
    validateUser(user) {
        if (!user || typeof user !== 'object') {
            throw this.errorHandler.createValidationError('Invalid user data format');
        }

        if (!user.id) {
            throw this.errorHandler.createValidationError('User ID is required');
        }

        if (typeof user.id !== 'string' && typeof user.id !== 'number') {
            throw this.errorHandler.createValidationError('User ID must be string or number');
        }
    }

    /**
     * Получить настройки приложения
     * @returns {Object} Настройки
     */
    getAppSettings() {
        try {
            const settings = localStorage.getItem('bankAppSettings');
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            this.logger.warn('Failed to load app settings, using defaults');
            return {};
        }
    }

    /**
     * Сохранить настройки приложения
     * @param {Object} settings - Настройки
     */
    setAppSettings(settings) {
        try {
            localStorage.setItem('bankAppSettings', JSON.stringify(settings));
            this.logger.debug('App settings saved');
        } catch (error) {
            this.errorHandler.handle(error, 'Saving app settings');
        }
    }

    /**
     * Очистить все данные
     */
    clearAll() {
        try {
            localStorage.removeItem('user');
            localStorage.removeItem('bankAppSettings');
            this.cache.clear();
            this.logger.info('All data cleared');
        } catch (error) {
            this.errorHandler.handle(error, 'Clearing all data');
        }
    }
}
