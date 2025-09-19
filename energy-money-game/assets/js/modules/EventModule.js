/**
 * Модуль событий для игры "Энергия денег"
 * Обрабатывает игровые события (PAYDAY, благотворительность, банкротство)
 */

export class EventModule {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.eventQueue = [];
        this.processingEvents = false;
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.isDestroyed = false;
    }

    /**
     * Инициализация модуля событий
     */
    async init() {
        console.log('⚡ EventModule инициализирован');
        
        // Подписка на события
        this.gameCore.eventBus.on('playerMoved', this.onPlayerMoved.bind(this));
        this.gameCore.eventBus.on('playerTurnEnded', this.onPlayerTurnEnded.bind(this));
        this.gameCore.eventBus.on('cardProcessed', this.onCardProcessed.bind(this));
    }

    /**
     * Добавление события в очередь
     * @param {Object} event - Событие
     */
    queueEvent(event) {
        if (this.isDestroyed) {
            console.warn('EventModule уничтожен, событие не может быть добавлено');
            return false;
        }

        const eventData = {
            ...event,
            id: this.generateEventId(),
            timestamp: Date.now(),
            processed: false
        };

        this.eventQueue.push(eventData);
        
        console.log(`⚡ Событие добавлено в очередь: ${event.type}`);
        
        // Автоматическая обработка очереди
        this.processEventQueue();
        
        return eventData.id;
    }

    /**
     * Обработка очереди событий
     */
    async processEventQueue() {
        if (this.processingEvents || this.eventQueue.length === 0) {
            return;
        }

        this.processingEvents = true;

        try {
            while (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift();
                await this.processEvent(event);
            }
        } catch (error) {
            console.error('Ошибка обработки очереди событий:', error);
        } finally {
            this.processingEvents = false;
        }
    }

    /**
     * Обработка конкретного события
     * @param {Object} event - Событие
     */
    async processEvent(event) {
        try {
            console.log(`⚡ Обработка события: ${event.type}`);
            
            let result = null;
            
            switch (event.type) {
                case 'payday':
                    result = await this.processPaydayEvent(event);
                    break;
                case 'charity':
                    result = await this.processCharityEvent(event);
                    break;
                case 'bankruptcy':
                    result = await this.processBankruptcyEvent(event);
                    break;
                case 'card_draw':
                    result = await this.processCardDrawEvent(event);
                    break;
                case 'movement':
                    result = await this.processMovementEvent(event);
                    break;
                default:
                    console.warn(`Неизвестный тип события: ${event.type}`);
                    result = { success: false, message: 'Неизвестное событие' };
            }

            // Сохранение в историю
            this.saveToHistory(event, result);
            
            // Эмиссия события обработки
            this.gameCore.eventBus.emit('eventProcessed', {
                event,
                result,
                timestamp: Date.now()
            });

            event.processed = true;
            
            return result;

        } catch (error) {
            console.error('Ошибка обработки события:', error);
            
            const errorResult = {
                success: false,
                message: 'Ошибка обработки события',
                error: error.message
            };
            
            this.saveToHistory(event, errorResult);
            
            return errorResult;
        }
    }

    /**
     * Обработка события PAYDAY
     * @param {Object} event - Событие
     */
    async processPaydayEvent(event) {
        const playerManager = this.gameCore.getModule('playerManager');
        const bankModule = this.gameCore.getModule('bankModule');
        const player = playerManager.getPlayer(event.playerId);
        
        if (!player) {
            return { success: false, message: 'Игрок не найден' };
        }

        try {
            // Расчет общего дохода
            const totalIncome = player.monthlyIncome + player.passiveIncome;
            
            // Добавление дохода
            playerManager.updateBalance(player.id, totalIncome, 'PAYDAY - Зарплата');
            
            // Обработка кредитов (автоматическое списание)
            if (player.creditAmount > 0 && bankModule) {
                const creditInterest = Math.round(player.creditAmount * 0.10); // 10% в месяц
                playerManager.updateBalance(player.id, -creditInterest, 'Проценты по кредиту');
                
                // Проверка банкротства после списания процентов
                if (player.balance < 0) {
                    this.queueEvent({
                        type: 'bankruptcy',
                        playerId: player.id,
                        reason: 'insufficient_funds_after_credit_payment'
                    });
                }
            }
            
            // Обработка расходов
            if (player.monthlyExpenses > 0) {
                playerManager.updateBalance(player.id, -player.monthlyExpenses, 'PAYDAY - Расходы');
                
                // Проверка банкротства после расходов
                if (player.balance < 0) {
                    this.queueEvent({
                        type: 'bankruptcy',
                        playerId: player.id,
                        reason: 'insufficient_funds_after_expenses'
                    });
                }
            }
            
            // Обновление даты последнего PAYDAY
            playerManager.updatePlayer(player.id, {
                lastPayday: Date.now()
            });
            
            console.log(`💰 PAYDAY обработан для игрока ${player.name}: +$${totalIncome}`);
            
            return {
                success: true,
                message: `PAYDAY: +$${totalIncome}`,
                income: totalIncome,
                expenses: player.monthlyExpenses,
                creditInterest: player.creditAmount > 0 ? Math.round(player.creditAmount * 0.10) : 0
            };
            
        } catch (error) {
            console.error('Ошибка обработки PAYDAY:', error);
            return { success: false, message: 'Ошибка обработки PAYDAY' };
        }
    }

    /**
     * Обработка события благотворительности
     * @param {Object} event - Событие
     */
    async processCharityEvent(event) {
        const playerManager = this.gameCore.getModule('playerManager');
        const player = playerManager.getPlayer(event.playerId);
        
        if (!player) {
            return { success: false, message: 'Игрок не найден' };
        }

        try {
            // Расчет суммы благотворительности (10% от дохода)
            const charityAmount = Math.round(player.monthlyIncome * 0.10);
            
            if (charityAmount <= 0) {
                return { success: true, message: 'Нет дохода для благотворительности' };
            }
            
            // Проверка достаточности средств
            if (player.balance < charityAmount) {
                return { 
                    success: false, 
                    message: `Недостаточно средств для благотворительности. Нужно: $${charityAmount}` 
                };
            }
            
            // Списание средств
            playerManager.updateBalance(player.id, -charityAmount, `Благотворительность (10% от дохода)`);
            
            // Обновление даты последней благотворительности
            playerManager.updatePlayer(player.id, {
                lastCharity: Date.now()
            });
            
            console.log(`❤️ Благотворительность обработана для игрока ${player.name}: -$${charityAmount}`);
            
            return {
                success: true,
                message: `Благотворительность: -$${charityAmount}`,
                amount: charityAmount
            };
            
        } catch (error) {
            console.error('Ошибка обработки благотворительности:', error);
            return { success: false, message: 'Ошибка обработки благотворительности' };
        }
    }

    /**
     * Обработка события банкротства
     * @param {Object} event - Событие
     */
    async processBankruptcyEvent(event) {
        const playerManager = this.gameCore.getModule('playerManager');
        const player = playerManager.getPlayer(event.playerId);
        
        if (!player) {
            return { success: false, message: 'Игрок не найден' };
        }

        try {
            console.log(`💸 Обработка банкротства игрока ${player.name}`);
            
            // Сброс состояния игрока
            playerManager.updatePlayer(player.id, {
                balance: 0,
                creditAmount: 0,
                assets: [],
                passiveIncome: 0,
                position: 0,
                track: 'inner',
                isBankrupt: true,
                bankruptcyCount: (player.bankruptcyCount || 0) + 1
            });
            
            // Эмиссия события банкротства
            this.gameCore.eventBus.emit('playerBankrupted', {
                player,
                reason: event.reason,
                bankruptcyCount: player.bankruptcyCount
            });
            
            return {
                success: true,
                message: `Игрок ${player.name} обанкротился`,
                bankruptcyCount: player.bankruptcyCount
            };
            
        } catch (error) {
            console.error('Ошибка обработки банкротства:', error);
            return { success: false, message: 'Ошибка обработки банкротства' };
        }
    }

    /**
     * Обработка события взятия карты
     * @param {Object} event - Событие
     */
    async processCardDrawEvent(event) {
        const cardModule = this.gameCore.getModule('cardModule');
        
        if (!cardModule) {
            return { success: false, message: 'Модуль карт не найден' };
        }

        try {
            const card = cardModule.drawCard(event.deckType, event.options);
            
            if (!card) {
                return { success: false, message: 'Не удалось взять карту' };
            }
            
            return {
                success: true,
                message: `Взята карта: ${card.name}`,
                card
            };
            
        } catch (error) {
            console.error('Ошибка обработки взятия карты:', error);
            return { success: false, message: 'Ошибка взятия карты' };
        }
    }

    /**
     * Обработка события движения
     * @param {Object} event - Событие
     */
    async processMovementEvent(event) {
        const movementModule = this.gameCore.getModule('movementModule');
        
        if (!movementModule) {
            return { success: false, message: 'Модуль движения не найден' };
        }

        try {
            const result = await movementModule.movePlayer(event.playerId, event.steps, event.options);
            
            if (!result) {
                return { success: false, message: 'Не удалось переместить игрока' };
            }
            
            return {
                success: true,
                message: `Игрок перемещен на позицию ${result.position}`,
                position: result.position,
                cell: result.cell
            };
            
        } catch (error) {
            console.error('Ошибка обработки движения:', error);
            return { success: false, message: 'Ошибка движения' };
        }
    }

    /**
     * Создание события PAYDAY
     * @param {string} playerId - ID игрока
     */
    createPaydayEvent(playerId) {
        return this.queueEvent({
            type: 'payday',
            playerId,
            priority: 'high'
        });
    }

    /**
     * Создание события благотворительности
     * @param {string} playerId - ID игрока
     */
    createCharityEvent(playerId) {
        return this.queueEvent({
            type: 'charity',
            playerId,
            priority: 'medium'
        });
    }

    /**
     * Создание события банкротства
     * @param {string} playerId - ID игрока
     * @param {string} reason - Причина банкротства
     */
    createBankruptcyEvent(playerId, reason = 'insufficient_funds') {
        return this.queueEvent({
            type: 'bankruptcy',
            playerId,
            reason,
            priority: 'high'
        });
    }

    /**
     * Получение истории событий
     * @param {number} limit - Лимит записей
     */
    getHistory(limit = 10) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Сохранение в историю
     * @param {Object} event - Событие
     * @param {Object} result - Результат обработки
     */
    saveToHistory(event, result) {
        this.eventHistory.push({
            event,
            result,
            timestamp: Date.now()
        });

        // Ограничение размера истории
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Получение статистики
     */
    getStats() {
        const totalEvents = this.eventHistory.length;
        const eventTypes = {};
        
        this.eventHistory.forEach(entry => {
            const type = entry.event.type;
            eventTypes[type] = (eventTypes[type] || 0) + 1;
        });
        
        return {
            totalEvents,
            eventTypes,
            queueLength: this.eventQueue.length,
            processingEvents: this.processingEvents
        };
    }

    /**
     * Генерация ID события
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Обработчики событий
     */
    onPlayerMoved(data) {
        // Автоматическая обработка событий при движении
        const cell = data.cell;
        
        if (cell) {
            switch (cell.type) {
                case 'payday':
                    this.createPaydayEvent(data.playerId);
                    break;
                case 'charity':
                    this.createCharityEvent(data.playerId);
                    break;
            }
        }
    }

    onPlayerTurnEnded(player) {
        // Очистка очереди событий при завершении хода
        this.eventQueue = this.eventQueue.filter(event => event.playerId === player.id);
    }

    onCardProcessed(data) {
        // Обработка результатов карт
        if (data.result && data.result.financialImpact !== 0) {
            const playerManager = this.gameCore.getModule('playerManager');
            const player = playerManager.getPlayer(data.player);
            
            if (player && player.balance < 0) {
                this.createBankruptcyEvent(player.id, 'insufficient_funds_after_card');
            }
        }
    }

    /**
     * Уничтожение модуля событий
     */
    destroy() {
        this.eventQueue = [];
        this.eventHistory = [];
        this.processingEvents = false;
        this.isDestroyed = true;
        console.log('🗑️ EventModule уничтожен');
    }
}

export default EventModule;
