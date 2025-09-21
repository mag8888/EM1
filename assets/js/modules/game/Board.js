/**
 * Board - модуль игровой доски
 */
class Board {
    constructor(gameCore = null, containerId = 'gameBoardContainer') {
        this.gameCore = gameCore;
        this.containerId = containerId;
        this.cells = [];
        this.players = new Map(); // Map<playerId, playerElement>
        this.isInitialized = false;
        this.eventBus = gameCore?.eventBus || null;
        this.state = gameCore?.state || null;
    }

    /**
     * Инициализация модуля
     */
    async init() {
        console.log('🎯 Initializing Board module...');
        
        // Получаем ссылки на общие компоненты
        this.eventBus = this.gameCore?.eventBus;
        this.state = this.gameCore?.state;
        
        // Инициализируем ячейки доски
        this.initializeCells();
        
        // Рендерим доску на странице
        this.renderBoard();
        
        // Настраиваем события
        this.setupEvents();
        
        this.isInitialized = true;
        console.log('✅ Board module initialized');
    }

    /**
     * Инициализация ячеек доски
     */
    initializeCells() {
        // Создаем 76 ячеек: 52 внешние + 24 внутренние
        this.cells = [];
        
        // Внешний круг (52 ячейки)
        for (let i = 1; i <= 52; i++) {
            this.cells.push({
                id: i,
                type: this.getCellType(i),
                color: this.getCellColor(i),
                icon: this.getCellIcon(i),
                name: this.getCellName(i),
                description: this.getCellDescription(i),
                position: i,
                isSpecial: this.isSpecialCell(i),
                isStart: i === 1,
                isEnd: i === 52,
                isOuter: true,
                players: []
            });
        }
        
        // Внутренний круг (24 ячейки)
        for (let i = 53; i <= 76; i++) {
            this.cells.push({
                id: i,
                type: this.getCellType(i),
                color: this.getCellColor(i),
                icon: this.getCellIcon(i),
                name: this.getCellName(i),
                description: this.getCellDescription(i),
                position: i,
                isSpecial: this.isSpecialCell(i),
                isStart: false,
                isEnd: false,
                isOuter: false,
                players: []
            });
        }
        
        console.log(`🎯 Initialized ${this.cells.length} board cells (52 outer + 24 inner)`);
    }

    /**
     * Рендеринг доски на странице
     */
    renderBoard() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Container with ID "${this.containerId}" not found`);
            return;
        }

        // Очищаем контейнер
        container.innerHTML = '';

        // Создаем спиральное расположение ячеек
        this.createSpiralLayout(container);
        
        // Добавляем стили для доски
        this.addBoardStyles();
        
        console.log('🎯 Board rendered on page');
    }

    /**
     * Создание двухкругового расположения ячеек
     */
    createSpiralLayout(container) {
        // Создаем контейнер для доски
        const boardContainer = document.createElement('div');
        boardContainer.className = 'board-container';
        
        // Создаем внешний круг (52 ячейки)
        const outerCircle = document.createElement('div');
        outerCircle.className = 'outer-circle';
        
        // Создаем внутренний круг (24 ячейки)
        const innerCircle = document.createElement('div');
        innerCircle.className = 'inner-circle';
        
        // Добавляем ячейки в соответствующие круги
        this.cells.forEach(cell => {
            const cellElement = document.createElement('div');
            cellElement.className = `board-cell ${cell.type} ${cell.color}`;
            cellElement.dataset.cellId = cell.id;
            cellElement.innerHTML = `
                <div class="cell-number">${cell.id}</div>
                <div class="cell-icon">${cell.icon}</div>
                <div class="cell-name">${cell.name}</div>
                <div class="cell-players"></div>
            `;
            
            if (cell.isOuter) {
                outerCircle.appendChild(cellElement);
            } else {
                innerCircle.appendChild(cellElement);
            }
        });
        
        // Добавляем центральный элемент
        const centerElement = document.createElement('div');
        centerElement.className = 'center-element';
        centerElement.innerHTML = `
            <div class="center-number">1</div>
        `;
        
        // Собираем доску
        boardContainer.appendChild(outerCircle);
        boardContainer.appendChild(innerCircle);
        boardContainer.appendChild(centerElement);
        
        container.appendChild(boardContainer);
    }

    /**
     * Получение позиции ячейки в спирали
     */
    getSpiralPosition(cellId) {
        // Спиральное расположение: начинаем с внешнего кольца и идем внутрь
        const positions = this.generateSpiralPositions();
        return positions[cellId - 1] || { x: 0, y: 0 };
    }

    /**
     * Генерация позиций для спирального расположения
     */
    generateSpiralPositions() {
        const positions = [];
        const cellSize = 60;
        const spacing = 80;
        
        // Спиральное расположение точно как на изображении
        // Начинаем с правого нижнего угла (СТАРТ) и идем по спирали к центру
        
        // Внешний периметр (ячейки 1-16) - начинаем с правого нижнего угла
        const outerPositions = [
            { x: 580, y: 580 }, // 1 - СТАРТ (правый нижний угол)
            { x: 480, y: 580 }, // 2
            { x: 380, y: 580 }, // 3
            { x: 280, y: 580 }, // 4
            { x: 180, y: 580 }, // 5
            { x: 80, y: 580 },  // 6
            { x: 80, y: 480 },  // 7 - левый край
            { x: 80, y: 380 },  // 8
            { x: 80, y: 280 },  // 9
            { x: 80, y: 180 },  // 10
            { x: 80, y: 80 },   // 11
            { x: 180, y: 80 },  // 12 - верхний край
            { x: 280, y: 80 },  // 13
            { x: 380, y: 80 },  // 14
            { x: 480, y: 80 },  // 15
            { x: 580, y: 80 },  // 16
        ];
        
        // Второй периметр (ячейки 17-28) - продолжаем спираль
        const secondPositions = [
            { x: 580, y: 180 }, // 17 - правый край
            { x: 580, y: 280 }, // 18
            { x: 580, y: 380 }, // 19
            { x: 580, y: 480 }, // 20
            { x: 480, y: 480 }, // 21 - поворот внутрь
            { x: 380, y: 480 }, // 22
            { x: 280, y: 480 }, // 23
            { x: 180, y: 480 }, // 24
            { x: 180, y: 380 }, // 25 - левый край
            { x: 180, y: 280 }, // 26
            { x: 180, y: 180 }, // 27
            { x: 280, y: 180 }, // 28 - поворот внутрь
        ];
        
        // Третий периметр (ячейки 29-36) - продолжаем спираль
        const thirdPositions = [
            { x: 380, y: 180 }, // 29
            { x: 480, y: 180 }, // 30
            { x: 480, y: 280 }, // 31 - поворот
            { x: 480, y: 380 }, // 32
            { x: 380, y: 380 }, // 33 - поворот внутрь
            { x: 280, y: 380 }, // 34
            { x: 280, y: 280 }, // 35 - поворот
            { x: 380, y: 280 }, // 36
        ];
        
        // Внутренний периметр (ячейки 37-44) - завершаем спираль к центру
        const innerPositions = [
            { x: 330, y: 230 }, // 37
            { x: 430, y: 230 }, // 38
            { x: 430, y: 330 }, // 39 - поворот
            { x: 430, y: 430 }, // 40
            { x: 330, y: 430 }, // 41 - поворот внутрь
            { x: 230, y: 430 }, // 42
            { x: 230, y: 330 }, // 43 - поворот
            { x: 330, y: 330 }, // 44 - ФИНИШ (центр)
        ];
        
        // Объединяем все позиции
        positions.push(...outerPositions);
        positions.push(...secondPositions);
        positions.push(...thirdPositions);
        positions.push(...innerPositions);
        
        return positions;
    }

    /**
     * Добавление стилей для доски
     */
    addBoardStyles() {
        if (document.getElementById('board-styles')) return;

        const style = document.createElement('style');
        style.id = 'board-styles';
        style.textContent = `
            .board-container {
                position: relative;
                width: 800px;
                height: 800px;
                margin: 0 auto;
                background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
                border-radius: 50%;
            }

            .outer-circle {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                grid-template-rows: repeat(8, 1fr);
                gap: 8px;
                padding: 20px;
            }

            .inner-circle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                height: 400px;
                border-radius: 50%;
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                grid-template-rows: repeat(6, 1fr);
                gap: 6px;
                padding: 15px;
            }

            .board-cell {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                cursor: pointer;
                z-index: 1;
            }

            .outer-circle .board-cell {
                width: 100px;
                height: 100px;
            }

            .inner-circle .board-cell {
                width: 80px;
                height: 80px;
            }

            .board-cell:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                border-color: rgba(255, 255, 255, 0.4);
            }

            .board-cell.start {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
                font-weight: bold;
            }

            .board-cell.dream {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: #fff;
            }

            .board-cell.regular {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .cell-number {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 2px;
            }

            .cell-icon {
                font-size: 18px;
                margin-bottom: 2px;
            }

            .cell-name {
                font-size: 10px;
                text-align: center;
                line-height: 1.2;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .cell-players {
                position: absolute;
                top: 2px;
                right: 2px;
                display: flex;
                gap: 2px;
            }

            .player-token {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.8);
            }

            /* Цвета ячеек согласно ТЗ */
            .board-cell.green { background: #31D281; color: #fff; }
            .board-cell.blue { background: #4B7CFF; color: #fff; }
            .board-cell.pink { background: #F23E77; color: #fff; }
            .board-cell.purple { background: #A259FF; color: #fff; }
            .board-cell.yellow { background: #FFD966; color: #000; }
            .board-cell.orange { background: #FF9F43; color: #fff; }
            .board-cell.red { background: #FF3838; color: #fff; }
            .board-cell.teal { background: #20BF6B; color: #fff; }

            .center-element {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                z-index: 10;
            }

            .center-number {
                font-size: 32px;
                font-weight: bold;
                color: #000;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Настройка событий
     */
    setupEvents() {
        if (this.eventBus) {
            this.eventBus.on('playerMoved', this.onPlayerMoved.bind(this));
            this.eventBus.on('playerAdded', this.onPlayerAdded.bind(this));
            this.eventBus.on('playerRemoved', this.onPlayerRemoved.bind(this));
            this.eventBus.on('gameStateUpdated', this.onGameStateUpdated.bind(this));
        }

        // Добавляем обработчики кликов по ячейкам
        const container = document.getElementById(this.containerId);
        if (container) {
            container.addEventListener('click', this.onCellClick.bind(this));
        }
    }

    /**
     * Обработка клика по ячейке
     */
    onCellClick(event) {
        const cellElement = event.target.closest('.board-cell');
        if (cellElement) {
            const cellId = parseInt(cellElement.dataset.cellId);
            const cell = this.cells.find(c => c.id === cellId);
            
            if (cell) {
                console.log(`🎯 Cell clicked: ${cell.name} (${cellId})`);
                
                if (this.eventBus) {
                    this.eventBus.emit('cellClicked', { cell, cellId });
                }
            }
        }
    }

    /**
     * Обработка движения игрока
     */
    onPlayerMoved(data) {
        const { playerId, newPosition } = data;
        this.movePlayerToken(playerId, newPosition);
    }

    /**
     * Обработка добавления игрока
     */
    onPlayerAdded(data) {
        const { player } = data;
        this.addPlayerToken(player);
    }

    /**
     * Обработка удаления игрока
     */
    onPlayerRemoved(data) {
        const { player } = data;
        this.removePlayerToken(player.id);
    }

    /**
     * Обработка обновления состояния игры
     */
    onGameStateUpdated(gameState) {
        console.log('🔄 Updating board with new game state:', gameState);
        // Обновляем позиции игроков
        if (gameState.players) {
            gameState.players.forEach(player => {
                this.updatePlayerPosition(player);
            });
        }
    }

    /**
     * Добавление токена игрока
     */
    addPlayerToken(player) {
        if (this.players.has(player.id)) return;

        const playerToken = document.createElement('div');
        playerToken.className = 'player-token';
        playerToken.dataset.playerId = player.id;
        playerToken.textContent = player.name.charAt(0).toUpperCase();
        playerToken.style.backgroundColor = this.getPlayerColor(player.id);

        this.players.set(player.id, playerToken);
        this.movePlayerToken(player.id, player.position || 0);
        
        console.log(`➕ Player token added: ${player.name}`);
    }

    /**
     * Удаление токена игрока
     */
    removePlayerToken(playerId) {
        const playerToken = this.players.get(playerId);
        if (playerToken && playerToken.parentNode) {
            playerToken.parentNode.removeChild(playerToken);
            this.players.delete(playerId);
            console.log(`➖ Player token removed: ${playerId}`);
        }
    }

    /**
     * Перемещение токена игрока
     */
    movePlayerToken(playerId, newPosition) {
        const playerToken = this.players.get(playerId);
        if (!playerToken) return;

        // Удаляем токен из текущей ячейки
        const currentCell = playerToken.parentNode;
        if (currentCell && currentCell.classList.contains('cell-players')) {
            currentCell.removeChild(playerToken);
        }

        // Добавляем токен в новую ячейку
        const targetCell = document.querySelector(`[data-cell-id="${newPosition + 1}"]`);
        if (targetCell) {
            const playersContainer = targetCell.querySelector('.cell-players');
            if (playersContainer) {
                playersContainer.appendChild(playerToken);
                console.log(`➡️ Player ${playerId} moved to cell ${newPosition + 1}`);
            }
        }
    }

    /**
     * Обновление позиции игрока
     */
    updatePlayerPosition(player) {
        if (this.players.has(player.id)) {
            this.movePlayerToken(player.id, player.position || 0);
        } else {
            this.addPlayerToken(player);
        }
    }

    /**
     * Получение цвета игрока
     */
    getPlayerColor(playerId) {
        const colors = ['#FF6B6B', '#4ECDC4', '#4F86F7', '#FFC107', '#9C27B0', '#00BCD4', '#8BC34A', '#FF9800'];
        let hash = 0;
        for (let i = 0; i < playerId.length; i++) {
            hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colors.length;
        return colors[colorIndex];
    }

    /**
     * Получение типа ячейки
     */
    getCellType(cellId) {
        const types = {
            1: 'start',
            2: 'dream', 6: 'dream', 14: 'dream', 16: 'dream', 20: 'dream',
            22: 'dream', 26: 'dream', 27: 'dream', 28: 'dream', 30: 'dream',
            32: 'dream', 36: 'dream', 38: 'dream', 40: 'dream', 42: 'dream', 44: 'dream'
        };
        return types[cellId] || 'regular';
    }

    /**
     * Получение цвета ячейки
     */
    getCellColor(cellId) {
        // Циклическое распределение цветов для 76 ячеек
        const colorCycle = ['green', 'blue', 'pink', 'purple', 'yellow', 'orange', 'red', 'teal'];
        const colorIndex = (cellId - 1) % colorCycle.length;
        return colorCycle[colorIndex];
    }

    /**
     * Получение иконки ячейки
     */
    getCellIcon(cellId) {
        // Циклическое распределение иконок для 76 ячеек
        const iconCycle = [
            '🏠', '🚗', '💡', '📈', '💼', '🛍️', '🎯', '❤️',
            '🐼', '🐸', '🦉', '🐱', '🌟', '⚡', '🎲', '🎪',
            '🎨', '🔮', '🎭', '🎵', '🎬', '🎮', '📚', '🌍',
            '🚀', '⭐', '💰', '🏆', '💎', '🎁', '🔑', '⚙️'
        ];
        const iconIndex = (cellId - 1) % iconCycle.length;
        return iconCycle[iconIndex];
    }

    /**
     * Получение названия ячейки
     */
    getCellName(cellId) {
        if (cellId === 1) return 'СТАРТ';
        if (cellId === 52) return 'ФИНИШ';
        if (cellId <= 52) return `Клетка ${cellId}`;
        return `Внутр. ${cellId - 52}`;
    }

    /**
     * Получение описания ячейки
     */
    getCellDescription(cellId) {
        const descriptions = {
            1: 'Начало игры',
            2: 'Выберите свою мечту', 6: 'Выберите свою мечту', 14: 'Выберите свою мечту',
            16: 'Выберите свою мечту', 20: 'Выберите свою мечту', 22: 'Выберите свою мечту',
            26: 'Выберите свою мечту', 27: 'Выберите свою мечту', 28: 'Выберите свою мечту',
            30: 'Выберите свою мечту', 32: 'Выберите свою мечту', 36: 'Выберите свою мечту',
            38: 'Выберите своей мечту', 40: 'Выберите своей мечту', 42: 'Выберите своей мечту', 44: 'Конец игры'
        };
        return descriptions[cellId] || 'Обычная клетка';
    }

    /**
     * Проверка специальной ячейки
     */
    isSpecialCell(cellId) {
        return [1, 2, 6, 14, 16, 20, 22, 26, 27, 28, 30, 32, 36, 38, 40, 42, 44].includes(cellId);
    }

    /**
     * Получение ячейки по ID
     */
    getCell(cellId) {
        return this.cells.find(cell => cell.id === cellId);
    }

    /**
     * Получение всех ячеек
     */
    getAllCells() {
        return this.cells;
    }

    /**
     * Очистка доски
     */
    clearBoard() {
        this.players.clear();
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Перерисовка доски
     */
    redraw() {
        this.renderBoard();
    }
}

// Экспорт в window для глобального доступа
window.Board = Board;