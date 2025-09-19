/**
 * Основной модуль игры "Энергия денег"
 * Управляет всеми модулями и координирует игровой процесс
 */

import { GAME_CONFIG } from '../../config/game-config.js';
import { EventBus } from '../services/EventBus.js';
import { StateManager } from './StateManager.js';
import { ModuleManager } from './ModuleManager.js';

export class GameCore {
    constructor() {
        this.config = GAME_CONFIG;
        this.modules = new ModuleManager();
        this.state = new StateManager();
        this.eventBus = new EventBus();
        this.isInitialized = false;
        this.isRunning = false;
    }

    /**
     * Инициализация игрового ядра
     */
    async init(config = {}) {
        try {
            console.log('🎮 Инициализация GameCore...');
            
            // Объединение конфигураций
            this.config = { ...this.config, ...config };
            
            // Инициализация базовых компонентов
            await this.initBaseComponents();
            
            // Регистрация модулей
            await this.registerModules();
            
            // Настройка событий
            this.setupEvents();
            
            // Инициализация модулей
            await this.initModules();
            
            this.isInitialized = true;
            console.log('✅ GameCore инициализирован');
            
            // Эмиссия события готовности
            this.eventBus.emit('gameCoreReady', this);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации GameCore:', error);
            throw error;
        }
    }

    /**
     * Инициализация базовых компонентов
     */
    async initBaseComponents() {
        // Инициализация StateManager
        await this.state.init();
        
        // Инициализация EventBus
        this.eventBus.init();
    }

    /**
     * Регистрация игровых модулей
     */
    async registerModules() {
        try {
            // Динамический импорт модулей
            const { PlayerManager } = await import('./PlayerManager.js');
            const { DiceModule } = await import('../modules/DiceModule.js');

            // Регистрация базовых модулей
            this.modules.register('playerManager', new PlayerManager(this));
            this.modules.register('diceModule', new DiceModule(this));
            
            console.log('✅ Базовые модули зарегистрированы');
            
            // Попытка загрузить дополнительные модули
            try {
                const { CardModule } = await import('../modules/CardModule.js');
                this.modules.register('cardModule', new CardModule(this));
                console.log('✅ CardModule зарегистрирован');
            } catch (error) {
                console.warn('⚠️ CardModule не загружен:', error.message);
            }
            
            try {
                const { MovementModule } = await import('../modules/MovementModule.js');
                this.modules.register('movementModule', new MovementModule(this));
                console.log('✅ MovementModule зарегистрирован');
            } catch (error) {
                console.warn('⚠️ MovementModule не загружен:', error.message);
            }
            
            try {
                const { EventModule } = await import('../modules/EventModule.js');
                this.modules.register('eventModule', new EventModule(this));
                console.log('✅ EventModule зарегистрирован');
            } catch (error) {
                console.warn('⚠️ EventModule не загружен:', error.message);
            }
            
            try {
                const { BankModule } = await import('../modules/BankModule.js');
                this.modules.register('bankModule', new BankModule(this));
                console.log('✅ BankModule зарегистрирован');
            } catch (error) {
                console.warn('⚠️ BankModule не загружен:', error.message);
            }
            
        } catch (error) {
            console.error('❌ Ошибка регистрации модулей:', error);
            throw error;
        }
    }

    /**
     * Настройка событий
     */
    setupEvents() {
        // События жизненного цикла
        this.eventBus.on('gameStarted', this.onGameStarted.bind(this));
        this.eventBus.on('gameEnded', this.onGameEnded.bind(this));
        this.eventBus.on('playerTurnStarted', this.onPlayerTurnStarted.bind(this));
        this.eventBus.on('playerTurnEnded', this.onPlayerTurnEnded.bind(this));
        
        // События ошибок
        this.eventBus.on('error', this.onError.bind(this));
    }

    /**
     * Инициализация всех модулей
     */
    async initModules() {
        const moduleNames = this.modules.getModuleNames();
        let initializedCount = 0;
        
        for (const moduleName of moduleNames) {
            const module = this.modules.get(moduleName);
            if (module && typeof module.init === 'function') {
                try {
                    console.log(`🔧 Инициализация модуля: ${moduleName}`);
                    await module.init();
                    console.log(`✅ Модуль ${moduleName} инициализирован`);
                    initializedCount++;
                } catch (error) {
                    console.error(`❌ Ошибка инициализации модуля ${moduleName}:`, error);
                    // Продолжаем инициализацию других модулей
                }
            }
        }
        
        console.log(`📊 Инициализировано ${initializedCount} из ${moduleNames.length} модулей`);
        
        if (initializedCount === 0) {
            throw new Error('Ни один модуль не был инициализирован');
        }
    }

    /**
     * Запуск игры
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('GameCore не инициализирован');
        }

        if (this.isRunning) {
            console.warn('Игра уже запущена');
            return;
        }

        try {
            console.log('🚀 Запуск игры...');
            
            this.isRunning = true;
            
            // Инициализация игрового состояния
            await this.initGameState();
            
            // Эмиссия события начала игры
            this.eventBus.emit('gameStarted', {
                config: this.config,
                timestamp: Date.now()
            });
            
            console.log('✅ Игра запущена');
            
        } catch (error) {
            console.error('❌ Ошибка запуска игры:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Остановка игры
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Остановка игры...');
        
        this.isRunning = false;
        
        // Эмиссия события окончания игры
        this.eventBus.emit('gameEnded', {
            timestamp: Date.now()
        });
        
        console.log('✅ Игра остановлена');
    }

    /**
     * Инициализация игрового состояния
     */
    async initGameState() {
        // Получение данных комнаты
        const roomId = this.getRoomId();
        const userId = this.getUserId();
        
        if (!roomId || !userId) {
            throw new Error('Не удалось получить ID комнаты или пользователя');
        }

        // Загрузка данных игры
        await this.loadGameData(roomId, userId);
        
        // Инициализация игроков
        await this.initPlayers();
    }

    /**
     * Загрузка данных игры с сервера
     */
    async loadGameData(roomId, userId) {
        try {
            const response = await fetch(`${this.config.api.baseUrl}/api/rooms/${roomId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Id': userId
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const gameData = await response.json();
            
            // Обновление состояния
            this.state.setState({
                roomId,
                userId,
                gameData
            });
            
        } catch (error) {
            console.error('Ошибка загрузки данных игры:', error);
            throw error;
        }
    }

    /**
     * Инициализация игроков
     */
    async initPlayers() {
        const playerManager = this.modules.get('playerManager');
        const gameData = this.state.getState('gameData');
        
        if (gameData && gameData.players) {
            for (const playerData of gameData.players) {
                await playerManager.addPlayer(playerData);
            }
        }
    }

    /**
     * Получение ID комнаты
     */
    getRoomId() {
        // Попытка получить из URL
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get('room');
        
        if (!roomId) {
            // Попытка получить из пути
            const pathMatch = window.location.pathname.match(/\/room\/([0-9a-fA-F]{24})/);
            if (pathMatch) {
                roomId = pathMatch[1];
            }
        }
        
        if (!roomId) {
            // Попытка получить из localStorage
            roomId = localStorage.getItem('currentRoomId');
        }
        
        return roomId;
    }

    /**
     * Получение ID пользователя
     */
    getUserId() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                return user.id || user.userId;
            }
        } catch (error) {
            console.warn('Ошибка парсинга данных пользователя:', error);
        }
        
        return localStorage.getItem('userId') || localStorage.getItem('user_id');
    }

    /**
     * Получение модуля по имени
     */
    getModule(moduleName) {
        return this.modules.get(moduleName);
    }

    /**
     * Получение состояния
     */
    getState(key) {
        return this.state.getState(key);
    }

    /**
     * Установка состояния
     */
    setState(newState) {
        this.state.setState(newState);
    }

    /**
     * Обработчики событий
     */
    onGameStarted(data) {
        console.log('🎮 Игра началась:', data);
    }

    onGameEnded(data) {
        console.log('🏁 Игра окончена:', data);
    }

    onPlayerTurnStarted(player) {
        console.log(`🎯 Ход игрока: ${player.name}`);
    }

    onPlayerTurnEnded(player) {
        console.log(`✅ Ход игрока ${player.name} завершен`);
    }

    onError(error) {
        console.error('🚨 Ошибка в GameCore:', error);
    }

    /**
     * Уничтожение игрового ядра
     */
    destroy() {
        if (this.isRunning) {
            this.stop();
        }
        
        // Очистка модулей
        this.modules.destroy();
        
        // Очистка состояния
        this.state.destroy();
        
        // Очистка событий
        this.eventBus.destroy();
        
        this.isInitialized = false;
        console.log('🗑️ GameCore уничтожен');
    }
}

export default GameCore;
