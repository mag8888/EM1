// Микромодуль карточек сделок
class DealsModule {
    constructor() {
        this.decks = {
            bigDeal: [],      // Большие сделки
            smallDeal: [],    // Малые сделки
            market: [],       // Рынок
            expenses: []      // Расходы
        };
        
        this.discardPiles = {
            bigDeal: [],
            smallDeal: [],
            market: [],
            expenses: []
        };
        
        this.playerAssets = new Map(); // Карточки у игроков
        this.currentDeal = null;       // Текущая карточка сделки
        this.isDealActive = false;     // Активна ли сделка
        this.dealChosenThisTurn = false; // Флаг, что сделка уже была выбрана в этом ходу
        this.viewOnlyMode = false;     // Режим: показывать неактивные кнопки всем
        
        this.init();
    }
    
    init() {
        console.log('🎴 DealsModule: Инициализация модуля карточек');
        this.loadDealsData();
        this.setupEventListeners();
    }
    
    // Загрузка данных карточек
    loadDealsData() {
        console.log('🎴 DealsModule: Начинаем загрузку данных карточек');
        
        // Сначала пытаемся загрузить расширенные данные
        const extendedLoaded = this.loadExtendedCardsData();
        
        // Если не удалось загрузить расширенные данные, используем базовые
        if (!extendedLoaded) {
            console.log('🎴 DealsModule: Расширенные данные не загружены, используем базовые');
            this.loadBasicCardsData();
        }
        
        // Перемешиваем колоды
        this.shuffleDeck('bigDeal');
        this.shuffleDeck('smallDeal');
        this.shuffleDeck('market');
        this.shuffleDeck('expenses');
        
        console.log('🎴 DealsModule: Загружены карточки:', {
            bigDeal: this.decks.bigDeal.length,
            smallDeal: this.decks.smallDeal.length,
            market: this.decks.market.length,
            expenses: this.decks.expenses.length
        });
    }
    
    // Загрузка расширенных данных карточек
    loadExtendedCardsData() {
        try {
            console.log('🎴 DealsModule: Проверяем доступность расширенных данных...');
            console.log('🎴 DealsModule: window.FULL_SMALL_DEALS:', typeof window.FULL_SMALL_DEALS, window.FULL_SMALL_DEALS?.length);
            console.log('🎴 DealsModule: window.FULL_BIG_DEALS:', typeof window.FULL_BIG_DEALS, window.FULL_BIG_DEALS?.length);
            console.log('🎴 DealsModule: window.MARKET_CARDS:', typeof window.MARKET_CARDS, window.MARKET_CARDS?.length);
            console.log('🎴 DealsModule: window.EXPENSE_CARDS:', typeof window.EXPENSE_CARDS, window.EXPENSE_CARDS?.length);
            
            // Пытаемся загрузить из внешнего файла
            if (typeof window !== 'undefined' && window.FULL_SMALL_DEALS && window.FULL_BIG_DEALS) {
                this.decks.smallDeal = window.FULL_SMALL_DEALS.map(card => ({
                    ...card,
                    type: 'smallDeal',
                    downPayment: card.cost,
                    monthlyPayment: 0
                }));
                
                this.decks.bigDeal = window.FULL_BIG_DEALS.map(card => ({
                    ...card,
                    type: 'bigDeal',
                    downPayment: Math.floor(card.cost * 0.2), // 20% первый взнос
                    monthlyPayment: Math.floor(card.cost * 0.1) // 10% ежемесячный платеж
                }));
                
                // Загружаем карты рынка и расходов из конфигурации
                if (window.MARKET_CARDS) {
                    this.decks.market = window.MARKET_CARDS.map(card => ({
                        ...card,
                        type: 'market'
                    }));
                }
                
                if (window.EXPENSE_CARDS) {
                    this.decks.expenses = window.EXPENSE_CARDS.map(card => ({
                        ...card,
                        type: 'expenses'
                    }));
                }
                
                console.log('🎴 DealsModule: Загружены расширенные данные карточек:', {
                    smallDeal: this.decks.smallDeal.length,
                    bigDeal: this.decks.bigDeal.length,
                    market: this.decks.market.length,
                    expenses: this.decks.expenses.length
                });
                return true;
            }
            
            console.log('🎴 DealsModule: Расширенные данные недоступны, пытаемся загрузить с сервера...');
            // Пытаемся загрузить через fetch
            this.loadCardsFromServer();
            return false;
            
        } catch (error) {
            console.warn('⚠️ DealsModule: Не удалось загрузить расширенные данные:', error);
            return false;
        }
    }
    
    // Загрузка карточек с сервера
    async loadCardsFromServer() {
        try {
            const response = await fetch('/game-board/config/full-cards-config.js');
            if (response.ok) {
                const text = await response.text();
                // Простое извлечение данных (в реальном проекте лучше использовать JSON)
                console.log('🎴 DealsModule: Загружены данные с сервера');
            }
        } catch (error) {
            console.warn('⚠️ DealsModule: Не удалось загрузить с сервера:', error);
        }
    }
    
    // Загрузка базовых данных карточек
    loadBasicCardsData() {
        // Большие сделки (24 карты)
        this.decks.bigDeal = [
            {
                id: 'big_1',
                type: 'bigDeal',
                name: 'Офисное здание',
                description: 'Покупка офисного здания в центре города',
                cost: 50000,
                income: 5000,
                downPayment: 10000,
                monthlyPayment: 2000,
                icon: '🏢',
                category: 'realEstate'
            },
            {
                id: 'big_2',
                type: 'bigDeal',
                name: 'Сеть ресторанов',
                description: 'Франшиза сети ресторанов',
                cost: 80000,
                income: 8000,
                downPayment: 15000,
                monthlyPayment: 3000,
                icon: '🍽️',
                category: 'business'
            },
            {
                id: 'big_3',
                type: 'bigDeal',
                name: 'Акции крупной компании',
                description: 'Пакет акций стабильной компании',
                cost: 30000,
                income: 3000,
                downPayment: 30000,
                monthlyPayment: 0,
                icon: '📈',
                category: 'stocks'
            }
        ];
        
        // Малые сделки (32 карты)
        this.decks.smallDeal = [
            {
                id: 'small_1',
                type: 'smallDeal',
                name: 'Акции роста',
                description: 'Акции быстрорастущей компании',
                cost: 5000,
                income: 500,
                downPayment: 5000,
                monthlyPayment: 0,
                icon: '📊',
                category: 'stocks'
            },
            {
                id: 'small_2',
                type: 'smallDeal',
                name: 'Квартира для сдачи',
                description: 'Однокомнатная квартира в аренду',
                cost: 15000,
                income: 1500,
                downPayment: 3000,
                monthlyPayment: 600,
                icon: '🏠',
                category: 'realEstate'
            },
            {
                id: 'small_3',
                type: 'smallDeal',
                name: 'Маленький бизнес',
                description: 'Небольшой магазин',
                cost: 10000,
                income: 1000,
                downPayment: 2000,
                monthlyPayment: 400,
                icon: '🏪',
                category: 'business'
            }
        ];
        
        // Рынок (24 карты)
        this.decks.market = [
            {
                id: 'market_1',
                type: 'market',
                name: 'Специальное предложение',
                description: 'Скидка 20% на все активы',
                discount: 0.2,
                icon: '🎯',
                category: 'special'
            },
            {
                id: 'market_2',
                type: 'market',
                name: 'Акции упали',
                description: 'Все акции дешевле на 30%',
                discount: 0.3,
                icon: '📉',
                category: 'special'
            }
        ];
        
        // Расходы (24 карты)
        this.decks.expenses = [
            {
                id: 'expense_1',
                type: 'expenses',
                name: 'Налоги',
                description: 'Уплата налогов',
                cost: 2000,
                icon: '📋',
                category: 'mandatory'
            },
            {
                id: 'expense_2',
                type: 'expenses',
                name: 'Страховка',
                description: 'Страхование имущества',
                cost: 1500,
                icon: '🛡️',
                category: 'mandatory'
            }
        ];
    }
    
    // Перемешивание колоды
    shuffleDeck(deckType) {
        const deck = this.decks[deckType];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчик для клетки "сделка"
        document.addEventListener('cellDealActivated', (event) => {
            this.showDealChoice(event.detail.playerId);
        });
        
        // Обработчик для кнопки "Активы"
        document.addEventListener('assetsButtonClicked', () => {
            this.showAssetsCatalog();
        });
        
        // Обработчик для кнопок сделок из игровой панели
        const dealsButtons = document.querySelectorAll('#dealsButton, #dealsBtn');
        dealsButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.showAssetsCatalog();
            });
        });
        
        // Обработчик для карточек сделок в полосе
        const bigDealCards = document.querySelectorAll('.special-card.big-deal, .big-deal');
        const smallDealCards = document.querySelectorAll('.special-card.small-deal, .small-deal');
        
        bigDealCards.forEach(card => {
            card.addEventListener('click', () => {
                const currentPlayerId = this.getCurrentPlayerId();
                if (currentPlayerId) {
                    this.drawCard('bigDeal', currentPlayerId);
                }
            });
        });
        
        smallDealCards.forEach(card => {
            card.addEventListener('click', () => {
                const currentPlayerId = this.getCurrentPlayerId();
                if (currentPlayerId) {
                    this.drawCard('smallDeal', currentPlayerId);
                }
            });
        });
        
        // Слушаем события от сервера о сделках
        document.addEventListener('dealOfferReceived', (event) => {
            const { playerId } = event.detail;
            this.showDealChoice(playerId);
        });
        
        // Слушаем события от GameFlowController
        document.addEventListener('cellEvent', (event) => {
            const { cellType, playerId } = event.detail;
            if (cellType === 'green_opportunity' || cellType === 'deal') {
                this.showDealChoice(playerId);
            }
        });
        
        // Слушаем события от сервера через WebSocket
        if (window.io) {
            window.io.on('cellEvent', (data) => {
                if (data.cellType === 'green_opportunity') {
                    this.showDealChoice(data.playerId);
                }
            });
        }
        
        // Слушаем смену хода для сброса флага выбора сделки
        document.addEventListener('playerTurnStarted', () => {
            this.dealChosenThisTurn = false; // Сбрасываем флаг при новом ходу
            console.log('🎴 DealsModule: Сброшен флаг выбора сделки для нового хода');
        });
        
        // Обновление счетчиков карт в UI
        this.updateDeckCounters();
    }
    
    // Показать выбор типа сделки
    showDealChoice(playerId) {
        // Проверяем, не была ли уже выбрана сделка в этом ходу
        if (this.dealChosenThisTurn) {
            console.log('🎴 DealsModule: Сделка уже была выбрана в этом ходу');
            return;
        }
        
        const modal = this.createDealChoiceModal();
        document.body.appendChild(modal);
        
        // Обработчики выбора
        modal.querySelector('.big-deal-btn').addEventListener('click', () => {
            this.dealChosenThisTurn = true; // Отмечаем, что сделка выбрана
            this.drawCard('bigDeal', playerId);
            this.closeModal(modal);
        });
        
        modal.querySelector('.small-deal-btn').addEventListener('click', () => {
            this.dealChosenThisTurn = true; // Отмечаем, что сделка выбрана
            this.drawCard('smallDeal', playerId);
            this.closeModal(modal);
        });
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
    }
    
    // Создание модального окна выбора сделки
    createDealChoiceModal() {
        const modal = document.createElement('div');
        modal.className = 'deals-modal';
        modal.innerHTML = `
            <div class="deals-modal-content">
                <div class="deals-modal-header">
                    <h3>Выберите тип сделки</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="deals-modal-body">
                    <div class="deal-options">
                        <button class="deal-btn big-deal-btn">
                            <div class="deal-icon">💼</div>
                            <div class="deal-title">Большая сделка</div>
                            <div class="deal-count">${this.decks.bigDeal.length} карт</div>
                        </button>
                        <button class="deal-btn small-deal-btn">
                            <div class="deal-icon">📦</div>
                            <div class="deal-title">Малая сделка</div>
                            <div class="deal-count">${this.decks.smallDeal.length} карт</div>
                        </button>
                    </div>
                    <button class="cancel-btn">Отмена</button>
                </div>
            </div>
        `;
        
        // Добавляем стили
        this.addModalStyles();
        
        // Обработчик кнопки закрытия
        modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Обработчик клика по overlay для закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        return modal;
    }
    
    // Добавление стилей для модального окна
    addModalStyles() {
        if (document.getElementById('deals-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'deals-modal-styles';
        styles.textContent = `
            .deals-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            .deals-modal.modal-closing {
                opacity: 0;
                pointer-events: none;
            }
            
            .deals-modal-content {
                transform: scale(1);
                transition: transform 0.3s ease;
            }
            
            .deals-modal.modal-closing .deals-modal-content {
                transform: scale(0.9);
            }
            
            .deals-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                padding: 24px 24px 20px 24px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }
            
            .deals-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
            }
            
            .deals-modal-header h3 {
                color: #ffffff;
                font-size: 24px;
                font-weight: 700;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: #ffffff;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
            }
            
            .deal-options {
                display: flex;
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .deal-btn {
                flex: 1;
                background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                border: 2px solid #4a5568;
                border-radius: 15px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #ffffff;
                text-align: center;
            }
            
            .deal-btn:hover {
                border-color: #48bb78;
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(72, 187, 120, 0.3);
            }
            
            .deal-icon {
                font-size: 32px;
                margin-bottom: 10px;
            }
            .deal-card-content { display:flex; flex-direction:column; gap:14px; }
            .deal-card-details { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; margin-bottom:6px; }
            .deal-card-actions { display:grid; grid-template-columns:1fr; gap:12px; margin-top:8px; }
            .btn-warning { background: linear-gradient(135deg, #ffd166 0%, #fcbf49 100%); color:#1f2937; }
            
            .deal-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .deal-count {
                font-size: 14px;
                color: #a0a0a0;
            }
            
            .cancel-btn {
                width: 100%;
                background: #e53e3e;
                border: none;
                border-radius: 10px;
                padding: 15px;
                color: #ffffff;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            
            .cancel-btn:hover {
                background: #c53030;
            }
            .action-btn, .deal-btn, .cancel-btn, .player-btn, .btn { width:100%; padding:14px 18px; border-radius:14px; border:none; font-weight:700; letter-spacing:.2px; cursor:pointer; transition:all .2s ease-in-out; outline:none; }
            .btn-primary { background: linear-gradient(135deg, #16f79e 0%, #0ecf82 100%); color:#0b1729; }
            .btn-secondary { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color:#e5e7eb; }
            .btn-danger { background: linear-gradient(135deg, #ff6b6b 0%, #f14646 100%); color:#fff; }
            .btn[disabled] { opacity:.55; cursor:not-allowed; }
            @media (max-width: 480px) { .deals-modal-content { padding:18px; } .action-btn, .deal-btn, .cancel-btn, .player-btn, .btn { padding:12px 14px; } }
        `;
        
        document.head.appendChild(styles);
    }
    
    // Взятие карты из колоды
    drawCard(deckType, playerId) {
        if (this.decks[deckType].length === 0) {
            this.reshuffleDeck(deckType);
        }
        
        const card = this.decks[deckType].shift();
        this.currentDeal = card;
        this.isDealActive = true;
        
        console.log(`🎴 DealsModule: Игрок ${playerId} взял карту ${card.name} из ${deckType}`);
        
        // Показываем карту игроку
        this.showDealCard(card, playerId);
    }
    
    // Показать карту сделки всем игрокам
    showDealCard(card, playerId) {
        const myId = String(this.getCurrentPlayerId());
        const isOwner = myId === String(playerId);
        const modal = this.createDealCardModal(card, { isOwner: isOwner && !this.viewOnlyMode, originalOwnerId: playerId });
        document.body.appendChild(modal);
        
        // Обработчики действий
        modal.querySelector('.buy-btn').addEventListener('click', () => {
            // При покупке используем ID текущего игрока, а не оригинального владельца
            const currentPlayerId = this.getCurrentPlayerId();
            this.buyCard(card, currentPlayerId);
            this.closeModal(modal);
        });
        
        modal.querySelector('.pass-btn').addEventListener('click', () => {
            const deckType = card.type === 'bigDeal' ? 'bigDeal' : (card.type === 'smallDeal' ? 'smallDeal' : 'market');
            this.passCard(card, deckType);
            this.closeModal(modal);
        });
        
        modal.querySelector('.transfer-btn').addEventListener('click', () => {
            this.showTransferOptions(card, playerId);
        });

        // Кредит — открываем модуль банка
        const creditBtn = modal.querySelector('.credit-btn');
        if (creditBtn) {
            creditBtn.addEventListener('click', () => {
                try {
                    // Закрываем предыдущее окно банка, если оно открыто
                    if (window.bankWindow && !window.bankWindow.closed) {
                        window.bankWindow.close();
                    }
                    
                    const v = Date.now();
                    const features = 'width=720,height=840,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no';
                    // Открываем банковский модуль v4
                    if (typeof window.openBankV4 === 'function') {
                        window.openBankV4();
                    } else {
                        console.error('BankModuleV4 не доступен! Убедитесь, что модуль загружен.');
                    }
                    
                    // Фокусируем новое окно
                    if (window.bankWindow) {
                        window.bankWindow.focus();
                    }
                } catch (_) {}
            });
        }

        // Применяем режим "не активные кнопки" для всех, если включен
        if (this.viewOnlyMode && !isOwner) {
            this.applyDisabledState(modal, true);
        }
    }
    
    // Создание модального окна карты сделки
    createDealCardModal(card, { isOwner = true, originalOwnerId = null } = {}) {
        const modal = document.createElement('div');
        modal.className = 'deals-modal';
        modal.innerHTML = `
            <div class="deals-modal-content deal-card-modal">
                <div class="deals-modal-header">
                    <h3>${card.name}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="deal-card-content">
                    <div class="deal-card-icon">${card.icon}</div>
                    <div class="deal-card-description">${card.description}</div>
                    <div class="deal-card-details">
                        <div class="detail-row">
                            <span>Стоимость:</span>
                            <span class="cost">$${card.cost.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Доход:</span>
                            <span class="income">$${card.income.toLocaleString()}/мес</span>
                        </div>
                        <div class="detail-row">
                            <span>Первый взнос:</span>
                            <span class="down-payment">$${card.downPayment.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Ежемесячный платеж:</span>
                            <span class="monthly-payment">$${card.monthlyPayment.toLocaleString()}</span>
                        </div>
                        ${card.category === 'stocks' ? `
                        <div class="detail-row stock-quantity">
                            <label for="stock-quantity">Количество акций:</label>
                            <input type="number" id="stock-quantity" min="1" max="100000" value="1" class="stock-quantity-input">
                            <div class="quantity-info">
                                <span class="total-cost">Итого: $<span class="total-amount">${card.cost.toLocaleString()}</span></span>
                                <span class="monthly-income">Доход: $<span class="monthly-amount">${card.income.toLocaleString()}</span>/мес</span>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="deal-card-actions">
                        <button class="btn btn-primary buy-btn" ${isOwner ? '' : 'disabled'} title="${isOwner ? '' : 'Действие недоступно: ход другого игрока'}">Купить</button>
                        <button class="btn btn-secondary transfer-btn" ${isOwner ? '' : 'disabled'} title="${isOwner ? '' : 'Действие недоступно: ход другого игрока'}">Передать</button>
                        <button class="btn btn-warning credit-btn">Взять кредит</button>
                        <button class="btn btn-danger pass-btn">Отмена</button>
                    </div>
                </div>
            </div>
        `;
        
        // Обработчик кнопки закрытия
        modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Обработчик клика по overlay для закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        // Обработчик изменения количества акций
        if (card.category === 'stocks') {
            const quantityInput = modal.querySelector('#stock-quantity');
            const totalAmountSpan = modal.querySelector('.total-amount');
            const monthlyAmountSpan = modal.querySelector('.monthly-amount');
            
            if (quantityInput && totalAmountSpan && monthlyAmountSpan) {
                quantityInput.addEventListener('input', (e) => {
                    const quantity = Math.max(1, Math.min(100000, parseInt(e.target.value) || 1));
                    e.target.value = quantity;
                    
                    const totalCost = card.cost * quantity;
                    const totalIncome = card.income * quantity;
                    
                    totalAmountSpan.textContent = totalCost.toLocaleString();
                    monthlyAmountSpan.textContent = totalIncome.toLocaleString();
                });
            }
        }
        
        return modal;
    }

    // Принудительно отключить/включить действия в модалке сделки
    applyDisabledState(modal, disabled) {
        try {
            const buy = modal.querySelector('.buy-btn');
            const transfer = modal.querySelector('.transfer-btn');
            if (buy) { buy.disabled = !!disabled; if (disabled) buy.title = 'Действие недоступно'; }
            if (transfer) { transfer.disabled = !!disabled; if (disabled) transfer.title = 'Действие недоступно'; }
        } catch (_) {}
    }

    // Публичное API: включить режим "не активные кнопки" для всех
    setViewOnlyMode(flag) {
        this.viewOnlyMode = !!flag;
    }
    
    // Покупка карты
    async buyCard(card, playerId) {
        try {
            const roomId = window.gameState?.roomId;
            const gameState = window.gameState?.state;
            
            if (roomId && gameState) {
                // Получаем данные игрока
                const player = gameState.players?.find(p => p.userId === playerId);
                if (!player) {
                    console.error('🎴 DealsModule: Игрок не найден');
                    return;
                }

                // Проверяем баланс игрока
                const currentBalance = player.cash || 0;
                
                // Для акций получаем количество из модального окна
                let quantity = 1;
                let cardCost = card.cost || 0;
                let cardIncome = card.income || 0;
                
                if (card.category === 'stocks') {
                    const quantityInput = document.querySelector('#stock-quantity');
                    if (quantityInput) {
                        quantity = Math.max(1, Math.min(100000, parseInt(quantityInput.value) || 1));
                        cardCost = card.cost * quantity;
                        cardIncome = card.income * quantity;
                    }
                }
                
                if (currentBalance < cardCost) {
                    alert(`Недостаточно средств! Нужно: $${cardCost}, доступно: $${currentBalance}`);
                    return;
                }

                // Отправляем запрос на сервер для покупки
                const requestData = { 
                    action: 'buy', 
                    deal: { 
                        id: card.id, 
                        name: card.name, 
                        amount: cardCost, 
                        income: cardIncome,
                        type: card.type || 'smallDeal',
                        quantity: quantity,
                        category: card.category
                    } 
                };
                
                console.log(`🔍 Отправка запроса на покупку:`, {
                    url: `/api/rooms/${roomId}/deals/resolve`,
                    data: requestData,
                    playerBalance: currentBalance,
                    cardCost: cardCost
                });
                
                const response = await fetch(`/api/rooms/${roomId}/deals/resolve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });

                if (response.ok) {
                    const responseData = await response.json();
                    
                    // Обновляем данные игрока из ответа сервера
                    if (responseData.player) {
                        Object.assign(player, responseData.player);
                    }
                    
                    // Обновляем баланс игрока (используем данные с сервера)
                    if (responseData.player && responseData.player.cash !== undefined) {
                        player.cash = responseData.player.cash;
                    } else {
                        // Fallback: списываем деньги локально
                        player.cash = Math.max(0, currentBalance - cardCost);
                    }
                    
                    // Добавляем карту в активы игрока
                    if (!player.assets) {
                        player.assets = [];
                    }
                    player.assets.push({
                        id: card.id,
                        name: card.name,
                        purchasePrice: cardCost,
                        monthlyIncome: card.income || 0,
                        type: card.type || 'smallDeal',
                        icon: card.icon || '📈'
                    });

                    console.log(`🎴 DealsModule: Игрок ${playerId} купил карту ${card.name} за $${cardCost}`);
                    
                    // Обновляем состояние игры
                    if (window.gameState && window.gameState.refresh) {
                        window.gameState.refresh();
                    }
                    
                    // Дополнительная синхронизация через небольшую задержку
                    setTimeout(() => {
                        if (window.gameState && window.gameState.refresh) {
                            window.gameState.refresh();
                        }
                    }, 100);
                    
                    // Отправляем уведомление о покупке актива
                    if (window.notificationService) {
                        await window.notificationService.notifyBalanceChange(
                            player.name || player.username,
                            -cardCost,
                            'покупка актива'
                        );
                    }
                } else {
                    console.error('🎴 DealsModule: Ошибка покупки карты на сервере');
                    console.error('🔍 Статус ответа:', response.status, response.statusText);
                    
                    try {
                        const errorData = await response.json();
                        console.error('🔍 Данные ошибки:', errorData);
                    } catch (e) {
                        console.error('🔍 Не удалось получить данные ошибки');
                    }
                    return;
                }
            }
        } catch (error) {
            console.error('🎴 DealsModule: Ошибка покупки карты:', error);
            return;
        }

        // Локально добавляем карту в активы
        if (!this.playerAssets.has(playerId)) {
            this.playerAssets.set(playerId, []);
        }
        this.playerAssets.get(playerId).push(card);

        // Отправляем карточку в отбой после покупки
        const deckType = card.type === 'bigDeal' ? 'bigDeal' : (card.type === 'smallDeal' ? 'smallDeal' : 'market');
        this.passCard(card, deckType);

        // Сбрасываем текущую сделку
        this.currentDeal = null;
        this.isDealActive = false;

        this.notifyCardBought(card, playerId);
    }
    
    // Отказ от карты (карта идет в отбой)
    passCard(card, deckType) {
        this.discardPiles[deckType].push(card);
        
        // Сбрасываем текущую сделку
        this.currentDeal = null;
        this.isDealActive = false;
        
        console.log(`🎴 DealsModule: Карта ${card.name} отправлена в отбой ${deckType}`);
    }
    
    // Перемешивание колоды из отбоя
    reshuffleDeck(deckType) {
        if (this.discardPiles[deckType].length === 0) {
            console.warn(`🎴 DealsModule: Нет карт в отбое для ${deckType}`);
            return;
        }
        
        // Перемещаем карты из отбоя в основную колоду
        this.decks[deckType] = [...this.discardPiles[deckType]];
        this.discardPiles[deckType] = [];
        
        // Перемешиваем
        this.shuffleDeck(deckType);
        
        console.log(`🎴 DealsModule: Колода ${deckType} перемешана из отбоя`);
    }
    
    // Показать каталог активов
    showAssetsCatalog() {
        const modal = this.createAssetsCatalogModal();
        document.body.appendChild(modal);
    }
    
    // Перемещение актива в каталог
    moveAssetToCatalog(asset, playerId) {
        // Удаляем актив у игрока
        const playerAssets = this.playerAssets.get(playerId) || [];
        const assetIndex = playerAssets.findIndex(a => a.id === asset.id);
        if (assetIndex !== -1) {
            playerAssets.splice(assetIndex, 1);
        }
        
        // Добавляем актив в глобальный каталог
        if (!this.catalogAssets) {
            this.catalogAssets = [];
        }
        this.catalogAssets.push({
            ...asset,
            originalOwnerId: playerId,
            addedToCatalogAt: Date.now()
        });
        
        console.log(`🎴 Актив ${asset.name} перемещен в каталог игроком ${playerId}`);
        
        // Обновляем состояние игры
        if (window.gameState) {
            window.gameState.refresh();
        }
    }
    
    // Создание модального окна каталога активов
    createAssetsCatalogModal() {
        const modal = document.createElement('div');
        modal.className = 'deals-modal';
        
        // Собираем все активы всех игроков
        let allAssets = [];
        this.playerAssets.forEach((assets, playerId) => {
            assets.forEach(asset => {
                allAssets.push({...asset, ownerId: playerId, type: 'player'});
            });
        });
        
        // Добавляем активы из каталога
        if (this.catalogAssets) {
            this.catalogAssets.forEach(asset => {
                allAssets.push({...asset, ownerId: 'catalog', type: 'catalog'});
            });
        }
        
        modal.innerHTML = `
            <div class="deals-modal-content assets-catalog-modal">
                <div class="deals-modal-header">
                    <h3>Каталог активов</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="assets-catalog-content">
                    <div class="assets-stats">
                        <div class="stat-item">
                            <span>Всего активов:</span>
                            <span>${allAssets.length}</span>
                        </div>
                        <div class="stat-item">
                            <span>Общая стоимость:</span>
                            <span>$${allAssets.reduce((sum, asset) => sum + asset.cost, 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="assets-list">
                        ${allAssets.map(asset => `
                            <div class="asset-item">
                                <div class="asset-icon">${asset.icon}</div>
                                <div class="asset-info">
                                    <div class="asset-name">${asset.name}</div>
                                    <div class="asset-owner">Владелец: ${asset.ownerId}</div>
                                    <div class="asset-details">
                                        <span>Стоимость: $${asset.cost.toLocaleString()}</span>
                                        <span>Доход: $${asset.income.toLocaleString()}/мес</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Обработчик закрытия
        modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Обработчик клика по overlay для закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        return modal;
    }
    
    // Показать опции передачи карты
    showTransferOptions(card, fromPlayerId) {
        // Получаем список других игроков из актуального состояния игры
        let otherPlayers = [];
        try {
            const players = window.gameState?.state?.players || [];
            otherPlayers = players
                .map(p => ({ id: String(p.userId), name: p.name || p.userId }))
                .filter(p => p.id !== String(fromPlayerId));
        } catch (_) {
            otherPlayers = [];
        }
        
        if (!otherPlayers.length) {
            alert('Нет других игроков для передачи карты');
            return;
        }
        
        const modal = this.createTransferModal(card, fromPlayerId, otherPlayers);
        document.body.appendChild(modal);
    }
    
    // Создание модального окна передачи
    createTransferModal(card, fromPlayerId, otherPlayers) {
        const modal = document.createElement('div');
        modal.className = 'deals-modal';
        modal.innerHTML = `
            <div class="deals-modal-content transfer-modal">
                <div class="deals-modal-header">
                    <h3>Передать карту</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="transfer-content">
                    <div class="card-preview">
                        <div class="card-icon">${card.icon}</div>
                        <div class="card-name">${card.name}</div>
                    </div>
                    <div class="players-list">
                        <h4>Выберите игрока:</h4>
                        ${otherPlayers.map(p => `
                            <button class="btn btn-secondary player-btn" data-player-id="${p.id}">
                                ${p.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Обработчики передачи
        modal.querySelectorAll('.player-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const toPlayerId = btn.dataset.playerId;
                this.transferCard(card, fromPlayerId, toPlayerId);
                this.closeModal(modal);
            });
        });
        
        modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Обработчик клика по overlay для закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        return modal;
    }
    
    // Передача карты другому игроку
    async transferCard(card, fromPlayerId, toPlayerId) {
        try {
            const roomId = window.gameState?.roomId;
            const currentUserId = this.getCurrentPlayerId();
            
            // Отправляем запрос на сервер
            console.log(`🔍 Передача актива:`, {
                cardId: card.id,
                cardName: card.name,
                fromPlayerId,
                toPlayerId
            });
            
            const response = await fetch(`/api/rooms/${roomId}/assets/transfer`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-ID': currentUserId
                },
                body: JSON.stringify({ 
                    assetId: card.id, 
                    assetName: card.name, // Добавляем имя актива для поиска
                    targetUserId: toPlayerId 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log(`🎴 DealsModule: Карта ${card.name} передана от ${fromPlayerId} к ${toPlayerId}`);
                
                // Обновляем локальное состояние после успешной передачи на сервере
                this.playerAssets.set(fromPlayerId, (this.playerAssets.get(fromPlayerId) || []).filter(asset => asset.id !== card.id));
                
                if (!this.playerAssets.has(toPlayerId)) {
                    this.playerAssets.set(toPlayerId, []);
                }
                this.playerAssets.get(toPlayerId).push(card);
                
                // Обновляем модальное окно для всех игроков с новыми правами
                this.updateModalForTransfer(card, toPlayerId);
                
                // Уведомляем о передаче
                this.notifyCardTransferred(card, fromPlayerId, toPlayerId);
                
                // Обновляем состояние игры
                if (window.gameState) {
                    window.gameState.refresh();
                }
            } else {
                console.error('Ошибка передачи актива:', result.message);
                alert(`Ошибка передачи актива: ${result.message}`);
            }
        } catch (error) {
            console.error('Ошибка при передаче актива:', error);
            alert('Ошибка при передаче актива');
        }
    }
    
    // Обновление модального окна после передачи карточки
    updateModalForTransfer(card, newOwnerId) {
        // Находим все открытые модальные окна с этой карточкой
        const modals = document.querySelectorAll('.deals-modal');
        modals.forEach(modal => {
            const modalTitle = modal.querySelector('h3');
            if (modalTitle && modalTitle.textContent === card.name) {
                // Обновляем права доступа к кнопкам
                const myId = String(this.getCurrentPlayerId());
                const isNewOwner = myId === String(newOwnerId);
                
                const buyBtn = modal.querySelector('.buy-btn');
                const transferBtn = modal.querySelector('.transfer-btn');
                
                if (isNewOwner) {
                    // Новый владелец может покупать и передавать
                    buyBtn.disabled = false;
                    buyBtn.title = '';
                    transferBtn.disabled = false;
                    transferBtn.title = '';
                } else {
                    // Остальные игроки не могут действовать
                    buyBtn.disabled = true;
                    buyBtn.title = 'Действие недоступно: карточка передана другому игроку';
                    transferBtn.disabled = true;
                    transferBtn.title = 'Действие недоступно: карточка передана другому игроку';
                }
            }
        });
    }
    
    // Уведомления
    notifyCardBought(card, playerId) {
        const event = new CustomEvent('cardBought', {
            detail: { card, playerId }
        });
        document.dispatchEvent(event);
    }
    
    notifyCardTransferred(card, fromPlayerId, toPlayerId) {
        const event = new CustomEvent('cardTransferred', {
            detail: { card, fromPlayerId, toPlayerId }
        });
        document.dispatchEvent(event);

        // Отправляем push-уведомление о продаже актива
        if (window.notificationService && card.price) {
            try {
                const gameState = window.gameState?.state;
                if (gameState) {
                    const fromPlayer = gameState.players?.find(p => p.userId === fromPlayerId);
                    const toPlayer = gameState.players?.find(p => p.userId === toPlayerId);
                    
                    if (fromPlayer && toPlayer) {
                        window.notificationService.notifyBalanceChange(
                            fromPlayer.name || fromPlayer.username,
                            card.price,
                            'продажа актива'
                        );
                    }
                }
            } catch (error) {
                console.error('🔔 Ошибка отправки уведомления о продаже актива:', error);
            }
        }
    }
    
    // Закрытие модального окна
    closeModal(modal) {
        if (modal && modal.parentNode) {
            // Добавляем анимацию закрытия
            modal.classList.add('modal-closing');
            
            // Удаляем модальное окно после анимации
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
    
    // Получение статистики колод
    getDeckStats() {
        return {
            bigDeal: {
                deck: this.decks.bigDeal.length,
                discard: this.discardPiles.bigDeal.length
            },
            smallDeal: {
                deck: this.decks.smallDeal.length,
                discard: this.discardPiles.smallDeal.length
            },
            market: {
                deck: this.decks.market.length,
                discard: this.discardPiles.market.length
            },
            expenses: {
                deck: this.decks.expenses.length,
                discard: this.discardPiles.expenses.length
            }
        };
    }
    
    // Получение активов игрока
    getPlayerAssets(playerId) {
        return this.playerAssets.get(playerId) || [];
    }
    
    // Получение ID текущего игрока
    getCurrentPlayerId() {
        // Пытаемся получить из различных источников (в приоритете GameState)
        try {
            if (window.gameState && typeof window.gameState.getUserId === 'function') {
                const id = window.gameState.getUserId();
                if (id) return String(id);
            }
        } catch (_) {}
        if (window.state && window.state.getCurrentPlayer) {
            const player = window.state.getCurrentPlayer();
            return player?.userId || player?.id;
        }
        
        if (window.playersManager && window.playersManager.getCurrentPlayer) {
            const player = window.playersManager.getCurrentPlayer();
            return player?.userId || player?.id;
        }
        
        // Fallback - берем из localStorage или cookie
        const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        return currentRoom.userId || localStorage.getItem('userId') || 'player1';
    }
    
    // Обновление счетчиков карт в UI
    updateDeckCounters() {
        setTimeout(() => {
            // Обновляем счетчики в полосе сделок
            const bigDealCounters = document.querySelectorAll('.special-card.big-deal .special-metric');
            const smallDealCounters = document.querySelectorAll('.special-card.small-deal .special-metric');
            const marketCounters = document.querySelectorAll('.special-card.market .special-metric');
            const expenseCounters = document.querySelectorAll('.special-card.expense .special-metric');
            
            // Обновляем счетчики основных колод
            bigDealCounters.forEach(counter => {
                if (counter.textContent.includes('карт')) {
                    counter.textContent = `${this.decks.bigDeal.length} карт`;
                }
            });
            
            smallDealCounters.forEach(counter => {
                if (counter.textContent.includes('карт')) {
                    counter.textContent = `${this.decks.smallDeal.length} карт`;
                }
            });
            
            marketCounters.forEach(counter => {
                if (counter.textContent.includes('карт')) {
                    counter.textContent = `${this.decks.market.length} карт`;
                }
            });
            
            expenseCounters.forEach(counter => {
                if (counter.textContent.includes('карт')) {
                    counter.textContent = `${this.decks.expenses.length} карт`;
                }
            });
            
            // Обновляем счетчики отбоя
            const bigDealDiscard = document.getElementById('bigDealDiscardCount');
            const smallDealDiscard = document.getElementById('smallDealDiscardCount');
            const marketDiscard = document.getElementById('marketDiscardCount');
            const expenseDiscard = document.getElementById('expenseDiscardCount');
            
            if (bigDealDiscard) bigDealDiscard.textContent = this.discardPiles.bigDeal.length;
            if (smallDealDiscard) smallDealDiscard.textContent = this.discardPiles.smallDeal.length;
            if (marketDiscard) marketDiscard.textContent = this.discardPiles.market.length;
            if (expenseDiscard) expenseDiscard.textContent = this.discardPiles.expenses.length;
            
            console.log('🎴 DealsModule: Обновлены счетчики карт:', {
                bigDeal: this.decks.bigDeal.length,
                smallDeal: this.decks.smallDeal.length,
                market: this.decks.market.length,
                expenses: this.decks.expenses.length,
                discard: {
                    bigDeal: this.discardPiles.bigDeal.length,
                    smallDeal: this.discardPiles.smallDeal.length,
                    market: this.discardPiles.market.length,
                    expenses: this.discardPiles.expenses.length
                }
            });
        }, 100);
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.DealsModule = DealsModule;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎴 DealsModule: DOM loaded, initializing...');
    if (!window.dealsModule) {
        console.log('🎴 DealsModule: Creating new instance...');
        window.dealsModule = new DealsModule();
    } else {
        console.log('🎴 DealsModule: Already exists, skipping initialization');
    }
});
