/**
 * Game Board UI v3.0 - Банковский стиль
 * 
 * Основные возможности:
 * - Спиральный путь с внутренним квадратом и внешним периметром
 * - Специальные большие ячейки (Большая сделка, Малая сделка, Расходы, Рынок)
 * - Боковая панель с финансовой информацией
 * - Иконки для разных типов ячеек
 * - Современный банковский дизайн
 */

class GameBoardUIBanking {
    constructor(containerId = 'game-board-container') {
        console.log('🏦 GameBoardUIBanking v3.0: Инициализация');
        
        this.containerId = containerId;
        this.container = null;
        this.gameBoard = null;
        this.playerTokens = new Map();
        this.animations = new Map();
        this.notifications = [];
        
        // Конфигурация UI
        this.config = {
            cellSize: 50,
            boardPadding: 20,
            tokenSize: 35,
            animationDuration: 300,
            notificationDuration: 3000,
            specialCellWidth: 120,
            specialCellHeight: 80
        };
        
        // Состояние UI
        this.uiState = {
            isInitialized: false,
            currentTheme: 'banking',
            showAnimations: true,
            showNotifications: true
        };
        
        this.initializeUI();
    }

    /**
     * Инициализация UI
     */
    initializeUI() {
        console.log('🏦 GameBoardUIBanking: Инициализация интерфейса');
        
        // Находим контейнер
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('❌ GameBoardUIBanking: Контейнер не найден');
            return;
        }
        
        // Создаем игровое поле
        this.createGameBoard();
        
        // Добавляем стили
        this.addStyles();
        
        // Инициализируем систему уведомлений
        this.initializeNotifications();
        
        this.uiState.isInitialized = true;
        console.log('🏦 GameBoardUIBanking: UI инициализирован');
    }

    /**
     * Создание игрового поля в банковском стиле
     */
    createGameBoard() {
        console.log('🏦 GameBoardUIBanking: Создание игрового поля в банковском стиле');
        
        // Создаем основной контейнер
        this.gameBoard = document.createElement('div');
        this.gameBoard.className = 'game-board-banking';
        this.gameBoard.innerHTML = `
            <div class="banking-header">
                <h1>💰 Энергия денег</h1>
                <div class="game-controls">
                    <button id="pause-btn" class="control-btn">⏸️ Пауза</button>
                    <button id="settings-btn" class="control-btn">⚙️ Настройки</button>
                </div>
            </div>
            <div class="banking-container">
                <div class="board-area">
                    <div class="spiral-path" id="spiral-path">
                        <!-- Спиральный путь будет создан динамически -->
                    </div>
                    <div class="special-cells">
                        <div class="special-cell big-deal" data-type="big-deal">
                            <div class="special-cell-icon">💰</div>
                            <div class="special-cell-title">Большая сделка</div>
                            <div class="special-cell-cards">24 карт</div>
                        </div>
                        <div class="special-cell small-deal" data-type="small-deal">
                            <div class="special-cell-icon">🏠</div>
                            <div class="special-cell-title">Малая сделка</div>
                            <div class="special-cell-cards">62 карт</div>
                        </div>
                        <div class="special-cell expenses" data-type="expenses">
                            <div class="special-cell-icon">👤</div>
                            <div class="special-cell-title">Расходы</div>
                            <div class="special-cell-cards">24 карт</div>
                            <div class="special-cell-discard">Отбой: 0</div>
                        </div>
                        <div class="special-cell market" data-type="market">
                            <div class="special-cell-icon">🏢</div>
                            <div class="special-cell-title">Рынок</div>
                            <div class="special-cell-cards">24 карт</div>
                            <div class="special-cell-discard">Отбой: 0</div>
                        </div>
                    </div>
                </div>
                <div class="banking-sidebar">
                    <div class="financial-overview">
                        <h3>💰 Финансы</h3>
                        <div class="financial-item">
                            <span class="financial-label">Доход:</span>
                            <span class="financial-value income">$0</span>
                            <span class="financial-icon">📈</span>
                        </div>
                        <div class="financial-item">
                            <span class="financial-label">Расходы:</span>
                            <span class="financial-value expenses">$0</span>
                            <span class="financial-icon">📉</span>
                        </div>
                        <div class="financial-item">
                            <span class="financial-label">$ PAYDAY:</span>
                            <span class="financial-value payday">$0/мес</span>
                            <span class="financial-icon">💵</span>
                        </div>
                    </div>
                    <div class="credit-section">
                        <h3>💳 Кредит</h3>
                        <div class="credit-item">
                            <span class="credit-label">Кредит:</span>
                            <span class="credit-value">$0</span>
                        </div>
                        <div class="credit-item">
                            <span class="credit-label">Макс. кредит:</span>
                            <span class="credit-value">$0</span>
                        </div>
                        <div class="credit-buttons">
                            <button class="credit-btn no-credit">✅ Без кредитов</button>
                            <button class="credit-btn take-credit">📊 Взять</button>
                        </div>
                        <div class="credit-hint">Нажмите для открытия банковских операций</div>
                    </div>
                    <div class="assets-section">
                        <h3>📁 Активы</h3>
                        <div class="assets-value">$0</div>
                        <div class="assets-income">Доход: $0/мес</div>
                    </div>
                    <div class="turn-status">
                        <div class="turn-indicator">
                            <span class="turn-text">ОЖИДАНИЕ ХОДА</span>
                            <span class="turn-subtext">НЕ ВАШ ход</span>
                        </div>
                        <div class="turn-timer">
                            <span class="timer-icon">⏰</span>
                            <span class="timer-text">Время хода</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="notifications-container" id="notifications-container"></div>
        `;
        
        this.container.appendChild(this.gameBoard);
        
        // Создаем спиральный путь
        this.createSpiralPath();
        
        // Добавляем обработчики событий
        this.addEventListeners();
    }

    /**
     * Создание спирального пути
     */
    createSpiralPath() {
        const spiralPath = document.getElementById('spiral-path');
        if (!spiralPath) return;
        
        // Создаем центральную стартовую ячейку
        const startCell = document.createElement('div');
        startCell.className = 'path-cell start-cell';
        startCell.dataset.cellIndex = 0;
        startCell.innerHTML = `
            <div class="cell-number">1</div>
            <div class="cell-icon">💰</div>
            <div class="cell-tokens" id="tokens-0"></div>
        `;
        spiralPath.appendChild(startCell);
        
        // Создаем внутренний квадрат (ячейки 2-24)
        this.createInnerSquare(spiralPath);
        
        // Создаем внешний периметр (ячейки 25-76)
        this.createOuterPerimeter(spiralPath);
    }

    /**
     * Создание внутреннего квадрата
     */
    createInnerSquare(container) {
        const innerSquare = document.createElement('div');
        innerSquare.className = 'inner-square';
        
        // Создаем ячейки 2-24 в спиральном порядке
        for (let i = 1; i < 24; i++) {
            const cell = document.createElement('div');
            cell.className = 'path-cell inner-cell';
            cell.dataset.cellIndex = i;
            
            const cellType = this.getCellType(i);
            const cellIcon = this.getCellIcon(cellType);
            
            cell.innerHTML = `
                <div class="cell-number">${i + 1}</div>
                <div class="cell-icon">${cellIcon}</div>
                <div class="cell-tokens" id="tokens-${i}"></div>
            `;
            
            cell.classList.add(`cell-${cellType}`);
            innerSquare.appendChild(cell);
        }
        
        container.appendChild(innerSquare);
    }

    /**
     * Создание внешнего периметра
     */
    createOuterPerimeter(container) {
        const outerPerimeter = document.createElement('div');
        outerPerimeter.className = 'outer-perimeter';
        
        // Создаем ячейки 25-76
        for (let i = 24; i < 76; i++) {
            const cell = document.createElement('div');
            cell.className = 'path-cell outer-cell';
            cell.dataset.cellIndex = i;
            
            const cellType = this.getCellType(i);
            const cellIcon = this.getCellIcon(cellType);
            
            cell.innerHTML = `
                <div class="cell-number">${i + 1}</div>
                <div class="cell-icon">${cellIcon}</div>
                <div class="cell-tokens" id="tokens-${i}"></div>
            `;
            
            cell.classList.add(`cell-${cellType}`);
            outerPerimeter.appendChild(cell);
        }
        
        container.appendChild(outerPerimeter);
    }

    /**
     * Получить тип ячейки
     */
    getCellType(index) {
        const types = ['money', 'growth', 'person', 'card', 'timer', 'market', 'house', 'building'];
        return types[index % types.length];
    }

    /**
     * Получить иконку ячейки
     */
    getCellIcon(type) {
        const icons = {
            'money': '💰',
            'growth': '📈',
            'person': '👤',
            'card': '🃏',
            'timer': '⏰',
            'market': '🏪',
            'house': '🏠',
            'building': '🏢'
        };
        return icons[type] || '💰';
    }

    /**
     * Добавить стили
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .game-board-banking {
                width: 100%;
                height: 100vh;
                background: linear-gradient(135deg, #1a1d24 0%, #2d3748 100%);
                color: #ffffff;
                font-family: 'Inter', sans-serif;
                overflow: hidden;
                position: relative;
            }

            .banking-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                background: linear-gradient(135deg, rgba(0, 255, 150, 0.1) 0%, rgba(0, 212, 170, 0.05) 100%);
                border-bottom: 2px solid rgba(0, 255, 150, 0.3);
            }

            .banking-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                background: linear-gradient(135deg, #00ff96 0%, #00d4aa 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .game-controls {
                display: flex;
                gap: 12px;
            }

            .control-btn {
                padding: 10px 16px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #ffffff;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .control-btn:hover {
                background: linear-gradient(135deg, rgba(0, 255, 150, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%);
                border-color: rgba(0, 255, 150, 0.4);
                transform: translateY(-2px);
            }

            .banking-container {
                display: flex;
                height: calc(100vh - 80px);
            }

            .board-area {
                flex: 1;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .spiral-path {
                position: relative;
                width: 600px;
                height: 600px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .start-cell {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                z-index: 10;
            }

            .start-cell .cell-number {
                font-size: 18px;
                font-weight: 700;
                color: #1a1d24;
                margin-bottom: 4px;
            }

            .start-cell .cell-icon {
                font-size: 24px;
            }

            .inner-square {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                height: 400px;
                border: 2px solid rgba(0, 255, 150, 0.3);
                border-radius: 8px;
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                grid-template-rows: repeat(5, 1fr);
                gap: 2px;
                padding: 10px;
            }

            .outer-perimeter {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 580px;
                height: 580px;
                border: 2px solid rgba(0, 191, 255, 0.3);
                border-radius: 12px;
                display: grid;
                grid-template-columns: repeat(13, 1fr);
                grid-template-rows: repeat(13, 1fr);
                gap: 2px;
                padding: 10px;
            }

            .path-cell {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                transition: all 0.3s ease;
            }

            .path-cell:hover {
                background: linear-gradient(135deg, rgba(0, 255, 150, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%);
                border-color: rgba(0, 255, 150, 0.4);
                transform: scale(1.05);
            }

            .cell-number {
                font-size: 10px;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 2px;
            }

            .cell-icon {
                font-size: 14px;
            }

            .cell-tokens {
                position: absolute;
                top: 2px;
                right: 2px;
                display: flex;
                gap: 2px;
            }

            .special-cells {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
            }

            .special-cell {
                position: absolute;
                width: 120px;
                height: 80px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                pointer-events: all;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .special-cell:hover {
                background: linear-gradient(135deg, rgba(0, 255, 150, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%);
                border-color: rgba(0, 255, 150, 0.5);
                transform: scale(1.05);
            }

            .big-deal {
                top: 20px;
                left: 20px;
                background: linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 153, 204, 0.1) 100%);
                border-color: rgba(0, 191, 255, 0.4);
            }

            .small-deal {
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 153, 204, 0.1) 100%);
                border-color: rgba(0, 191, 255, 0.4);
            }

            .expenses {
                bottom: 20px;
                left: 20px;
                background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 77, 77, 0.1) 100%);
                border-color: rgba(255, 107, 107, 0.4);
            }

            .market {
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 153, 204, 0.1) 100%);
                border-color: rgba(0, 191, 255, 0.4);
            }

            .special-cell-icon {
                font-size: 24px;
                margin-bottom: 4px;
            }

            .special-cell-title {
                font-size: 12px;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 2px;
            }

            .special-cell-cards {
                font-size: 10px;
                color: #a0a0a0;
            }

            .special-cell-discard {
                font-size: 9px;
                color: #ff6b6b;
                margin-top: 2px;
            }

            .banking-sidebar {
                width: 300px;
                background: linear-gradient(135deg, rgba(26, 29, 36, 0.95) 0%, rgba(36, 40, 48, 0.9) 100%);
                border-left: 2px solid rgba(0, 255, 150, 0.3);
                padding: 20px;
                overflow-y: auto;
            }

            .financial-overview,
            .credit-section,
            .assets-section,
            .turn-status {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
            }

            .financial-overview h3,
            .credit-section h3,
            .assets-section h3 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }

            .financial-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .financial-label {
                font-size: 14px;
                color: #a0a0a0;
            }

            .financial-value {
                font-size: 16px;
                font-weight: 700;
            }

            .financial-value.income {
                color: #00ff96;
            }

            .financial-value.expenses {
                color: #ff6b6b;
            }

            .financial-value.payday {
                color: #ffffff;
            }

            .financial-icon {
                font-size: 16px;
            }

            .credit-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .credit-label {
                font-size: 14px;
                color: #a0a0a0;
            }

            .credit-value {
                font-size: 16px;
                font-weight: 700;
                color: #00bfff;
            }

            .credit-buttons {
                display: flex;
                gap: 8px;
                margin: 12px 0;
            }

            .credit-btn {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .credit-btn.no-credit {
                background: linear-gradient(135deg, #00ff96 0%, #00d4aa 100%);
                color: #1a1d24;
            }

            .credit-btn.take-credit {
                background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
                color: #ffffff;
            }

            .credit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .credit-hint {
                font-size: 10px;
                color: #a0a0a0;
                text-align: center;
            }

            .assets-value {
                font-size: 24px;
                font-weight: 700;
                color: #00ff96;
                text-align: center;
                margin-bottom: 8px;
            }

            .assets-income {
                font-size: 14px;
                color: #a0a0a0;
                text-align: center;
            }

            .turn-indicator {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                border-radius: 8px;
                padding: 12px;
                text-align: center;
                margin-bottom: 12px;
            }

            .turn-text {
                display: block;
                font-size: 14px;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 4px;
            }

            .turn-subtext {
                font-size: 12px;
                color: #e0e0e0;
            }

            .turn-timer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .timer-icon {
                font-size: 16px;
            }

            .timer-text {
                font-size: 14px;
                color: #a0a0a0;
            }

            .notifications-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }

            /* Анимации */
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .game-board-banking {
                animation: slideIn 0.5s ease;
            }

            /* Адаптивность */
            @media (max-width: 1200px) {
                .banking-sidebar {
                    width: 250px;
                }
            }

            @media (max-width: 768px) {
                .banking-container {
                    flex-direction: column;
                }
                
                .banking-sidebar {
                    width: 100%;
                    height: 200px;
                }
                
                .board-area {
                    height: calc(100vh - 280px);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Добавить обработчики событий
     */
    addEventListeners() {
        // Обработчики для кнопок управления
        const pauseBtn = document.getElementById('pause-btn');
        const settingsBtn = document.getElementById('settings-btn');
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // Обработчики для специальных ячеек
        const specialCells = document.querySelectorAll('.special-cell');
        specialCells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleSpecialCellClick(e));
        });
    }

    /**
     * Переключить паузу
     */
    togglePause() {
        console.log('⏸️ GameBoardUIBanking: Переключение паузы');
        // Логика паузы
    }

    /**
     * Открыть настройки
     */
    openSettings() {
        console.log('⚙️ GameBoardUIBanking: Открытие настроек');
        // Логика настроек
    }

    /**
     * Обработка клика по специальной ячейке
     */
    handleSpecialCellClick(event) {
        const cellType = event.currentTarget.dataset.type;
        console.log(`🏦 GameBoardUIBanking: Клик по специальной ячейке: ${cellType}`);
        // Логика обработки специальных ячеек
    }

    /**
     * Инициализация системы уведомлений
     */
    initializeNotifications() {
        console.log('🔔 GameBoardUIBanking: Инициализация уведомлений');
        // Логика уведомлений
    }

    /**
     * Создать фишку игрока
     */
    createPlayerToken(playerIndex, playerName, color, position = 0) {
        const tokenId = `player-token-${playerIndex}`;
        
        // Удаляем старую фишку если есть
        const existingToken = document.getElementById(tokenId);
        if (existingToken) {
            existingToken.remove();
        }

        // Создаем новую фишку
        const token = document.createElement('div');
        token.id = tokenId;
        token.className = 'player-token';
        token.style.cssText = `
            width: ${this.config.tokenSize}px;
            height: ${this.config.tokenSize}px;
            background: linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 20)} 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
            position: absolute;
            z-index: 100;
        `;
        
        token.textContent = playerName.charAt(0).toUpperCase();
        token.title = playerName;
        
        // Добавляем фишку в контейнер токенов
        const tokensContainer = document.getElementById(`tokens-${position}`);
        if (tokensContainer) {
            tokensContainer.appendChild(token);
        }
        
        // Сохраняем фишку
        this.playerTokens.set(playerIndex, {
            element: token,
            position: position,
            color: color
        });
        
        console.log(`🎯 GameBoardUIBanking: Фишка игрока ${playerName} создана`);
    }

    /**
     * Затемнить цвет
     */
    darkenColor(color, percent) {
        // Простая функция для затемнения цвета
        return color; // Заглушка
    }

    /**
     * Обновить позицию фишки
     */
    updatePlayerPosition(playerIndex, newPosition) {
        const tokenData = this.playerTokens.get(playerIndex);
        if (!tokenData) return;
        
        // Удаляем фишку из старой позиции
        const oldTokensContainer = document.getElementById(`tokens-${tokenData.position}`);
        if (oldTokensContainer && tokenData.element.parentNode === oldTokensContainer) {
            tokenData.element.remove();
        }
        
        // Добавляем фишку в новую позицию
        const newTokensContainer = document.getElementById(`tokens-${newPosition}`);
        if (newTokensContainer) {
            newTokensContainer.appendChild(tokenData.element);
            tokenData.position = newPosition;
        }
        
        console.log(`🎯 GameBoardUIBanking: Фишка игрока ${playerIndex} перемещена на позицию ${newPosition}`);
    }

    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notifications-container');
        if (container) {
            container.appendChild(notification);
            
            // Удаляем уведомление через заданное время
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, this.config.notificationDuration);
        }
    }
}

// Экспорт класса
export default GameBoardUIBanking;
