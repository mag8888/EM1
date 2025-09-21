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
        this.cells = Array.from({ length: 44 }, (_, index) => ({
            id: index + 1,
            type: this.getCellType(index + 1),
            color: this.getCellColor(index + 1),
            icon: this.getCellIcon(index + 1),
            name: this.getCellName(index + 1),
            description: this.getCellDescription(index + 1),
            position: index + 1,
            isSpecial: this.isSpecialCell(index + 1),
            isStart: index === 0,
            isEnd: index === 43,
            players: []
        }));
        
        console.log(`🎯 Initialized ${this.cells.length} board cells`);
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
     * Создание спирального расположения ячеек
     */
    createSpiralLayout(container) {
        // Создаем контейнер для спирали
        const spiralContainer = document.createElement('div');
        spiralContainer.className = 'spiral-container';
        
        // Создаем ячейки с позиционированием
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
            
            // Позиционируем ячейку в спирали
            const position = this.getSpiralPosition(cell.id);
            cellElement.style.left = position.x + 'px';
            cellElement.style.top = position.y + 'px';
            
            spiralContainer.appendChild(cellElement);
        });
        
        container.appendChild(spiralContainer);
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
            .spiral-container {
                position: relative;
                width: 700px;
                height: 700px;
                margin: 0 auto;
                background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
                border-radius: 50%;
            }

            .board-cell {
                position: absolute;
                width: 60px;
                height: 60px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                cursor: pointer;
                z-index: 1;
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

            /* Цвета ячеек */
            .board-cell.gold { background: linear-gradient(135deg, #ffd700, #ffed4e); color: #000; }
            .board-cell.pink { background: linear-gradient(135deg, #ff6b9d, #c44569); }
            .board-cell.teal { background: linear-gradient(135deg, #20bf6b, #26de81); }
            .board-cell.purple { background: linear-gradient(135deg, #a55eea, #8b5fbf); }
            .board-cell.orange { background: linear-gradient(135deg, #ff9f43, #ff6348); }
            .board-cell.yellow { background: linear-gradient(135deg, #f9ca24, #f0932b); }
            .board-cell.blue { background: linear-gradient(135deg, #3742fa, #2f3542); }
            .board-cell.red { background: linear-gradient(135deg, #ff3838, #ff6b6b); }
            .board-cell.green { background: linear-gradient(135deg, #2ed573, #7bed9f); }
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
        const colors = {
            1: 'gold', 2: 'pink', 6: 'teal', 14: 'purple', 16: 'orange', 20: 'yellow',
            22: 'blue', 26: 'red', 27: 'green', 28: 'purple', 30: 'blue',
            32: 'orange', 36: 'red', 38: 'green', 40: 'purple', 42: 'blue', 44: 'gold'
        };
        return colors[cellId] || '';
    }

    /**
     * Получение иконки ячейки
     */
    getCellIcon(cellId) {
        const icons = {
            1: '🏁', 2: '💭', 6: '💭', 14: '💭', 16: '💭', 20: '💭',
            22: '💭', 26: '💭', 27: '💭', 28: '💭', 30: '💭',
            32: '💭', 36: '💭', 38: '💭', 40: '💭', 42: '💭', 44: '🏆'
        };
        return icons[cellId] || '●';
    }

    /**
     * Получение названия ячейки
     */
    getCellName(cellId) {
        const names = {
            1: 'СТАРТ',
            2: 'Мечта 1', 6: 'Мечта 2', 14: 'Мечта 3', 16: 'Мечта 4', 20: 'Мечта 5',
            22: 'Мечта 6', 26: 'Мечта 7', 27: 'Мечта 8', 28: 'Мечта 9', 30: 'Мечта 10',
            32: 'Мечта 11', 36: 'Мечта 12', 38: 'Мечта 13', 40: 'Мечта 14', 42: 'Мечта 15', 44: 'ФИНИШ'
        };
        return names[cellId] || `Клетка ${cellId}`;
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