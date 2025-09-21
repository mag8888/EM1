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
     * Создание доски по образцу game-board/game.html
     */
    createSpiralLayout(container) {
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Создаем frame для доски
        const boardFrame = document.createElement('div');
        boardFrame.className = 'board-frame';
        
        // Создаем внешний трек (52 ячейки)
        const outerTrack = document.createElement('div');
        outerTrack.className = 'outer-track';
        outerTrack.id = 'outerTrack';
        
        // Создаем внутренний трек (24 ячейки)
        const innerTrack = document.createElement('div');
        innerTrack.className = 'inner-track';
        innerTrack.id = 'innerTrack';
        
        // Создаем контейнер для токенов игроков
        const playerTokens = document.createElement('div');
        playerTokens.className = 'player-tokens';
        playerTokens.id = 'playerTokens';
        
        // Создаем центральное колесо
        const centerWheel = document.createElement('div');
        centerWheel.className = 'center-wheel';
        centerWheel.id = 'centerWheel';
        centerWheel.innerHTML = `
            <div class="wheel-number" id="wheelNumber">1</div>
        `;
        
        // Добавляем ячейки в соответствующие треки с позиционированием
        this.cells.forEach(cell => {
            const cellElement = document.createElement('div');
            cellElement.className = `track-cell cell-${cell.color}`;
            cellElement.dataset.cellId = cell.id;
            cellElement.innerHTML = `
                <div class="cell-number">${cell.id}</div>
                <div class="cell-icon">${cell.icon}</div>
            `;
            
            // Позиционируем ячейку
            const position = this.getCellPosition(cell.id, cell.isOuter);
            cellElement.style.left = position.x + 'px';
            cellElement.style.top = position.y + 'px';
            
            if (cell.isOuter) {
                outerTrack.appendChild(cellElement);
            } else {
                innerTrack.appendChild(cellElement);
            }
        });
        
        // Собираем доску
        boardFrame.appendChild(outerTrack);
        boardFrame.appendChild(innerTrack);
        boardFrame.appendChild(playerTokens);
        boardFrame.appendChild(centerWheel);
        
        container.appendChild(boardFrame);
    }

    /**
     * Получение позиции ячейки на доске
     */
    getCellPosition(cellId, isOuter) {
        if (isOuter) {
            return this.getOuterTrackPosition(cellId);
        } else {
            return this.getInnerTrackPosition(cellId - 52);
        }
    }

    /**
     * Позиционирование ячеек внешнего трека (52 ячейки)
     */
    getOuterTrackPosition(cellId) {
        const boardSize = 700;
        const cellSize = 54;
        const radius = (boardSize - cellSize) / 2;
        const centerX = boardSize / 2;
        const centerY = boardSize / 2;
        
        // Располагаем ячейки по кругу
        const angle = (cellId - 1) * (2 * Math.PI / 52);
        const x = centerX + radius * Math.cos(angle) - cellSize / 2;
        const y = centerY + radius * Math.sin(angle) - cellSize / 2;
        
        return { x: Math.round(x), y: Math.round(y) };
    }

    /**
     * Позиционирование ячеек внутреннего трека (24 ячейки)
     */
    getInnerTrackPosition(cellIndex) {
        const boardSize = 700;
        const cellSize = 50;
        const radius = (boardSize - cellSize) / 4; // Меньший радиус для внутреннего трека
        const centerX = boardSize / 2;
        const centerY = boardSize / 2;
        
        // Располагаем ячейки по кругу
        const angle = cellIndex * (2 * Math.PI / 24);
        const x = centerX + radius * Math.cos(angle) - cellSize / 2;
        const y = centerY + radius * Math.sin(angle) - cellSize / 2;
        
        return { x: Math.round(x), y: Math.round(y) };
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
            :root {
                --board-size: 700px;
                --outer-cell-size: 54px;
                --outer-cell-gap: 4px;
                --inner-cell-size: 50px;
            }

            .board-frame {
                position: relative;
                width: var(--board-size);
                height: var(--board-size);
                border-radius: 48px;
                background: linear-gradient(160deg, #151d30 0%, #111527 45%, #0f1422 100%);
                box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.04);
                overflow: visible;
            }

            .board-frame::before {
                content: '';
                position: absolute;
                inset: 16px;
                border-radius: 40px;
                background: radial-gradient(circle at 50% 42%, rgba(255, 205, 64, 0.12) 0%, transparent 60%),
                            linear-gradient(200deg, rgba(32, 48, 78, 0.7) 0%, rgba(16, 22, 34, 0.95) 62%);
                border: 1px solid rgba(255, 255, 255, 0.05);
                pointer-events: none;
            }

            .outer-track,
            .inner-track {
                position: absolute;
                inset: 0;
                pointer-events: none;
            }

            .track-cell {
                position: absolute;
                width: var(--outer-cell-size);
                height: var(--outer-cell-size);
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 4px;
                font-size: 20px;
                font-weight: 700;
                color: #fff;
                box-shadow: 0 12px 26px rgba(0, 0, 0, 0.45);
                border: 2px solid rgba(255, 255, 255, 0.14);
                pointer-events: auto;
                transition: transform 0.25s ease, box-shadow 0.25s ease;
            }

            .track-cell:hover {
                transform: translateY(-6px);
                box-shadow: 0 22px 46px rgba(0, 0, 0, 0.55);
            }

            .cell-number {
                position: absolute;
                top: 6px;
                left: 8px;
                font-size: 12px;
                font-weight: 800;
                color: rgba(255, 255, 255, 0.92);
                text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
            }

            .cell-icon {
                font-size: 22px;
                filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.35));
            }

            .cell-pink { background: linear-gradient(145deg, #ff4f93 0%, #ff2780 100%); }
            .cell-green { background: linear-gradient(145deg, #32df8d 0%, #19b86a 100%); }
            .cell-teal { background: linear-gradient(145deg, #25d0ff 0%, #0090f5 100%); }
            .cell-purple { background: linear-gradient(145deg, #a769ff 0%, #7351ff 100%); }
            .cell-orange { background: linear-gradient(145deg, #ffb347 0%, #ff8c42 100%); }
            .cell-yellow { background: linear-gradient(145deg, #ffd65a 0%, #ffb700 100%); color: #2f2600; }
            .cell-blue { background: linear-gradient(145deg, #4e95ff 0%, #2563eb 100%); }
            .cell-red { background: linear-gradient(145deg, #ff6b6b 0%, #ff3b3b 100%); }
            .cell-slate { background: linear-gradient(145deg, #34435a 0%, #1e2838 100%); }

            .inner-track .track-cell {
                width: var(--inner-cell-size);
                height: var(--inner-cell-size);
                font-size: 18px;
                border-width: 1.5px;
            }

            .inner-track .cell-number {
                right: 8px;
                left: auto;
                font-size: 12px;
            }

            .center-wheel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: calc(var(--computed-board-size, var(--board-size)) * 0.32);
                height: calc(var(--computed-board-size, var(--board-size)) * 0.32);
                max-width: 230px;
                max-height: 230px;
                min-width: 170px;
                min-height: 170px;
                border-radius: 50%;
                background: radial-gradient(circle at 50% 40%, rgba(255, 209, 64, 0.78) 0%, rgba(255, 166, 0, 0.82) 34%, rgba(25, 25, 25, 0.96) 64%);
                box-shadow: 0 0 50px rgba(255, 196, 0, 0.5), inset 0 0 40px rgba(0, 0, 0, 0.55);
                border: 4px solid rgba(255, 205, 92, 0.55);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.4s ease, box-shadow 0.4s ease;
            }

            .center-wheel::before {
                content: '';
                position: absolute;
                inset: 18px;
                border-radius: 50%;
                background: radial-gradient(circle at 50% 45%, rgba(0, 0, 0, 0.92) 0%, rgba(40, 40, 40, 1) 65%, rgba(0, 0, 0, 0.94) 100%);
                border: 2px solid rgba(255, 205, 92, 0.45);
            }

            .center-wheel::after {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 50%;
                box-shadow: 0 0 30px rgba(255, 215, 0, 0.35);
                opacity: 0;
                transition: opacity 0.4s ease;
            }

            .center-wheel:hover {
                transform: translate(-50%, -50%) scale(1.03);
                box-shadow: 0 0 70px rgba(255, 196, 0, 0.65), inset 0 0 44px rgba(0, 0, 0, 0.6);
            }

            .center-wheel.spin::after {
                opacity: 1;
            }

            .wheel-number {
                position: relative;
                font-size: clamp(48px, calc(var(--computed-board-size, var(--board-size)) * 0.12), 82px);
                font-weight: 800;
                color: #ffd15a;
                text-shadow: 0 0 20px rgba(255, 196, 0, 0.55);
                z-index: 2;
            }

            .player-tokens {
                position: absolute;
                inset: 0;
                pointer-events: none;
            }

            .player-token {
                position: absolute;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: 700;
                color: #fff;
                box-shadow: 0 12px 20px rgba(0, 0, 0, 0.35);
                border: 2px solid rgba(255, 255, 255, 0.22);
                transform: translate(-50%, -50%);
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