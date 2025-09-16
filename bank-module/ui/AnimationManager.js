/**
 * МЕНЕДЖЕР АНИМАЦИЙ
 * Централизованное управление анимациями UI
 */

export class AnimationManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.activeAnimations = new Set();
        this.animationId = 0;
    }

    /**
     * Показать анимацию изменения баланса
     * @param {number} oldBalance - Старый баланс
     * @param {number} newBalance - Новый баланс
     */
    animateBalanceChange(oldBalance, newBalance) {
        const difference = newBalance - oldBalance;
        const isIncrease = difference > 0;
        
        this.logger.debug(`Animating balance change: ${oldBalance} → ${newBalance} (${isIncrease ? '+' : ''}${difference})`);
        
        // Анимируем элементы баланса
        this.animateBalanceElements();
        
        // Показываем уведомление
        if (Math.abs(difference) > 0) {
            this.showBalanceNotification(difference, newBalance, isIncrease);
        }
    }

    /**
     * Анимировать элементы баланса
     */
    animateBalanceElements() {
        const selectors = this.config.get('selectors', {});
        const balanceSelectors = [
            selectors.currentBalance,
            selectors.bankPreviewBalance,
            '[data-balance]',
            '.balance-amount',
            '#currentBalance'
        ];

        balanceSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.addPulseAnimation(element);
            });
        });
    }

    /**
     * Добавить анимацию пульсации
     * @param {Element} element - DOM элемент
     */
    addPulseAnimation(element) {
        element.classList.add('balance-pulse');
        setTimeout(() => {
            element.classList.remove('balance-pulse');
        }, this.config.get('balanceAnimationDuration', 500));
    }

    /**
     * Показать уведомление об изменении баланса
     * @param {number} difference - Разность баланса
     * @param {number} newBalance - Новый баланс
     * @param {boolean} isIncrease - Увеличение баланса
     */
    showBalanceNotification(difference, newBalance, isIncrease) {
        const notification = this.createBalanceNotification(difference, newBalance, isIncrease);
        document.body.appendChild(notification);

        // Удаляем уведомление через время
        setTimeout(() => {
            this.removeNotification(notification);
        }, this.config.get('notificationDuration', 3000));
    }

    /**
     * Создать уведомление об изменении баланса
     * @param {number} difference - Разность баланса
     * @param {number} newBalance - Новый баланс
     * @param {boolean} isIncrease - Увеличение баланса
     * @returns {Element} Элемент уведомления
     */
    createBalanceNotification(difference, newBalance, isIncrease) {
        const notification = document.createElement('div');
        notification.className = 'bank-balance-notification';
        
        const gradient = isIncrease 
            ? 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${gradient};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 2000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        notification.innerHTML = `
            <div style="font-size: 1.1rem;">
                ${isIncrease ? '💰' : '💸'} ${isIncrease ? '+' : ''}$${difference.toLocaleString()}
            </div>
            <div style="font-size: 0.9rem; opacity: 0.9;">
                Баланс: $${newBalance.toLocaleString()}
            </div>
        `;

        this.ensureAnimationStyles();
        return notification;
    }

    /**
     * Показать анимацию перевода
     * @param {number} amount - Сумма перевода
     * @param {string} recipientName - Имя получателя
     */
    showTransferAnimation(amount, recipientName) {
        this.logger.debug(`Showing transfer animation: $${amount} → ${recipientName}`);
        
        const animation = this.createTransferAnimation(amount, recipientName);
        document.body.appendChild(animation);

        // Удаляем анимацию через время
        setTimeout(() => {
            this.removeNotification(animation);
        }, this.config.get('animationDuration', 1000));
    }

    /**
     * Создать анимацию перевода
     * @param {number} amount - Сумма перевода
     * @param {string} recipientName - Имя получателя
     * @returns {Element} Элемент анимации
     */
    createTransferAnimation(amount, recipientName) {
        const animation = document.createElement('div');
        animation.className = 'bank-transfer-animation';
        
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

        this.ensureAnimationStyles();
        return animation;
    }

    /**
     * Показать индикатор загрузки
     * @param {string} message - Сообщение загрузки
     */
    showLoadingIndicator(message = 'Загрузка...') {
        const loading = this.createLoadingIndicator(message);
        document.body.appendChild(loading);
        this.activeAnimations.add(loading);
    }

    /**
     * Скрыть индикатор загрузки
     */
    hideLoadingIndicator() {
        this.activeAnimations.forEach(loading => {
            this.removeNotification(loading);
        });
        this.activeAnimations.clear();
    }

    /**
     * Создать индикатор загрузки
     * @param {string} message - Сообщение загрузки
     * @returns {Element} Элемент индикатора
     */
    createLoadingIndicator(message) {
        const loading = document.createElement('div');
        loading.className = 'bank-loading-indicator';
        
        loading.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            z-index: 4000;
            font-size: 1rem;
            text-align: center;
            animation: fadeIn 0.3s ease;
        `;

        loading.innerHTML = `
            <div style="margin-bottom: 10px;">
                <div class="spinner" style="
                    width: 20px;
                    height: 20px;
                    border: 2px solid #ffffff40;
                    border-top: 2px solid #ffffff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
            <div>${message}</div>
        `;

        this.ensureAnimationStyles();
        return loading;
    }

    /**
     * Удалить уведомление
     * @param {Element} notification - Элемент уведомления
     */
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * Убедиться, что стили анимации добавлены
     */
    ensureAnimationStyles() {
        if (document.getElementById('bankAnimationStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'bankAnimationStyles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes transferPulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .balance-pulse {
                animation: balancePulse 0.5s ease;
            }
            @keyframes balancePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Очистить все активные анимации
     */
    clearAllAnimations() {
        this.activeAnimations.forEach(animation => {
            this.removeNotification(animation);
        });
        this.activeAnimations.clear();
    }
}
