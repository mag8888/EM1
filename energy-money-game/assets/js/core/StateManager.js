/**
 * Менеджер состояния игры "Энергия денег"
 * Управляет глобальным состоянием приложения
 */

export class StateManager {
    constructor() {
        this.state = {};
        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.isDestroyed = false;
    }

    /**
     * Инициализация StateManager
     */
    async init() {
        console.log('🗂️ StateManager инициализирован');
        
        // Загрузка состояния из localStorage
        await this.loadFromStorage();
    }

    /**
     * Установка состояния
     * @param {Object} newState - Новое состояние
     * @param {boolean} saveToHistory - Сохранять ли в историю
     */
    setState(newState, saveToHistory = true) {
        if (this.isDestroyed) {
            console.warn('StateManager уничтожен, установка состояния невозможна');
            return;
        }

        const oldState = { ...this.state };
        
        // Объединение состояний
        this.state = { ...this.state, ...newState };
        
        // Сохранение в историю
        if (saveToHistory) {
            this.saveToHistory(oldState, newState);
        }
        
        // Уведомление подписчиков об изменениях
        this.notifySubscribers(newState, oldState);
        
        // Сохранение в localStorage
        this.saveToStorage();
        
        // Логирование изменений (в режиме разработки)
        if (this.config?.debug) {
            console.log('📝 Состояние обновлено:', newState);
        }
    }

    /**
     * Получение состояния
     * @param {string} key - Ключ состояния (опционально)
     */
    getState(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }

    /**
     * Подписка на изменения состояния
     * @param {string} key - Ключ состояния
     * @param {Function} callback - Функция обратного вызова
     * @param {Object} options - Опции подписки
     */
    subscribe(key, callback, options = {}) {
        if (this.isDestroyed) {
            console.warn('StateManager уничтожен, подписка невозможна');
            return;
        }

        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, []);
        }

        const subscription = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            id: this.generateSubscriptionId()
        };

        this.subscribers.get(key).push(subscription);
        
        // Сортировка по приоритету
        this.subscribers.get(key).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Отписка от изменений состояния
     * @param {string} key - Ключ состояния
     * @param {Function} callback - Функция обратного вызова
     */
    unsubscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            return;
        }

        const subscriptions = this.subscribers.get(key);
        const index = subscriptions.findIndex(sub => sub.callback === callback);
        
        if (index > -1) {
            subscriptions.splice(index, 1);
        }

        // Удаление ключа, если нет подписчиков
        if (subscriptions.length === 0) {
            this.subscribers.delete(key);
        }
    }

    /**
     * Уведомление подписчиков об изменениях
     * @param {Object} newState - Новое состояние
     * @param {Object} oldState - Старое состояние
     */
    notifySubscribers(newState, oldState) {
        // Уведомление подписчиков на конкретные ключи
        Object.keys(newState).forEach(key => {
            if (this.subscribers.has(key)) {
                const subscriptions = [...this.subscribers.get(key)];
                
                subscriptions.forEach(subscription => {
                    try {
                        if (subscription.once) {
                            this.unsubscribe(key, subscription.callback);
                        }

                        const changeData = {
                            key,
                            newValue: newState[key],
                            oldValue: oldState[key],
                            timestamp: Date.now()
                        };

                        if (subscription.context) {
                            subscription.callback.call(subscription.context, changeData);
                        } else {
                            subscription.callback(changeData);
                        }

                    } catch (error) {
                        console.error(`Ошибка в подписчике состояния ${key}:`, error);
                    }
                });
            }
        });

        // Уведомление глобальных подписчиков
        if (this.subscribers.has('*')) {
            const globalSubscriptions = [...this.subscribers.get('*')];
            
            globalSubscriptions.forEach(subscription => {
                try {
                    if (subscription.once) {
                        this.unsubscribe('*', subscription.callback);
                    }

                    const changeData = {
                        newState: { ...this.state },
                        oldState,
                        timestamp: Date.now()
                    };

                    if (subscription.context) {
                        subscription.callback.call(subscription.context, changeData);
                    } else {
                        subscription.callback(changeData);
                    }

                } catch (error) {
                    console.error('Ошибка в глобальном подписчике состояния:', error);
                }
            });
        }
    }

    /**
     * Сохранение в историю
     * @param {Object} oldState - Старое состояние
     * @param {Object} newState - Новое состояние
     */
    saveToHistory(oldState, newState) {
        const historyEntry = {
            timestamp: Date.now(),
            oldState,
            newState,
            changes: this.getChanges(oldState, newState)
        };

        this.history.push(historyEntry);

        // Ограничение размера истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Получение изменений между состояниями
     * @param {Object} oldState - Старое состояние
     * @param {Object} newState - Новое состояние
     */
    getChanges(oldState, newState) {
        const changes = {};

        Object.keys(newState).forEach(key => {
            if (oldState[key] !== newState[key]) {
                changes[key] = {
                    from: oldState[key],
                    to: newState[key]
                };
            }
        });

        return changes;
    }

    /**
     * Откат к предыдущему состоянию
     * @param {number} steps - Количество шагов назад
     */
    undo(steps = 1) {
        if (this.history.length < steps) {
            console.warn('Недостаточно истории для отката');
            return false;
        }

        const historyEntry = this.history[this.history.length - steps];
        this.setState(historyEntry.oldState, false);
        
        // Удаление из истории
        this.history.splice(-steps, steps);
        
        return true;
    }

    /**
     * Получение истории изменений
     * @param {number} limit - Лимит записей
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * Очистка истории
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Сохранение в localStorage
     */
    saveToStorage() {
        try {
            const stateToSave = {
                state: this.state,
                timestamp: Date.now()
            };
            
            localStorage.setItem('gameState', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Ошибка сохранения состояния в localStorage:', error);
        }
    }

    /**
     * Загрузка из localStorage
     */
    async loadFromStorage() {
        try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                
                // Проверка актуальности сохраненного состояния
                const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000; // 24 часа
                
                if (isRecent) {
                    this.state = { ...this.state, ...parsed.state };
                    console.log('📂 Состояние загружено из localStorage');
                } else {
                    console.log('⏰ Сохраненное состояние устарело, используется по умолчанию');
                }
            }
        } catch (error) {
            console.warn('Ошибка загрузки состояния из localStorage:', error);
        }
    }

    /**
     * Очистка состояния
     * @param {Array} keysToKeep - Ключи, которые нужно сохранить
     */
    clearState(keysToKeep = []) {
        const newState = {};
        
        keysToKeep.forEach(key => {
            if (this.state.hasOwnProperty(key)) {
                newState[key] = this.state[key];
            }
        });
        
        this.state = newState;
        this.saveToStorage();
    }

    /**
     * Генерация уникального ID для подписки
     */
    generateSubscriptionId() {
        return `state_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Установка конфигурации
     * @param {Object} config - Конфигурация
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
        this.maxHistorySize = config.maxHistorySize || this.maxHistorySize;
    }

    /**
     * Получение статистики состояния
     */
    getStats() {
        return {
            stateKeys: Object.keys(this.state).length,
            subscribers: Array.from(this.subscribers.keys()).length,
            historySize: this.history.length,
            lastUpdate: this.history.length > 0 ? this.history[this.history.length - 1].timestamp : null
        };
    }

    /**
     * Уничтожение StateManager
     */
    destroy() {
        this.state = {};
        this.subscribers.clear();
        this.history = [];
        this.isDestroyed = true;
        console.log('🗑️ StateManager уничтожен');
    }
}

export default StateManager;
