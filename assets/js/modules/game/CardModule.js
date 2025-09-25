/**
 * Модуль карточек для игры "Энергия денег"
 * Управляет колодами карт, сделками и активами игроков
 */

export class CardModule {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.decks = {
            bigDeals: [],
            smallDeals: [],
            market: [],
            expenses: []
        };
        this.discardPiles = {
            bigDeals: [],
            smallDeals: [],
            market: [],
            expenses: []
        };
        this.playerAssets = new Map(); // playerId -> [cards]
        this.currentCard = null;
        this.isDestroyed = false;
        
        this.init();
    }

    /**
     * Инициализация модуля карточек
     */
    async init() {
        console.log('🃏 CardModule инициализирован');
        
        // Инициализируем колоды карт
        await this.initializeDecks();
        
        // Подписка на события с защитой, если gameCore/eventBus отсутствуют
        const hasEventBus = !!(this.gameCore && this.gameCore.eventBus && typeof this.gameCore.eventBus.on === 'function');
        if (hasEventBus) {
            this.gameCore.eventBus.on('playerTurnStarted', this.onPlayerTurnStarted.bind(this));
            this.gameCore.eventBus.on('playerTurnEnded', this.onPlayerTurnEnded.bind(this));
            this.gameCore.eventBus.on('cellEvent', this.onCellEvent.bind(this));
            console.log('🃏 CardModule: подписан на события через gameCore.eventBus');
        } else {
            // Fallback на DOM-события, чтобы модуль работал автономно
            document.addEventListener('cellEvent', (e) => this.onCellEvent(e.detail || e));
            document.addEventListener('playerTurnStarted', (e) => this.onPlayerTurnStarted(e.detail || e));
            document.addEventListener('playerTurnEnded', (e) => this.onPlayerTurnEnded(e.detail || e));
            console.warn('🃏 CardModule: eventBus недоступен, используем DOM-события');
        }
    }

    /**
     * Инициализация колод карт
     */
    async initializeDecks() {
        // Большие сделки
        this.decks.bigDeals = this.createBigDealsDeck();
        
        // Малые сделки
        this.decks.smallDeals = this.createSmallDealsDeck();
        
        // Рынок
        this.decks.market = this.createMarketDeck();
        
        // Расходы
        this.decks.expenses = this.createExpensesDeck();
        
        // Перемешиваем все колоды
        Object.keys(this.decks).forEach(deckType => {
            this.shuffleDeck(deckType);
        });
        
        console.log('🃏 Колоды карт инициализированы:', {
            bigDeals: this.decks.bigDeals.length,
            smallDeals: this.decks.smallDeals.length,
            market: this.decks.market.length,
            expenses: this.decks.expenses.length
        });
    }

    /**
     * Создание колоды больших сделок
     */
    createBigDealsDeck() {
        return [
            {
                id: 'big_1',
                type: 'big_deal',
                name: 'Офисное здание',
                description: 'Покупка офисного здания в центре города',
                cost: 50000,
                downPayment: 10000,
                cashFlow: 2000,
                category: 'real_estate',
                icon: '🏢',
                color: '#2196F3'
            },
            {
                id: 'big_2',
                type: 'big_deal',
                name: 'Аптека',
                description: 'Покупка аптеки с готовым бизнесом',
                cost: 80000,
                downPayment: 15000,
                cashFlow: 3000,
                category: 'business',
                icon: '💊',
                color: '#4CAF50'
            },
            {
                id: 'big_3',
                type: 'big_deal',
                name: 'Автомойка',
                description: 'Покупка автомойки с оборудованием',
                cost: 120000,
                downPayment: 20000,
                cashFlow: 4000,
                category: 'business',
                icon: '🚗',
                color: '#FF9800'
            },
            {
                id: 'big_4',
                type: 'big_deal',
                name: 'Склад',
                description: 'Покупка складского помещения',
                cost: 200000,
                downPayment: 30000,
                cashFlow: 6000,
                category: 'real_estate',
                icon: '🏭',
                color: '#9C27B0'
            },
            {
                id: 'big_5',
                type: 'big_deal',
                name: 'Ресторан',
                description: 'Покупка ресторана в центре',
                cost: 150000,
                downPayment: 25000,
                cashFlow: 5000,
                category: 'business',
                icon: '🍽️',
                color: '#F44336'
            }
        ];
    }

    /**
     * Создание колоды малых сделок
     */
    createSmallDealsDeck() {
        return [
            {
                id: 'small_1',
                type: 'small_deal',
                name: 'Акции Apple',
                description: 'Покупка акций Apple',
                cost: 1000,
                downPayment: 1000,
                cashFlow: 50,
                category: 'stocks',
                icon: '📈',
                color: '#4CAF50'
            },
            {
                id: 'small_2',
                type: 'small_deal',
                name: 'Облигации',
                description: 'Покупка государственных облигаций',
                cost: 5000,
                downPayment: 5000,
                cashFlow: 200,
                category: 'bonds',
                icon: '📊',
                color: '#2196F3'
            },
            {
                id: 'small_3',
                type: 'small_deal',
                name: 'Золото',
                description: 'Покупка золотых слитков',
                cost: 3000,
                downPayment: 3000,
                cashFlow: 100,
                category: 'precious_metals',
                icon: '🥇',
                color: '#FFD700'
            },
            {
                id: 'small_4',
                type: 'small_deal',
                name: 'Криптовалюта',
                description: 'Покупка Bitcoin',
                cost: 2000,
                downPayment: 2000,
                cashFlow: 80,
                category: 'crypto',
                icon: '₿',
                color: '#FF9800'
            },
            {
                id: 'small_5',
                type: 'small_deal',
                name: 'Фонды',
                description: 'Покупка паевых фондов',
                cost: 4000,
                downPayment: 4000,
                cashFlow: 150,
                category: 'funds',
                icon: '📋',
                color: '#9C27B0'
            }
        ];
    }

    /**
     * Создание колоды рынка
     */
    createMarketDeck() {
        return [
            {
                id: 'market_1',
                type: 'market',
                name: 'Продажа акций',
                description: 'Продажа акций по выгодной цене',
                sellPrice: 1200,
                originalCost: 1000,
                profit: 200,
                category: 'stocks',
                icon: '💰',
                color: '#4CAF50'
            },
            {
                id: 'market_2',
                type: 'market',
                name: 'Продажа золота',
                description: 'Продажа золота на пике цены',
                sellPrice: 3500,
                originalCost: 3000,
                profit: 500,
                category: 'precious_metals',
                icon: '🥇',
                color: '#FFD700'
            },
            {
                id: 'market_3',
                type: 'market',
                name: 'Продажа криптовалюты',
                description: 'Продажа Bitcoin по высокой цене',
                sellPrice: 2500,
                originalCost: 2000,
                profit: 500,
                category: 'crypto',
                icon: '₿',
                color: '#FF9800'
            }
        ];
    }

    /**
     * Создание колоды расходов
     */
    createExpensesDeck() {
        return [
            {
                id: 'expense_1',
                type: 'expense',
                name: 'Ремонт дома',
                description: 'Необходимый ремонт дома',
                cost: 5000,
                category: 'home',
                icon: '🔨',
                color: '#F44336'
            },
            {
                id: 'expense_2',
                type: 'expense',
                name: 'Лечение зубов',
                description: 'Стоматологическое лечение',
                cost: 3000,
                category: 'health',
                icon: '🦷',
                color: '#E91E63'
            },
            {
                id: 'expense_3',
                type: 'expense',
                name: 'Новая машина',
                description: 'Покупка нового автомобиля',
                cost: 25000,
                category: 'transport',
                icon: '🚗',
                color: '#2196F3'
            },
            {
                id: 'expense_4',
                type: 'expense',
                name: 'Образование',
                description: 'Обучение детей в университете',
                cost: 15000,
                category: 'education',
                icon: '🎓',
                color: '#9C27B0'
            }
        ];
    }

    /**
     * Перемешивание колоды
     */
    shuffleDeck(deckType) {
        const deck = this.decks[deckType];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    /**
     * Взятие карты из колоды
     */
    drawCard(deckType) {
        if (this.isDestroyed) {
            console.warn('CardModule уничтожен, карта не может быть взята');
            return null;
        }

        const deck = this.decks[deckType];
        
        if (deck.length === 0) {
            // Если колода пуста, перемешиваем отбой
            this.reshuffleDeck(deckType);
        }
        
        if (deck.length === 0) {
            console.warn(`Колода ${deckType} пуста даже после перемешивания`);
            return null;
        }
        
        const card = deck.pop();
        console.log(`🃏 Взята карта из ${deckType}:`, card.name);
        
        return card;
    }

    /**
     * Перемешивание отбоя обратно в колоду
     */
    reshuffleDeck(deckType) {
        const discardPile = this.discardPiles[deckType];
        if (discardPile.length === 0) {
            console.warn(`Отбой ${deckType} пуст, нечего перемешивать`);
            return;
        }
        
        // Перемещаем все карты из отбоя в колоду
        this.decks[deckType] = [...discardPile];
        this.discardPiles[deckType] = [];
        
        // Перемешиваем
        this.shuffleDeck(deckType);
        
        console.log(`🃏 Отбой ${deckType} перемешан обратно в колоду (${this.decks[deckType].length} карт)`);
    }

    /**
     * Отправка карты в отбой
     */
    discardCard(card, deckType) {
        if (card) {
            this.discardPiles[deckType].push(card);
            console.log(`🃏 Карта ${card.name} отправлена в отбой ${deckType}`);
        }
    }

    /**
     * Покупка карты игроком
     */
    buyCard(playerId, card) {
        if (!card) {
            return { success: false, message: 'Карта не найдена' };
        }

        const playerManager = this.gameCore.getModule('playerManager');
        const player = playerManager.getPlayer(playerId);
        
        if (!player) {
            return { success: false, message: 'Игрок не найден' };
        }

        // Проверяем достаточность средств
        if (player.cash < card.downPayment) {
            return { 
                success: false, 
                message: `Недостаточно средств. Нужно: $${card.downPayment}, есть: $${player.cash}` 
            };
        }

        // Списываем деньги
        playerManager.updateBalance(playerId, -card.downPayment, `Покупка: ${card.name}`);
        
        // Добавляем карту в активы игрока
        if (!this.playerAssets.has(playerId)) {
            this.playerAssets.set(playerId, []);
        }
        
        this.playerAssets.get(playerId).push({
            ...card,
            purchaseDate: Date.now(),
            owner: playerId
        });

        console.log(`🃏 Игрок ${player.name} купил карту: ${card.name} за $${card.downPayment}`);
        
        return {
            success: true,
            message: `Карта ${card.name} куплена за $${card.downPayment}`,
            card: card,
            newBalance: player.cash
        };
    }

    /**
     * Передача карты другому игроку
     */
    transferCard(fromPlayerId, toPlayerId, cardId) {
        const fromAssets = this.playerAssets.get(fromPlayerId) || [];
        const cardIndex = fromAssets.findIndex(card => card.id === cardId);
        
        if (cardIndex === -1) {
            return { success: false, message: 'Карта не найдена у игрока' };
        }

        const card = fromAssets.splice(cardIndex, 1)[0];
        
        if (!this.playerAssets.has(toPlayerId)) {
            this.playerAssets.set(toPlayerId, []);
        }
        
        this.playerAssets.get(toPlayerId).push({
            ...card,
            owner: toPlayerId,
            transferDate: Date.now()
        });

        console.log(`🃏 Карта ${card.name} передана от игрока ${fromPlayerId} к игроку ${toPlayerId}`);
        
        return {
            success: true,
            message: `Карта ${card.name} передана`,
            card: card
        };
    }

    /**
     * Получение активов игрока
     */
    getPlayerAssets(playerId) {
        return this.playerAssets.get(playerId) || [];
    }

    /**
     * Получение текущей карты
     */
    getCurrentCard() {
        return this.currentCard;
    }

    /**
     * Установка текущей карты
     */
    setCurrentCard(card) {
        this.currentCard = card;
    }

    /**
     * Очистка текущей карты
     */
    clearCurrentCard() {
        this.currentCard = null;
    }

    /**
     * Получение статистики колод
     */
    getDeckStats() {
        return {
            bigDeals: {
                deck: this.decks.bigDeals.length,
                discard: this.discardPiles.bigDeals.length
            },
            smallDeals: {
                deck: this.decks.smallDeals.length,
                discard: this.discardPiles.smallDeals.length
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

    /**
     * Обработчики событий
     */
    onPlayerTurnStarted(data) {
        console.log(`🃏 Ход игрока ${data.playerId} начат, очищаем текущую карту`);
        this.clearCurrentCard();
    }

    onPlayerTurnEnded(data) {
        console.log(`🃏 Ход игрока ${data.playerId} завершен`);
        // Если есть текущая карта, отправляем её в отбой
        if (this.currentCard) {
            this.discardCard(this.currentCard, this.currentCard.type);
            this.clearCurrentCard();
        }
    }

    onCellEvent(data) {
        console.log('🎴 CardModule: Обработка события клетки:', data);
        
        if (data.cellType === 'green_opportunity' || data.cellType === 'deal') {
            // Активируем модуль сделок
            this.activateDealsModule(data.playerId);
        } else if (data.cellType === 'blue_market') {
            // Показываем карту рынка
            this.showMarketCard(data.playerId);
        } else if (data.cellType === 'pink_expense') {
            // Показываем карту расходов
            this.showExpenseCard(data.playerId);
        } else if (data.cellType === 'yellow_payday') {
            // Обрабатываем день зарплаты
            this.processPayday(data.playerId);
        } else if (data.cellType === 'orange_charity' || data.cellType === 'charity') {
            // Благотворительность: 10% от (зарплата + пасс. доход), 3 хода — выбор 1 или 2 кубика
            this.showCharityModal(data.playerId);
        } else if (data.cellType === 'purple_baby') {
            // Обрабатываем рождение ребенка
            this.processBaby(data.playerId);
        }
    }

    // UI: Благотворительность
    showCharityModal(playerId) {
        try {
            const modal = document.createElement('div');
            modal.className = 'charity-modal';

            // Получаем данные игрока из состояния
            const snapshot = window.gameState?.getSnapshot?.() || {};
            const meId = String(playerId || window.gameState?.getUserId?.() || '');
            const me = (snapshot.players || []).find(p => String(p.userId) === meId) || {};
            const salary = Number(me?.profession?.salary || 0);
            const passive = Number(me?.passiveIncome || 0);
            const income = salary + passive;
            const donation = Math.floor(income * 0.10);

            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <h3 style="margin-top:0;">Благотворительность</h3>
                        <p>Вы можете пожертвовать <strong>10%</strong> от вашего дохода и получить <strong>3 хода</strong>, в каждом из которых можно бросать <strong>1 или 2</strong> кубика на выбор.</p>
                        <div class="charity-stats">
                            <div><span>Зарплата:</span><span>$${salary.toLocaleString()}</span></div>
                            <div><span>Пассивный доход:</span><span>$${passive.toLocaleString()}</span></div>
                            <div class="sum"><span>Пожертвование (10%):</span><span>$${donation.toLocaleString()}</span></div>
                        </div>
                        <div class="charity-actions">
                            <button class="btn btn-primary pay-btn">Оплатить</button>
                            <button class="btn btn-secondary cancel-btn">Отказаться</button>
                        </div>
                    </div>
                </div>`;

            // Стили (локально для модалки)
            const style = document.createElement('style');
            style.textContent = `
                .charity-modal .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10002}
                .charity-modal .modal-content{background:#121a2b;color:#fff;border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,.5);padding:22px;max-width:480px;width:90%}
                .charity-stats{margin:14px 0 8px 0;display:grid;grid-template-columns:1fr auto;gap:8px 12px}
                .charity-stats .sum{font-weight:700}
                .charity-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
                .charity-modal .btn{padding:12px 16px;border:none;border-radius:12px;font-weight:700;cursor:pointer}
                .charity-modal .btn-primary{background:linear-gradient(135deg,#16f79e 0%,#0ecf82 100%);color:#0b1729}
                .charity-modal .btn-secondary{background:linear-gradient(135deg,#1f2937 0%,#111827 100%);color:#e5e7eb}
            `;

            document.head.appendChild(style);
            document.body.appendChild(modal);

            const close = () => { try { modal.remove(); style.remove(); } catch(_){} };
            modal.querySelector('.cancel-btn')?.addEventListener('click', close);
            modal.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === modal.querySelector('.modal-overlay')) close(); });

            // Оплата благотворительности
            modal.querySelector('.pay-btn')?.addEventListener('click', async () => {
                try {
                    const roomId = window.gameState?.roomId;
                    const userId = window.gameState?.getUserId?.();
                    const res = await fetch(`/api/rooms/${roomId}/charity`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                        body: JSON.stringify({})
                    });
                    const data = await res.json();
                    if (res.ok && data?.success) {
                        this.showNotification(`Пожертвование $${donation.toLocaleString()} принято. 3 хода с выбором 1/2 кубика.`, 'success');
                        try { await window.gameState?.refresh?.(); } catch(_){}
                        close();
                    } else {
                        this.showNotification(data?.message || 'Не удалось выполнить благотворительность', 'error');
                    }
                } catch (e) {
                    this.showNotification('Ошибка благотворительности', 'error');
                }
            });
        } catch (e) {
            console.warn('Charity UI error', e);
        }
    }
    
    // Активация модуля сделок
    activateDealsModule(playerId) {
        console.log('🎴 CardModule: Активация модуля сделок для игрока', playerId);
        
        // Проверяем, доступен ли DealsModule
        if (window.dealsModule) {
            // Используем наш DealsModule
            window.dealsModule.showDealChoice(playerId);
        } else {
            // Fallback на старую систему
            this.showDealTypeSelection(playerId);
        }
    }
    
    // Обработка дня зарплаты
    processPayday(playerId) {
        console.log('💰 CardModule: Обработка дня зарплаты для игрока', playerId);
        // Здесь можно добавить логику обработки зарплаты
    }
    
    // Обработка рождения ребенка
    processBaby(playerId) {
        console.log('👶 CardModule: Обработка рождения ребенка для игрока', playerId);
        // Здесь можно добавить логику обработки ребенка
    }

    /**
     * Показ выбора типа сделки
     */
    showDealTypeSelection(playerId) {
        // Создаем модальное окно выбора типа сделки
        const modal = document.createElement('div');
        modal.className = 'deal-type-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>Выберите тип сделки</h3>
                    <div class="deal-type-buttons">
                        <button class="deal-type-btn big-deal" onclick="window.cardModule.selectDealType('big_deal', '${playerId}')">
                            <div class="deal-icon">🏢</div>
                            <div class="deal-name">Большая сделка</div>
                            <div class="deal-description">Дорогие активы с высоким доходом</div>
                        </button>
                        <button class="deal-type-btn small-deal" onclick="window.cardModule.selectDealType('small_deal', '${playerId}')">
                            <div class="deal-icon">📈</div>
                            <div class="deal-name">Малая сделка</div>
                            <div class="deal-description">Недорогие активы для начинающих</div>
                        </button>
                    </div>
                    <button class="modal-close" onclick="this.closest('.deal-type-modal').remove()">
                        Отмена
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили
        const style = document.createElement('style');
        style.textContent = `
            .deal-type-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            
            .modal-overlay {
                position: relative;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                max-width: 500px;
                width: 90%;
            }
            
            .deal-type-buttons {
                display: flex;
                gap: 20px;
                margin: 20px 0;
            }
            
            .deal-type-btn {
                flex: 1;
                padding: 20px;
                border: 2px solid #ddd;
                border-radius: 10px;
                background: white;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .deal-type-btn:hover {
                border-color: #2196F3;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .deal-icon {
                font-size: 2rem;
                margin-bottom: 10px;
            }
            
            .deal-name {
                font-size: 1.2rem;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .deal-description {
                font-size: 0.9rem;
                color: #666;
            }
            
            .modal-close {
                background: #f44336;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Автоматически закрываем через 30 секунд
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 30000);
    }

    /**
     * Выбор типа сделки
     */
    selectDealType(dealType, playerId) {
        const card = this.drawCard(dealType === 'big_deal' ? 'bigDeals' : 'smallDeals');
        
        if (card) {
            this.setCurrentCard(card);
            this.showCardDetails(card, playerId);
        }
        
        // Закрываем модальное окно
        const modal = document.querySelector('.deal-type-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Показ деталей карты
     */
    showCardDetails(card, playerId) {
        const modal = document.createElement('div');
        modal.className = 'card-details-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="card-header">
                        <div class="card-icon" style="color: ${card.color}">${card.icon}</div>
                        <div class="card-info">
                            <h3>${card.name}</h3>
                            <p>${card.description}</p>
                        </div>
                    </div>
                    
                    <div class="card-details">
                        <div class="detail-row">
                            <span>Стоимость:</span>
                            <span>$${card.cost.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Первый взнос:</span>
                            <span>$${card.downPayment.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Денежный поток:</span>
                            <span>$${card.cashFlow.toLocaleString()}/мес</span>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-buy" onclick="window.cardModule.buyCurrentCard('${playerId}')">
                            Купить за $${card.downPayment.toLocaleString()}
                        </button>
                        <button class="btn-cancel" onclick="window.cardModule.cancelCurrentCard()">
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем стили
        const style = document.createElement('style');
        style.textContent = `
            .card-details-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
            }
            
            .card-header {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .card-icon {
                font-size: 3rem;
                margin-right: 20px;
            }
            
            .card-details {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .card-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .btn-buy {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            }
            
            .btn-cancel {
                background: #f44336;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
    }

    /**
     * Покупка текущей карты
     */
    buyCurrentCard(playerId) {
        if (!this.currentCard) {
            console.warn('Нет текущей карты для покупки');
            return;
        }

        const result = this.buyCard(playerId, this.currentCard);
        
        if (result.success) {
            this.clearCurrentCard();
            // Закрываем модальное окно
            const modal = document.querySelector('.card-details-modal');
            if (modal) {
                modal.remove();
            }
            
            // Показываем уведомление
            this.showNotification(result.message, 'success');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    /**
     * Отмена текущей карты
     */
    cancelCurrentCard() {
        if (this.currentCard) {
            this.discardCard(this.currentCard, this.currentCard.type);
            this.clearCurrentCard();
        }
        
        // Закрываем модальное окно
        const modal = document.querySelector('.card-details-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Показ уведомления
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Добавляем стили
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 10002;
                animation: slideIn 0.3s ease;
            }
            
            .notification.success {
                background: #4CAF50;
            }
            
            .notification.error {
                background: #f44336;
            }
            
            .notification.info {
                background: #2196F3;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        // Автоматически убираем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 3000);
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        this.decks = {};
        this.discardPiles = {};
        this.playerAssets.clear();
        this.currentCard = null;
        this.isDestroyed = true;
        console.log('🗑️ CardModule уничтожен');
    }
}

// Создаем глобальный экземпляр
if (typeof window !== 'undefined') {
    window.cardModule = new CardModule(window.gameCore || {});
}

export default CardModule;
