/**
 * GameCore - центральный координатор игровой системы
 */
class GameCore {
    constructor() {
        this.modules = new ModuleManager();
        this.state = new StateManager();
        this.eventBus = new EventBus();
        this.isInitialized = false;
        this.isRunning = false;
        this.config = this.getDefaultConfig();
    }

    /**
     * Получение конфигурации по умолчанию
     */
    getDefaultConfig() {
        return {
            game: {
                maxPlayers: 8,
                minPlayers: 2,
                startingBalance: 10000,
                turnTime: 30,
                boardSize: 44
            },
            ui: {
                theme: 'dark',
                animations: true,
                sound: true
            },
            api: {
                baseUrl: window.location.origin,
                timeout: 10000
            }
        };
    }

    /**
     * Инициализация игрового ядра
     */
    async init(config = {}) {
        try {
            console.log('🎮 Initializing GameCore...');
            
            // Объединение конфигураций
            this.config = this.mergeConfig(this.config, config);
            
            // Инициализация базовых компонентов
            await this.initBaseComponents();
            
            // Регистрация модулей
            await this.registerModules();
            
            // Настройка событий
            this.setupEvents();
            
            // Инициализация модулей
            await this.modules.initAll();
            
            this.isInitialized = true;
            console.log('✅ GameCore initialized');
            
            // Эмиссия события готовности
            this.eventBus.emit('gameCoreReady', this);
            
        } catch (error) {
            console.error('❌ Failed to initialize GameCore:', error);
            throw error;
        }
    }

    /**
     * Инициализация базовых компонентов
     */
    async initBaseComponents() {
        // Устанавливаем базовое состояние
        this.state.setState('gameCore', this);
        this.state.setState('isInitialized', false);
        this.state.setState('isRunning', false);
        this.state.setState('currentPlayer', null);
        this.state.setState('gameState', 'waiting');
    }

    /**
     * Регистрация модулей
     */
    async registerModules() {
        // Регистрируем модули в порядке зависимостей
        this.modules.register('apiClient', window.ApiClient, {
            dependencies: [],
            priority: 100
        });

        this.modules.register('board', window.Board, {
            dependencies: ['apiClient'],
            priority: 90
        });

        this.modules.register('dice', window.Dice, {
            dependencies: ['apiClient'],
            priority: 90
        });

        this.modules.register('player', window.Player, {
            dependencies: ['apiClient'],
            priority: 90
        });

        this.modules.register('gameState', window.GameState, {
            dependencies: ['board', 'dice', 'player'],
            priority: 80
        });

        this.modules.register('lobby', window.Lobby, {
            dependencies: ['apiClient'],
            priority: 70
        });

        this.modules.register('room', window.Room, {
            dependencies: ['apiClient'],
            priority: 70
        });

        this.modules.register('auth', window.Auth, {
            dependencies: ['apiClient'],
            priority: 70
        });
    }

    /**
     * Настройка событий
     */
    setupEvents() {
        // Слушаем события от модулей
        this.eventBus.on('moduleReady', (moduleName) => {
            console.log(`📦 Module ${moduleName} is ready`);
        });

        this.eventBus.on('moduleError', (moduleName, error) => {
            console.error(`❌ Module ${moduleName} error:`, error);
        });

        // Слушаем изменения состояния
        this.state.subscribe('gameState', (newState, oldState) => {
            console.log(`🎮 Game state changed: ${oldState} → ${newState}`);
            this.eventBus.emit('gameStateChanged', newState, oldState);
        });

        this.state.subscribe('currentPlayer', (newPlayer, oldPlayer) => {
            console.log(`👤 Current player changed:`, newPlayer);
            this.eventBus.emit('currentPlayerChanged', newPlayer, oldPlayer);
        });
    }

    /**
     * Запуск игры
     */
    async startGame(gameConfig = {}) {
        if (!this.isInitialized) {
            throw new Error('GameCore not initialized');
        }

        try {
            console.log('🚀 Starting game...');
            
            this.state.setState('isRunning', true);
            this.state.setState('gameState', 'playing');
            
            // Инициализируем игровое состояние
            const gameState = this.modules.get('gameState');
            if (gameState && typeof gameState.start === 'function') {
                await gameState.start(gameConfig);
            }

            this.eventBus.emit('gameStarted', gameConfig);
            console.log('✅ Game started');
            
        } catch (error) {
            console.error('❌ Failed to start game:', error);
            throw error;
        }
    }

    /**
     * Остановка игры
     */
    async stopGame() {
        try {
            console.log('🛑 Stopping game...');
            
            this.state.setState('isRunning', false);
            this.state.setState('gameState', 'stopped');
            
            // Останавливаем игровое состояние
            const gameState = this.modules.get('gameState');
            if (gameState && typeof gameState.stop === 'function') {
                await gameState.stop();
            }

            this.eventBus.emit('gameStopped');
            console.log('✅ Game stopped');
            
        } catch (error) {
            console.error('❌ Failed to stop game:', error);
            throw error;
        }
    }

    /**
     * Получение модуля
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Получение состояния
     */
    getState(key, defaultValue = null) {
        return this.state.getState(key, defaultValue);
    }

    /**
     * Установка состояния
     */
    setState(key, value, options = {}) {
        return this.state.setState(key, value, options);
    }

    /**
     * Подписка на события
     */
    on(event, callback, options = {}) {
        return this.eventBus.on(event, callback, options);
    }

    /**
     * Отписка от событий
     */
    off(event, listenerId) {
        return this.eventBus.off(event, listenerId);
    }

    /**
     * Эмиссия событий
     */
    emit(event, ...args) {
        return this.eventBus.emit(event, ...args);
    }

    /**
     * Объединение конфигураций
     */
    mergeConfig(defaultConfig, userConfig) {
        const result = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
            } else {
                result[key] = userConfig[key];
            }
        }
        
        return result;
    }

    /**
     * Получение конфигурации
     */
    getConfig() {
        return this.config;
    }

    /**
     * Обновление конфигурации
     */
    updateConfig(newConfig) {
        this.config = this.mergeConfig(this.config, newConfig);
        this.eventBus.emit('configUpdated', this.config);
    }

    /**
     * Уничтожение игрового ядра
     */
    async destroy() {
        try {
            console.log('🗑️ Destroying GameCore...');
            
            await this.stopGame();
            await this.modules.clear();
            this.state.reset();
            this.eventBus.removeAllListeners();
            
            this.isInitialized = false;
            this.isRunning = false;
            
            console.log('✅ GameCore destroyed');
            
        } catch (error) {
            console.error('❌ Failed to destroy GameCore:', error);
            throw error;
        }
    }
}

// Экспорт в window для глобального доступа
window.GameCore = GameCore;