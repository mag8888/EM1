/**
 * СЕРВИС ПЕРЕВОДОВ
 * Обработка всех операций с переводами
 */

import { ErrorHandler } from '../core/ErrorHandler.js';

export class TransferService {
    constructor(config, logger, errorHandler, apiService, validationService, storageService) {
        this.config = config;
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.apiService = apiService;
        this.validationService = validationService;
        this.storageService = storageService;
    }

    /**
     * Обработка перевода
     * @returns {Promise<void>}
     */
    async processTransfer() {
        try {
            this.logger.group('Processing Transfer', () => {
                this.logger.info('Starting transfer process...');
            });

            // Валидация формы
            const validation = this.validateTransferForm();
            if (!validation.valid) {
                throw this.errorHandler.createValidationError(validation.message);
            }

            // Показываем индикатор загрузки
            this.showLoadingIndicator();
            
            // Подготавливаем данные
            const transferData = this.prepareTransferData();
            
            // Отправляем запрос
            const response = await this.sendTransferRequest(transferData);
            
            if (response.ok) {
                // Получаем данные из формы для анимации
                const amountInput = document.getElementById('transferAmount');
                const recipientSelect = document.getElementById('recipientSelect');
                const transferAmount = parseFloat(amountInput.value);
                const recipientName = recipientSelect.options[recipientSelect.selectedIndex].text;
                
                // Показываем анимацию перевода
                this.showTransferAnimation(transferAmount, recipientName);
                
                // Ждем обновления баланса с сервера
                setTimeout(async () => {
                    this.logger.info('🔄 Получаем обновленный баланс с сервера...');
                    await this.loadBankData(true); // Принудительное обновление для получения актуального баланса
                    
                    // Показываем успех после обновления
                    this.showSuccess(`Перевод $${transferAmount} выполнен успешно!`);
                }, 1000); // 1 секунда задержка для анимации
                
                // Очищаем форму
                this.resetTransferForm();
                
            } else {
                throw this.errorHandler.createApiError(response.data?.message || 'Ошибка при выполнении перевода');
            }
            
        } catch (error) {
            this.errorHandler.handle(error, 'Processing transfer');
            throw error;
        } finally {
            this.hideLoadingIndicator();
        }
    }

    /**
     * Валидация формы перевода
     * @returns {Object} Результат валидации
     */
    validateTransferForm() {
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        this.logger.debug('Validating transfer form:', {
            recipientSelect: !!recipientSelect,
            amountInput: !!amountInput,
            recipientValue: recipientSelect?.value,
            amountValue: amountInput?.value
        });
        
        if (!recipientSelect || !amountInput) {
            return { valid: false, message: 'Форма не найдена' };
        }
        
        const recipientIndex = recipientSelect.value;
        const amount = parseFloat(amountInput.value);
        
        this.logger.debug('Validation values:', {
            recipientIndex,
            amount,
            amountInputValue: amountInput.value,
            minAmount: this.config.get('minTransferAmount'),
            currentBalance: this.currentBalance
        });
        
        if (!recipientIndex || recipientIndex === '') {
            return { valid: false, message: 'Выберите получателя' };
        }
        
        if (!amountInput.value || amountInput.value.trim() === '') {
            return { valid: false, message: 'Введите сумму перевода' };
        }
        
        if (isNaN(amount) || amount < 1) {
            return { valid: false, message: `Минимальная сумма: $1` };
        }
        
        if (amount > this.config.get('maxTransferAmount')) {
            return { valid: false, message: `Максимальная сумма: $${this.config.get('maxTransferAmount').toLocaleString()}` };
        }
        
        if (amount > this.currentBalance) {
            return { valid: false, message: 'Недостаточно средств на балансе' };
        }
        
        this.logger.debug('Transfer validation passed');
        return { valid: true };
    }

    /**
     * Подготовка данных перевода
     * @returns {Object} Данные перевода
     */
    prepareTransferData() {
        const roomId = this.getRoomIdFromURL();
        const user = this.storageService.getUser();
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        const transferData = {
            roomId,
            userId: user.id,
            recipientIndex: parseInt(recipientSelect.value),
            amount: parseInt(amountInput.value)
        };
        
        this.logger.debug('Prepared transfer data:', transferData);
        return transferData;
    }

    /**
     * Отправка запроса перевода
     * @param {Object} transferData - Данные перевода
     * @returns {Promise<Object>} Ответ сервера
     */
    async sendTransferRequest(transferData) {
        const requestBody = {
            user_id: transferData.userId,
            recipient_index: transferData.recipientIndex,
            amount: transferData.amount
        };
        
        this.logger.debug('Sending transfer request:', {
            url: `/api/rooms/${transferData.roomId}/transfer`,
            body: requestBody
        });
        
        const response = await this.apiService.executeTransfer(transferData.roomId, requestBody);
        
        this.logger.debug('Transfer response:', { status: 200, data: response });
        return { ok: true, data: response };
    }

    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        if (recipientSelect) recipientSelect.value = '';
        if (amountInput) amountInput.value = '';
        
        this.logger.debug('Transfer form reset');
    }

    /**
     * Показать анимацию перевода
     * @param {number} amount - Сумма перевода
     * @param {string} recipientName - Имя получателя
     */
    showTransferAnimation(amount, recipientName) {
        this.logger.debug(`💸 Анимация перевода: $${amount} → ${recipientName}`);
        
        // Создаем элемент анимации
        const animation = document.createElement('div');
        animation.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            font-size: 1.2rem;
            font-weight: bold;
            text-align: center;
            animation: transferPulse 1s ease-in-out;
        `;
        
        animation.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">💸</div>
            <div>Перевод $${amount.toLocaleString()}</div>
            <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 5px;">→ ${recipientName}</div>
        `;
        
        // Добавляем CSS анимацию
        if (!document.getElementById('transferAnimationCSS')) {
            const style = document.createElement('style');
            style.id = 'transferAnimationCSS';
            style.textContent = `
                @keyframes transferPulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Добавляем на страницу
        document.body.appendChild(animation);
        
        // Удаляем через 1 секунду
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 1000);
    }

    /**
     * Показать индикатор загрузки
     */
    showLoadingIndicator() {
        // Реализация показа индикатора загрузки
        this.logger.debug('Showing loading indicator');
    }

    /**
     * Скрыть индикатор загрузки
     */
    hideLoadingIndicator() {
        // Реализация скрытия индикатора загрузки
        this.logger.debug('Hiding loading indicator');
    }

    /**
     * Показать сообщение об успехе
     * @param {string} message - Сообщение
     */
    showSuccess(message) {
        // Реализация показа сообщения об успехе
        this.logger.info('Success:', message);
    }

    /**
     * Получить ID комнаты из URL
     * @returns {string|null} ID комнаты
     */
    getRoomIdFromURL() {
        return this.storageService.getRoomIdFromURL();
    }

    /**
     * Загрузить данные банка
     * @param {boolean} forceUpdate - Принудительное обновление
     */
    async loadBankData(forceUpdate = false) {
        // Делегируем к основному модулю
        // Этот метод должен быть реализован в основном модуле
        this.logger.debug('Loading bank data...');
    }
}
