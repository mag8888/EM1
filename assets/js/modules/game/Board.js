/**
 * Board - модуль игровой доски
 */
class Board {
    constructor() {
        this.cells = [];
        this.players = [];
        this.currentPlayer = null;
        this.eventBus = null;
        this.state = null;
    }

    /**
     * Инициализация модуля
     */
    async init() {
        console.log('🎯 Initializing Board module...');
        
        // Получаем ссылки на общие компоненты
        this.eventBus = window.gameCore?.eventBus;
        this.state = window.gameCore?.state;
        
        // Инициализируем ячейки доски
        this.initializeCells();
        
        // Настраиваем события
        this.setupEvents();
        
        console.log('✅ Board module initialized');
    }

    /**
     * Инициализация ячеек доски
     */
    initializeCells() {
        this.cells = Array.from({ length: 44 }, (_, index) => ({
            id: index + 1,
            type: this.getCellType(index + 1),
            color: this.getCellColor(index + 1),
            icon: this.getCellIcon(index + 1),
            name: this.getCellName(index + 1),
            description: this.getCellDescription(index + 1),
            players: []
        }));
    }

    /**
     * Получение типа ячейки
     */
    getCellType(cellId) {
        const types = {
            1: 'start',
            2: 'dream',
            6: 'dream',
            14: 'dream',
            16: 'dream',
            20: 'dream',
            22: 'dream',
            26: 'dream',
            27: 'dream',
            28: 'dream',
            30: 'dream',
            32: 'dream',
            36: 'dream',
            38: 'dream',
            40: 'dream',
            42: 'dream',
            44: 'dream'
        };
        
        return types[cellId] || 'regular';
    }

    /**
     * Получение цвета ячейки
     */
    getCellColor(cellId) {
        const colors = {
            1: 'gold',
            2: 'pink', 6: 'teal', 14: 'purple', 16: 'orange', 20: 'yellow',
            22: 'blue', 26: 'red', 27: 'green', 28: 'purple', 30: 'blue',
            32: 'orange', 36: 'red', 38: 'green', 40: 'purple', 42: 'blue', 44: 'gold'
        };
        
        return colors[cellId] || 'slate';
    }

    /**
     * Получение иконки ячейки
     */
    getCellIcon(cellId) {
        const icons = {
            1: '🎯',
            2: '🏠', 6: '🧊', 14: '🏔️', 16: '📚', 20: '⛵',
            22: '🎪', 26: '🕯️', 27: '🎭', 28: '⛵', 30: '⛵',
            32: '✈️', 36: '🏎️', 38: '🎬', 40: '👑', 42: '⛵', 44: '🚀'
        };
        
        return icons[cellId] || '💰';
    }

    /**
     * Получение названия ячейки
     */
    getCellName(cellId) {
        const names = {
            1: 'Старт',
            2: 'Дом мечты', 6: 'Антарктида', 14: 'Высочайшие вершины', 16: 'Книга-бестселлер', 20: 'Яхта в Средиземном море',
            22: 'Мировой фестиваль', 26: 'Ретрит-центр', 27: 'Фонд поддержки талантов', 28: 'Кругосветное плавание', 30: 'Кругосветное плавание 2',
            32: 'Частный самолёт', 36: 'Коллекция суперкаров', 38: 'Полнометражный фильм', 40: 'Мировой лидер мнений', 42: 'Белоснежная яхта', 44: 'Полёт в космос'
        };
        
        return names[cellId] || `Ячейка ${cellId}`;
    }

    /**
     * Получение описания ячейки
     */
    getCellDescription(cellId) {
        const descriptions = {
            1: 'Начало игры',
            2: 'Построить дом мечты для семьи', 6: 'Посетить Антарктиду', 14: 'Подняться на все высочайшие вершины мира', 16: 'Стать автором книги-бестселлера', 20: 'Жить год на яхте в Средиземном море',
            22: 'Организовать мировой фестиваль', 26: 'Построить ретрит-центр', 27: 'Создать фонд поддержки талантов', 28: 'Кругосветное плавание на паруснике', 30: 'Кругосветное плавание на паруснике',
            32: 'Купить частный самолёт', 36: 'Купить коллекцию суперкаров', 38: 'Снять полнометражный фильм', 40: 'Стать мировым лидером мнений', 42: 'Белоснежная Яхта', 44: 'Полёт в космос'
        };
        
        return descriptions[cellId] || '';
    }

    /**
     * Настройка событий
     */
    setupEvents() {
        if (this.eventBus) {
            this.eventBus.on('playerMoved', this.onPlayerMoved.bind(this));
            this.eventBus.on('gameStarted', this.onGameStarted.bind(this));
            this.eventBus.on('gameStopped', this.onGameStopped.bind(this));
        }
    }

    /**
     * Обработка движения игрока
     */
    onPlayerMoved(player, fromPosition, toPosition) {
        console.log(`👤 Player ${player.name} moved from ${fromPosition} to ${toPosition}`);
        
        // Убираем игрока с предыдущей позиции
        this.removePlayerFromCell(fromPosition, player.id);
        
        // Добавляем игрока на новую позицию
        this.addPlayerToCell(toPosition, player);
        
        // Обновляем UI
        this.updateBoardUI();
    }

    /**
     * Обработка начала игры
     */
    onGameStarted() {
        console.log('🎮 Game started - initializing board');
        this.updateBoardUI();
    }

    /**
     * Обработка остановки игры
     */
    onGameStopped() {
        console.log('🛑 Game stopped - clearing board');
        this.clearBoard();
    }

    /**
     * Добавление игрока на ячейку
     */
    addPlayerToCell(cellId, player) {
        const cell = this.cells.find(c => c.id === cellId);
        if (cell) {
            cell.players.push(player);
        }
    }

    /**
     * Удаление игрока с ячейки
     */
    removePlayerFromCell(cellId, playerId) {
        const cell = this.cells.find(c => c.id === cellId);
        if (cell) {
            cell.players = cell.players.filter(p => p.id !== playerId);
        }
    }

    /**
     * Получение ячейки по ID
     */
    getCell(cellId) {
        return this.cells.find(c => c.id === cellId);
    }

    /**
     * Получение всех ячеек
     */
    getAllCells() {
        return this.cells;
    }

    /**
     * Получение ячеек по типу
     */
    getCellsByType(type) {
        return this.cells.filter(c => c.type === type);
    }

    /**
     * Обновление UI доски
     */
    updateBoardUI() {
        // Эмитируем событие для обновления UI
        if (this.eventBus) {
            this.eventBus.emit('boardUpdated', this.cells);
        }
    }

    /**
     * Очистка доски
     */
    clearBoard() {
        this.cells.forEach(cell => {
            cell.players = [];
        });
        this.updateBoardUI();
    }

    /**
     * Получение информации о доске
     */
    getBoardInfo() {
        return {
            totalCells: this.cells.length,
            dreamCells: this.getCellsByType('dream').length,
            regularCells: this.getCellsByType('regular').length,
            players: this.players.length
        };
    }
}

// Экспорт в window для глобального доступа
window.Board = Board;
