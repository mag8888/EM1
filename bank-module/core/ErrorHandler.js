/**
 * ОБРАБОТЧИК ОШИБОК
 * Централизованная обработка и классификация ошибок
 */

export class BankError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'BankError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

export class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        this.errorTypes = {
            NETWORK_ERROR: 'NETWORK_ERROR',
            VALIDATION_ERROR: 'VALIDATION_ERROR',
            API_ERROR: 'API_ERROR',
            DOM_ERROR: 'DOM_ERROR',
            BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
            UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        };
    }

    /**
     * Обработать ошибку
     * @param {Error} error - Ошибка
     * @param {string} context - Контекст ошибки
     * @param {Object} options - Дополнительные опции
     * @returns {BankError} Обработанная ошибка
     */
    handle(error, context = 'Unknown', options = {}) {
        const bankError = this.classifyError(error, context);
        
        this.logger.error(`Error in ${context}:`, {
            message: bankError.message,
            code: bankError.code,
            details: bankError.details,
            originalError: error
        });

        // Показать пользователю уведомление об ошибке
        if (options.showToUser !== false) {
            this.showUserError(bankError, options);
        }

        return bankError;
    }

    /**
     * Классифицировать ошибку
     * @param {Error} error - Ошибка
     * @param {string} context - Контекст
     * @returns {BankError} Классифицированная ошибка
     */
    classifyError(error, context) {
        if (error instanceof BankError) {
            return error;
        }

        let code = this.errorTypes.UNKNOWN_ERROR;
        let message = error.message || 'Неизвестная ошибка';
        let details = { originalError: error.name, context };

        // Классификация по типу ошибки
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            code = this.errorTypes.NETWORK_ERROR;
            message = 'Ошибка сети. Проверьте подключение к интернету.';
        } else if (error.name === 'TypeError' && error.message.includes('Cannot read property')) {
            code = this.errorTypes.DOM_ERROR;
            message = 'Ошибка отображения. Элемент не найден.';
        } else if (error.message.includes('validation') || error.message.includes('required')) {
            code = this.errorTypes.VALIDATION_ERROR;
            message = 'Ошибка валидации данных.';
        } else if (error.message.includes('API') || error.message.includes('HTTP')) {
            code = this.errorTypes.API_ERROR;
            message = 'Ошибка сервера. Попробуйте позже.';
        }

        return new BankError(message, code, details);
    }

    /**
     * Показать ошибку пользователю
     * @param {BankError} error - Ошибка
     * @param {Object} options - Опции
     */
    showUserError(error, options = {}) {
        // Создаем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'bank-error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 1.2rem; margin-right: 8px;">⚠️</span>
                <span style="font-size: 1rem;">Ошибка банка</span>
            </div>
            <div style="font-size: 0.9rem; opacity: 0.9;">
                ${error.message}
            </div>
            ${options.showDetails ? `<div style="font-size: 0.8rem; opacity: 0.7; margin-top: 5px;">
                Код: ${error.code}
            </div>` : ''}
        `;

        // Добавляем CSS анимацию если её нет
        if (!document.getElementById('bankErrorAnimationCSS')) {
            const style = document.createElement('style');
            style.id = 'bankErrorAnimationCSS';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Удаляем уведомление через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    /**
     * Создать ошибку валидации
     * @param {string} message - Сообщение об ошибке
     * @param {Object} details - Детали ошибки
     * @returns {BankError} Ошибка валидации
     */
    createValidationError(message, details = {}) {
        return new BankError(message, this.errorTypes.VALIDATION_ERROR, details);
    }

    /**
     * Создать ошибку API
     * @param {string} message - Сообщение об ошибке
     * @param {Object} details - Детали ошибки
     * @returns {BankError} Ошибка API
     */
    createApiError(message, details = {}) {
        return new BankError(message, this.errorTypes.API_ERROR, details);
    }
}
