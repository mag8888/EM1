/**
 * СЕРВИС ВАЛИДАЦИИ
 * Централизованная валидация данных
 */

import { BankError } from '../core/ErrorHandler.js';

export class ValidationService {
    constructor(config, errorHandler) {
        this.config = config;
        this.errorHandler = errorHandler;
    }

    /**
     * Валидировать сумму перевода
     * @param {number} amount - Сумма
     * @param {number} currentBalance - Текущий баланс
     * @returns {Object} Результат валидации
     */
    validateTransferAmount(amount, currentBalance) {
        const minAmount = this.config.get('minTransferAmount');
        const maxAmount = this.config.get('maxTransferAmount');

        if (!amount || isNaN(amount)) {
            throw this.errorHandler.createValidationError('Введите сумму перевода');
        }

        if (amount < minAmount) {
            throw this.errorHandler.createValidationError(`Минимальная сумма: $${minAmount}`);
        }

        if (amount > maxAmount) {
            throw this.errorHandler.createValidationError(`Максимальная сумма: $${maxAmount.toLocaleString()}`);
        }

        if (amount > currentBalance) {
            throw this.errorHandler.createValidationError('Недостаточно средств на балансе');
        }

        return { valid: true, amount: Number(amount) };
    }

    /**
     * Валидировать получателя перевода
     * @param {string|number} recipientIndex - Индекс получателя
     * @param {Array} players - Список игроков
     * @param {string} currentUserId - ID текущего пользователя
     * @returns {Object} Результат валидации
     */
    validateRecipient(recipientIndex, players, currentUserId) {
        if (!recipientIndex || recipientIndex === '') {
            throw this.errorHandler.createValidationError('Выберите получателя');
        }

        const index = Number(recipientIndex);
        if (isNaN(index) || index < 0 || index >= players.length) {
            throw this.errorHandler.createValidationError('Неверный получатель');
        }

        const recipient = players[index];
        if (!recipient || recipient.user_id === currentUserId) {
            throw this.errorHandler.createValidationError('Нельзя отправить перевод самому себе');
        }

        return { valid: true, recipientIndex: index, recipient };
    }

    /**
     * Валидировать сумму кредита
     * @param {number} amount - Сумма кредита
     * @param {number} monthlyIncome - Месячный доход
     * @returns {Object} Результат валидации
     */
    validateCreditAmount(amount, monthlyIncome) {
        const creditMultiplier = this.config.get('creditMultiplier');
        const creditRate = this.config.get('creditRate');

        if (!amount || isNaN(amount)) {
            throw this.errorHandler.createValidationError('Введите сумму кредита');
        }

        if (amount < creditMultiplier) {
            throw this.errorHandler.createValidationError(`Минимальная сумма кредита: $${creditMultiplier}`);
        }

        if (amount % creditMultiplier !== 0) {
            throw this.errorHandler.createValidationError(`Сумма должна быть кратной $${creditMultiplier}`);
        }

        const monthlyPayment = Math.floor(amount / creditMultiplier) * creditRate;
        if (monthlyIncome - monthlyPayment < 0) {
            throw this.errorHandler.createValidationError('Недостаточно денежного потока для такого кредита');
        }

        return { 
            valid: true, 
            amount: Number(amount), 
            monthlyPayment,
            newCashFlow: monthlyIncome - monthlyPayment
        };
    }

    /**
     * Валидировать данные пользователя
     * @param {Object} user - Данные пользователя
     * @returns {Object} Результат валидации
     */
    validateUser(user) {
        if (!user) {
            throw this.errorHandler.createValidationError('Пользователь не найден');
        }

        if (!user.id) {
            throw this.errorHandler.createValidationError('ID пользователя не найден');
        }

        return { valid: true, user };
    }

    /**
     * Валидировать ID комнаты
     * @param {string} roomId - ID комнаты
     * @returns {Object} Результат валидации
     */
    validateRoomId(roomId) {
        if (!roomId) {
            throw this.errorHandler.createValidationError('ID комнаты не найден');
        }

        if (typeof roomId !== 'string' || roomId.trim() === '') {
            throw this.errorHandler.createValidationError('Неверный формат ID комнаты');
        }

        return { valid: true, roomId: roomId.trim() };
    }

    /**
     * Валидировать индекс игрока
     * @param {number} playerIndex - Индекс игрока
     * @param {Array} players - Список игроков
     * @returns {Object} Результат валидации
     */
    validatePlayerIndex(playerIndex, players) {
        if (playerIndex === undefined || playerIndex === null) {
            throw this.errorHandler.createValidationError('Индекс игрока не найден');
        }

        if (isNaN(playerIndex) || playerIndex < 0 || playerIndex >= players.length) {
            throw this.errorHandler.createValidationError('Неверный индекс игрока');
        }

        return { valid: true, playerIndex: Number(playerIndex) };
    }

    /**
     * Валидировать данные перевода
     * @param {Object} transferData - Данные перевода
     * @param {number} currentBalance - Текущий баланс
     * @param {Array} players - Список игроков
     * @param {string} currentUserId - ID текущего пользователя
     * @returns {Object} Результат валидации
     */
    validateTransferData(transferData, currentBalance, players, currentUserId) {
        const { recipientIndex, amount } = transferData;

        // Валидируем получателя
        const recipientValidation = this.validateRecipient(recipientIndex, players, currentUserId);
        
        // Валидируем сумму
        const amountValidation = this.validateTransferAmount(amount, currentBalance);

        return {
            valid: true,
            recipientIndex: recipientValidation.recipientIndex,
            recipient: recipientValidation.recipient,
            amount: amountValidation.amount
        };
    }
}
