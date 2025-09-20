/**
 * Генератор игровых клеток (леток) для игры "Энергия денег"
 * Создает и управляет клетками игрового поля согласно ТЗ
 */

export class CellGenerator {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.cells = [];
        this.cellTypes = {
            PAYDAY: 'payday',
            CHARITY: 'charity', 
            OPPORTUNITY: 'opportunity',
            EXPENSE: 'expense',
            MARKET: 'market',
            DREAM: 'dream',
            NEUTRAL: 'neutral'
        };
        this.isDestroyed = false;
    }

    /**
     * Инициализация генератора клеток
     */
    async init() {
        console.log('🎯 CellGenerator инициализирован');
        
        // Подписка на события
        this.gameCore.eventBus.on('gameStarted', this.onGameStarted.bind(this));
        this.gameCore.eventBus.on('playerMoved', this.onPlayerMoved.bind(this));
    }

    /**
     * Генерация игрового поля с клетками
     * @param {Object} config - Конфигурация поля
     */
    generateGameBoard(config = {}) {
        const boardConfig = {
            totalCells: 40,
            paydayPositions: [0, 10, 20, 30], // Позиции PAYDAY
            charityPositions: [5, 15, 25, 35], // Позиции благотворительности
            opportunityPositions: [2, 7, 12, 17, 22, 27, 32, 37], // Позиции возможностей
            expensePositions: [3, 8, 13, 18, 23, 28, 33, 38], // Позиции расходов
            marketPositions: [1, 6, 11, 16, 21, 26, 31, 36], // Позиции рынка
            dreamPositions: [4, 9, 14, 19, 24, 29, 34, 39], // Позиции мечт
            ...config
        };

        this.cells = [];
        
        for (let i = 0; i < boardConfig.totalCells; i++) {
            const cell = this.generateCell(i, boardConfig);
            this.cells.push(cell);
        }

        console.log(`🎯 Сгенерировано ${this.cells.length} клеток игрового поля`);
        this.gameCore.eventBus.emit('boardGenerated', { cells: this.cells });
        
        return this.cells;
    }

    /**
     * Генерация отдельной клетки
     * @param {number} position - Позиция клетки
     * @param {Object} boardConfig - Конфигурация поля
     */
    generateCell(position, boardConfig) {
        const cellType = this.determineCellType(position, boardConfig);
        const cellData = this.getCellData(cellType, position);
        
        return {
            id: `cell_${position}`,
            position: position,
            type: cellType,
            name: cellData.name,
            description: cellData.description,
            icon: cellData.icon,
            color: cellData.color,
            effects: cellData.effects,
            actions: cellData.actions,
            cost: cellData.cost || 0,
            income: cellData.income || 0,
            generatedAt: Date.now()
        };
    }

    /**
     * Определение типа клетки по позиции
     * @param {number} position - Позиция
     * @param {Object} boardConfig - Конфигурация поля
     */
    determineCellType(position, boardConfig) {
        if (boardConfig.paydayPositions.includes(position)) {
            return this.cellTypes.PAYDAY;
        }
        if (boardConfig.charityPositions.includes(position)) {
            return this.cellTypes.CHARITY;
        }
        if (boardConfig.opportunityPositions.includes(position)) {
            return this.cellTypes.OPPORTUNITY;
        }
        if (boardConfig.expensePositions.includes(position)) {
            return this.cellTypes.EXPENSE;
        }
        if (boardConfig.marketPositions.includes(position)) {
            return this.cellTypes.MARKET;
        }
        if (boardConfig.dreamPositions.includes(position)) {
            return this.cellTypes.DREAM;
        }
        return this.cellTypes.NEUTRAL;
    }

    /**
     * Получение данных клетки по типу
     * @param {string} cellType - Тип клетки
     * @param {number} position - Позиция
     */
    getCellData(cellType, position) {
        const cellTemplates = {
            [this.cellTypes.PAYDAY]: {
                name: 'PAYDAY',
                description: 'Получите зарплату и оплатите расходы',
                icon: '💰',
                color: '#00ff96',
                effects: {
                    payday: true,
                    income: 2000
                },
                actions: ['payday', 'payExpenses']
            },
            [this.cellTypes.CHARITY]: {
                name: 'Благотворительность',
                description: 'Помогите нуждающимся (10% от дохода)',
                icon: '❤️',
                color: '#ff69b4',
                effects: {
                    charity: true,
                    karma: true
                },
                actions: ['charity', 'skip']
            },
            [this.cellTypes.OPPORTUNITY]: {
                name: 'Возможность',
                description: 'Возможность для инвестиций',
                icon: '🎯',
                color: '#ffd65a',
                effects: {
                    opportunity: true
                },
                actions: ['drawCard', 'invest', 'skip']
            },
            [this.cellTypes.EXPENSE]: {
                name: 'Расходы',
                description: 'Неожиданные расходы',
                icon: '💸',
                color: '#ff3b3b',
                effects: {
                    expense: true
                },
                actions: ['drawCard', 'pay', 'skip']
            },
            [this.cellTypes.MARKET]: {
                name: 'Рынок',
                description: 'Торговля активами',
                icon: '📈',
                color: '#4ecdc4',
                effects: {
                    market: true
                },
                actions: ['buy', 'sell', 'trade']
            },
            [this.cellTypes.DREAM]: {
                name: 'Мечта',
                description: 'Достижение вашей мечты',
                icon: '🌟',
                color: '#ff6b6b',
                effects: {
                    dream: true
                },
                actions: ['achieveDream', 'skip']
            },
            [this.cellTypes.NEUTRAL]: {
                name: 'Обычная клетка',
                description: 'Ничего особенного не происходит',
                icon: '⚪',
                color: '#6b7280',
                effects: {},
                actions: ['skip']
            }
        };

        const template = cellTemplates[cellType] || cellTemplates[this.cellTypes.NEUTRAL];
        
        // Добавляем вариативность для одинаковых типов клеток
        return this.addVariation(template, position);
    }

    /**
     * Добавление вариативности к клетке
     * @param {Object} template - Шаблон клетки
     * @param {number} position - Позиция
     */
    addVariation(template, position) {
        const variations = {
            [this.cellTypes.OPPORTUNITY]: [
                { name: 'Малая возможность', cost: 5000, income: 500 },
                { name: 'Средняя возможность', cost: 15000, income: 1500 },
                { name: 'Большая возможность', cost: 50000, income: 5000 }
            ],
            [this.cellTypes.EXPENSE]: [
                { name: 'Малые расходы', cost: 2000 },
                { name: 'Средние расходы', cost: 8000 },
                { name: 'Большие расходы', cost: 25000 }
            ],
            [this.cellTypes.MARKET]: [
                { name: 'Рынок акций', description: 'Торговля акциями' },
                { name: 'Рынок недвижимости', description: 'Торговля недвижимостью' },
                { name: 'Рынок бизнеса', description: 'Торговля бизнесом' }
            ],
            [this.cellTypes.DREAM]: [
                { name: 'Дом мечты', cost: 100000 },
                { name: 'Путешествие мечты', cost: 50000 },
                { name: 'Бизнес мечты', cost: 200000 }
            ]
        };

        const cellVariations = variations[template.type];
        if (cellVariations) {
            const variation = cellVariations[position % cellVariations.length];
            return {
                ...template,
                ...variation,
                variationIndex: position % cellVariations.length
            };
        }

        return template;
    }

    /**
     * Получение клетки по позиции
     * @param {number} position - Позиция клетки
     */
    getCell(position) {
        if (position < 0 || position >= this.cells.length) {
            return null;
        }
        return this.cells[position];
    }

    /**
     * Получение всех клеток определенного типа
     * @param {string} type - Тип клетки
     */
    getCellsByType(type) {
        return this.cells.filter(cell => cell.type === type);
    }

    /**
     * Получение клеток в радиусе от позиции
     * @param {number} position - Центральная позиция
     * @param {number} radius - Радиус
     */
    getCellsInRadius(position, radius = 2) {
        const cells = [];
        const totalCells = this.cells.length;
        
        for (let i = -radius; i <= radius; i++) {
            const cellPosition = (position + i + totalCells) % totalCells;
            const cell = this.getCell(cellPosition);
            if (cell) {
                cells.push({
                    ...cell,
                    distance: Math.abs(i)
                });
            }
        }
        
        return cells.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Получение статистики клеток
     */
    getCellsStats() {
        const stats = {
            total: this.cells.length,
            byType: {},
            byColor: {},
            totalCost: 0,
            totalIncome: 0
        };

        this.cells.forEach(cell => {
            // Подсчет по типам
            stats.byType[cell.type] = (stats.byType[cell.type] || 0) + 1;
            
            // Подсчет по цветам
            stats.byColor[cell.color] = (stats.byColor[cell.color] || 0) + 1;
            
            // Подсчет стоимости и дохода
            stats.totalCost += cell.cost || 0;
            stats.totalIncome += cell.income || 0;
        });

        return stats;
    }

    /**
     * Обновление клетки
     * @param {number} position - Позиция клетки
     * @param {Object} updates - Обновления
     */
    updateCell(position, updates) {
        if (position < 0 || position >= this.cells.length) {
            return false;
        }

        const cell = this.cells[position];
        Object.assign(cell, updates, { updatedAt: Date.now() });
        
        this.gameCore.eventBus.emit('cellUpdated', { cell, position });
        return true;
    }

    /**
     * Сброс всех клеток
     */
    resetCells() {
        this.cells.forEach(cell => {
            cell.resetAt = Date.now();
        });
        
        this.gameCore.eventBus.emit('cellsReset', { cells: this.cells });
        console.log('🎯 Все клетки сброшены');
    }

    /**
     * Получение информации о поле
     */
    getBoardInfo() {
        return {
            totalCells: this.cells.length,
            cellTypes: Object.keys(this.cellTypes),
            stats: this.getCellsStats(),
            generatedAt: this.cells[0]?.generatedAt || Date.now()
        };
    }

    /**
     * Обработчики событий
     */
    onGameStarted(data) {
        console.log('🎯 Игра началась, генерация поля...');
        this.generateGameBoard();
    }

    onPlayerMoved(data) {
        const cell = this.getCell(data.to);
        if (cell) {
            this.gameCore.eventBus.emit('playerLandedOnCell', {
                player: data.playerId,
                cell,
                position: data.to
            });
        }
    }

    /**
     * Уничтожение генератора
     */
    destroy() {
        this.cells = [];
        this.isDestroyed = true;
        console.log('🗑️ CellGenerator уничтожен');
    }
}

export default CellGenerator;
