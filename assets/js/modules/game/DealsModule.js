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
        
        this.init();
    }
    
    init() {
        console.log('🎴 DealsModule: Инициализация модуля карточек');
        this.loadDealsData();
        this.setupEventListeners();
    }
    
    // Загрузка данных карточек
    loadDealsData() {
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
            // Добавить еще 21 карту...
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
            // Добавить еще 29 карт...
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
            // Добавить еще 22 карты...
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
            // Добавить еще 22 карты...
        ];
        
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
        
        // Обновление счетчиков карт в UI
        this.updateDeckCounters();
    }
    
    // Показать выбор типа сделки
    showDealChoice(playerId) {
        const modal = this.createDealChoiceModal();
        document.body.appendChild(modal);
        
        // Обработчики выбора
        modal.querySelector('.big-deal-btn').addEventListener('click', () => {
            this.drawCard('bigDeal', playerId);
            this.closeModal(modal);
        });
        
        modal.querySelector('.small-deal-btn').addEventListener('click', () => {
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
            }
            
            .deals-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                padding: 30px;
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
    
    // Показать карту сделки
    showDealCard(card, playerId) {
        const modal = this.createDealCardModal(card);
        document.body.appendChild(modal);
        
        // Обработчики действий
        modal.querySelector('.buy-btn').addEventListener('click', () => {
            this.buyCard(card, playerId);
            this.closeModal(modal);
        });
        
        modal.querySelector('.pass-btn').addEventListener('click', () => {
            this.passCard(card, deckType);
            this.closeModal(modal);
        });
        
        modal.querySelector('.transfer-btn').addEventListener('click', () => {
            this.showTransferOptions(card, playerId);
        });
    }
    
    // Создание модального окна карты сделки
    createDealCardModal(card) {
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
                    </div>
                    <div class="deal-card-actions">
                        <button class="action-btn buy-btn">Купить</button>
                        <button class="action-btn transfer-btn">Передать</button>
                        <button class="action-btn pass-btn">Отмена</button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    // Покупка карты
    buyCard(card, playerId) {
        // Добавляем карту в активы игрока
        if (!this.playerAssets.has(playerId)) {
            this.playerAssets.set(playerId, []);
        }
        
        this.playerAssets.get(playerId).push(card);
        
        // Сбрасываем текущую сделку
        this.currentDeal = null;
        this.isDealActive = false;
        
        console.log(`🎴 DealsModule: Игрок ${playerId} купил карту ${card.name}`);
        
        // Уведомляем о покупке
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
    
    // Создание модального окна каталога активов
    createAssetsCatalogModal() {
        const modal = document.createElement('div');
        modal.className = 'deals-modal';
        
        // Собираем все активы всех игроков
        let allAssets = [];
        this.playerAssets.forEach((assets, playerId) => {
            assets.forEach(asset => {
                allAssets.push({...asset, ownerId: playerId});
            });
        });
        
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
        
        return modal;
    }
    
    // Показать опции передачи карты
    showTransferOptions(card, fromPlayerId) {
        // Получаем список других игроков
        const otherPlayers = Array.from(this.playerAssets.keys()).filter(id => id !== fromPlayerId);
        
        if (otherPlayers.length === 0) {
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
                        ${otherPlayers.map(playerId => `
                            <button class="player-btn" data-player-id="${playerId}">
                                Игрок ${playerId}
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
        
        return modal;
    }
    
    // Передача карты другому игроку
    transferCard(card, fromPlayerId, toPlayerId) {
        // Удаляем карту у отправителя
        const fromAssets = this.playerAssets.get(fromPlayerId) || [];
        const cardIndex = fromAssets.findIndex(asset => asset.id === card.id);
        if (cardIndex !== -1) {
            fromAssets.splice(cardIndex, 1);
        }
        
        // Добавляем карту получателю
        if (!this.playerAssets.has(toPlayerId)) {
            this.playerAssets.set(toPlayerId, []);
        }
        this.playerAssets.get(toPlayerId).push(card);
        
        console.log(`🎴 DealsModule: Карта ${card.name} передана от ${fromPlayerId} к ${toPlayerId}`);
        
        // Уведомляем о передаче
        this.notifyCardTransferred(card, fromPlayerId, toPlayerId);
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
    }
    
    // Закрытие модального окна
    closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
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
        // Пытаемся получить из различных источников
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
        return currentRoom.userId || 'player1';
    }
    
    // Обновление счетчиков карт в UI
    updateDeckCounters() {
        setTimeout(() => {
            // Обновляем счетчики в полосе сделок
            const bigDealCounters = document.querySelectorAll('.special-card.big-deal .special-metric');
            const smallDealCounters = document.querySelectorAll('.special-card.small-deal .special-metric');
            
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
