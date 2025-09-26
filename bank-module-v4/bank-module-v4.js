/**
 * Bank Module v4 - Complete Rewrite
 * Простой, надежный и эффективный банковский модуль
 * VERSION: 4.1-DEBUG (с синхронизацией баланса)
 */

// Константы
const CREDIT_MULTIPLIER = 10; // Максимальный кредит = PAYDAY * 10

class BankModuleV4 {
    constructor() {
        console.log('🏦 BankModuleV4 v4.1-DEBUG: Инициализация модуля');
        this.roomId = null;
        this.userId = null;
        this.playerName = null;
        this.playerIndex = 0;
        this.players = [];
        this.data = {
            balance: 0,
            income: 0,
            expenses: 0,
            credit: 0,
            maxCredit: 0,
            payday: 0,
            transfers: []
        };
        this.isInitialized = false;
        this.isInitializing = false;
        this.syncInterval = null;
        this.listeners = new Map();
        this.isLoading = false;
        this.lastLoadTime = 0;
        this.loadDebounceTimer = null;
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 3000 // 3 seconds cache TTL
        };
    }

    /**
     * Инициализация модуля
     */
    async init() {
        // Предотвращаем множественную инициализацию
        if (this.isInitialized || this.isInitializing) {
            console.log('⏳ BankModuleV4: Инициализация уже выполняется или завершена');
            return this.isInitialized;
        }

        this.isInitializing = true;
        
        try {
            console.log('🏦 BankModuleV4: Инициализация...');
            
        // Получаем ID комнаты и пользователя
        this.roomId = this.getRoomId();
        this.userId = this.getUserId();
        
        // Если Room ID все еще не найден, ждем немного и пробуем снова
        if (!this.roomId) {
            console.log('⏳ Room ID не найден, ожидаем загрузки gameState...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.roomId = this.getRoomId();
            
            // Если все еще не найден, ждем еще немного
            if (!this.roomId) {
                console.log('⏳ Room ID все еще не найден, ожидаем еще...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                this.roomId = this.getRoomId();
            }
        }
            
            if (!this.roomId || !this.userId) {
                throw new Error('Не удалось получить ID комнаты или пользователя');
            }
            
            console.log('🏦 BankModuleV4: ID получены', { roomId: this.roomId, userId: this.userId });
            
            // Загружаем начальные данные
            await this.loadData(true);
            
            // Настраиваем автоматическую синхронизацию
            this.startAutoSync();
            
            this.isInitialized = true;
            this.isInitializing = false;
            console.log('✅ BankModuleV4: Инициализация завершена');
            
            return true;
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка инициализации:', error);
            this.isInitializing = false;
            return false;
        }
    }

    /**
     * Получение ID комнаты
     */
    getRoomId() {
        // Пробуем разные способы получения room ID
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get('room_id') || urlParams.get('roomId') || urlParams.get('room');
        
        // Если не найдено в URL, пробуем получить из глобальных переменных
        if (!roomId && window.currentRoomId) {
            roomId = window.currentRoomId;
        }
        
        // Если все еще не найдено, пробуем из других источников
        if (!roomId && window.roomId) {
            roomId = window.roomId;
        }
        
        // Пробуем получить из gameState (основной источник в игре)
        if (!roomId && window.gameState?.roomId) {
            roomId = window.gameState.roomId;
        }
        
        // Пробуем получить из gameState.state
        if (!roomId && window.gameState?.state?.roomId) {
            roomId = window.gameState.state.roomId;
        }
        
        console.log('🔍 Поиск Room ID:', { 
            fromUrl: urlParams.get('room_id') || urlParams.get('roomId'),
            fromWindow: window.currentRoomId || window.roomId,
            fromGameState: window.gameState?.roomId,
            fromGameStateState: window.gameState?.state?.roomId,
            result: roomId 
        });
        
        return roomId;
    }

    /**
     * Получение ID пользователя
     */
    getUserId() {
        // Пробуем разные способы получения user ID
        let userId = null;
        
        // 1. Из localStorage (авторизованный пользователь)
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                userId = user.id || user._id;
                if (userId) {
                    console.log('🆔 User ID из авторизованного пользователя:', userId);
                    return userId;
                }
            } catch (e) {
                console.warn('Ошибка парсинга user data:', e);
            }
        }
        
        // 2. Из других источников localStorage
        userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
        if (userId) {
            console.log('🆔 User ID из localStorage:', userId);
            return userId;
        }
        
        // 3. Из глобальных переменных
        if (window.userId) {
            console.log('🆔 User ID из window.userId:', window.userId);
            return window.userId;
        }
        
        if (window.currentUserId) {
            console.log('🆔 User ID из window.currentUserId:', window.currentUserId);
            return window.currentUserId;
        }
        
        // 4. Если все еще не найдено, пробуем найти в URL или других местах
        const urlParams = new URLSearchParams(window.location.search);
        userId = urlParams.get('user_id');
        if (userId) {
            console.log('🆔 User ID из URL параметров:', userId);
            return userId;
        }
        
        console.warn('⚠️ User ID не найден! Проверьте авторизацию пользователя.');
        return null;
    }

    /**
     * Получение данных пользователя из localStorage
     */
    getStoredUserInfo() {
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (error) {
            console.warn('⚠️ BankModuleV4: Ошибка парсинга user из localStorage', error);
        }
        return null;
    }

    /**
     * Прокси-функция для API запросов через локальный сервер
     */
    async makeApiRequest(endpoint, options = {}) {
        try {
            const baseUrl = window.location.origin; // Используем текущий origin (localhost:3000)
            const url = `${baseUrl}${endpoint}`;
            
            console.log('📡 BankModuleV4: API Request:', {
                endpoint,
                url,
                method: options.method || 'GET',
                body: options.body
            });
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            console.log('📡 BankModuleV4: API Response:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            console.error('❌ BankModuleV4: API Request Error:', error);
            throw error;
        }
    }

    /**
     * Загрузка данных с сервера (с дебаунсингом)
     */
    async loadData(force = false) {
        // Проверяем кэш, если не принудительная загрузка
        if (!force && this.cache.data && (Date.now() - this.cache.timestamp) < this.cache.ttl) {
            console.log('📦 BankModuleV4: Используем кэшированные данные');
            this.updateDataFromCache();
            return true;
        }

        // Дебаунсинг - отменяем предыдущий запрос если он еще выполняется
        if (this.loadDebounceTimer) {
            clearTimeout(this.loadDebounceTimer);
        }

        // Если уже загружаем, не запускаем новый запрос
        if (this.isLoading) {
            console.log('⏳ BankModuleV4: Загрузка уже выполняется, пропускаем');
            return false;
        }

        return new Promise((resolve) => {
            this.loadDebounceTimer = setTimeout(async () => {
                try {
                    await this._loadDataInternal();
                    resolve(true);
                } catch (error) {
                    console.error('❌ BankModuleV4: Ошибка загрузки данных:', error);
                    resolve(false);
                }
            }, 100); // 100ms дебаунс
        });
    }

    /**
     * Внутренняя загрузка данных
     */
    async _loadDataInternal() {
        this.isLoading = true;
        this.lastLoadTime = Date.now();
        
        try {
            if (!this.roomId || !this.userId) {
                throw new Error('Не заданы идентификаторы комнаты или пользователя');
            }

            console.log('📡 BankModuleV4: Загрузка данных через сервер банка...', {
                roomId: this.roomId,
                userId: this.userId
            });

            // 1. Получаем информацию о комнате и игроках
            const roomResponse = await this.makeApiRequest(`/api/rooms/${this.roomId}?user_id=${this.userId}`);
            
            if (roomResponse.status === 404) {
                console.warn('⚠️ BankModuleV4: Комната не найдена на сервере, работаем в офлайн режиме');
                return this.loadOfflineData();
            }
            
            const roomPayload = await roomResponse.json();
            const room = roomPayload?.room || roomPayload;
            console.log('📡 BankModuleV4: Данные комнаты получены', room);

            // 2. Сохраняем информацию об игроках и определяем имя текущего игрока
            this.processRoomData(room);

            if (!this.playerName) {
                throw new Error('Не удалось определить имя игрока');
            }

            const encodedName = encodeURIComponent(this.playerName);

            // 3. Загружаем банковские данные параллельно
            const [balanceRes, financialsRes, historyRes, creditRes] = await Promise.all([
                this.makeApiRequest(`/api/bank/balance/${encodedName}/${this.roomId}`),
                this.makeApiRequest(`/api/bank/financials/${encodedName}/${this.roomId}`),
                this.makeApiRequest(`/api/bank/history/${this.roomId}`),
                this.makeApiRequest(`/api/bank/credit/status/${encodedName}/${this.roomId}`)
            ]);

            const [balanceData, financialsData, historyData, creditData] = await Promise.all([
                balanceRes.json(),
                financialsRes.json(),
                historyRes.json(),
                creditRes.json()
            ]);

            console.log('📊 BankModuleV4: Банковские данные получены', {
                balanceData,
                financialsData,
                historyData,
                creditData
            });

            // 4. Обновляем локальное состояние модуля
            const salary = Number(financialsData?.salary || 0);
            const passiveIncome = Number(financialsData?.passiveIncome || 0);
            const totalIncome = Number.isFinite(salary + passiveIncome) ? salary + passiveIncome : 0;
            const totalExpenses = Number(financialsData?.totalExpenses || 0);
            const netIncome = Number(financialsData?.netIncome ?? (totalIncome - totalExpenses));

            this.data.balance = Number(balanceData?.amount || 0);
            this.data.income = totalIncome;
            this.data.passiveIncome = passiveIncome; // Добавляем пассивный доход отдельно
            this.data.expenses = totalExpenses;
            this.data.payday = Number.isFinite(netIncome) ? netIncome : Math.max(0, totalIncome - totalExpenses);
            this.data.credit = Number(creditData?.loanAmount || 0);
            this.data.maxCredit = Number(creditData?.maxAvailable || Math.max(0, this.data.payday * CREDIT_MULTIPLIER));
            this.data.transfers = Array.isArray(historyData) ? historyData : [];
            
            // 5. Синхронизируем с DataStore, если доступен
            if (window.dataStore) {
                // Инициализируем DataStore, если еще не инициализирован
                if (!window.dataStore.isReady()) {
                    window.dataStore.initialize();
                }
                
                // Устанавливаем игровую информацию
                if (this.roomId && this.playerName) {
                    window.dataStore.setGameInfo(this.roomId, this.playerName, this.userId);
                }
                
                // Обновляем данные в DataStore
                window.dataStore.update({
                    balance: this.data.balance,
                    income: this.data.income,
                    passiveIncome: this.data.passiveIncome,
                    expenses: this.data.expenses,
                    payday: this.data.payday,
                    credit: this.data.credit,
                    maxCredit: this.data.maxCredit,
                    transfers: this.data.transfers
                });
                
                console.log('🔄 BankModuleV4: Данные синхронизированы с DataStore', {
                    balance: this.data.balance,
                    income: this.data.income,
                    expenses: this.data.expenses,
                    payday: this.data.payday,
                    credit: this.data.credit
                });
            } else {
                console.warn('⚠️ BankModuleV4: DataStore недоступен, используем локальные данные');
            }

            // 6. Обновляем кэш
            this.cache.data = { ...this.data };
            this.cache.timestamp = Date.now();

            // 7. Синхронизируем баланс игрока в игре
            this.syncPlayerBalanceInGame();

            // 8. Обновляем UI и список получателей
            this.updateUI();
            this.initRecipientsList();

            return true;
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка загрузки данных:', error);
            
            // При ошибке API пытаемся загрузить офлайн данные
            console.log('🔄 BankModuleV4: Переключаемся на офлайн режим');
            try {
                await this.loadOfflineData();
                return true;
            } catch (offlineError) {
                console.error('❌ BankModuleV4: Ошибка офлайн режима:', offlineError);
            return false;
            }
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Обновление данных из кэша
     */
    updateDataFromCache() {
        if (this.cache.data) {
            this.data = { ...this.cache.data };
            this.syncPlayerBalanceInGame();
            this.updateUI();
        }
    }

    /**
     * Загрузка данных в офлайн режиме (когда комната не найдена на сервере)
     */
    async loadOfflineData() {
        try {
            console.log('📱 BankModuleV4: Загрузка офлайн данных...');
            
            // Получаем данные пользователя из localStorage
            const storedUser = this.getStoredUserInfo();
            if (!storedUser) {
                throw new Error('Данные пользователя не найдены в localStorage');
            }
            
            // Устанавливаем имя игрока
            this.playerName = storedUser.username || storedUser.name || 'Игрок';
            
            // Загружаем данные из localStorage или устанавливаем значения по умолчанию
            this.data.balance = Number(localStorage.getItem('playerBalance') || 10000);
            this.data.income = Number(localStorage.getItem('playerIncome') || 0);
            this.data.expenses = Number(localStorage.getItem('playerExpenses') || 0);
            this.data.payday = Math.max(0, this.data.income - this.data.expenses);
            this.data.credit = Number(localStorage.getItem('playerCredit') || 0);
            this.data.maxCredit = Math.max(0, this.data.payday * CREDIT_MULTIPLIER);
            this.data.transfers = JSON.parse(localStorage.getItem('playerTransfers') || '[]');
            
            // Создаем фиктивных игроков для списка получателей
            this.players = [
                { name: this.playerName, userId: this.userId, username: this.playerName }
            ];
            window.players = this.players;
            
            // Синхронизируем баланс игрока в игре
            this.syncPlayerBalanceInGame();
            
            // Обновляем UI
            this.updateUI();
            if (typeof window.initRecipientsList === 'function') {
                window.initRecipientsList();
            }
            
            console.log('✅ BankModuleV4: Офлайн данные загружены', this.data);
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка загрузки офлайн данных:', error);
            return false;
        }
    }

    /**
     * Сохранение данных в localStorage для офлайн режима
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('playerBalance', this.data.balance.toString());
            localStorage.setItem('playerIncome', this.data.income.toString());
            localStorage.setItem('playerExpenses', this.data.expenses.toString());
            localStorage.setItem('playerCredit', this.data.credit.toString());
            localStorage.setItem('playerTransfers', JSON.stringify(this.data.transfers));
            console.log('💾 BankModuleV4: Данные сохранены в localStorage');
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка сохранения в localStorage:', error);
        }
    }

    /**
     * Синхронизация баланса игрока в игре
     */
    syncPlayerBalanceInGame() {
        try {
            if (!this.playerName || !this.data.balance) return;

            // Обновляем баланс в глобальном состоянии игры
            if (window.gameState?.state?.players) {
                const player = window.gameState.state.players.find(p => 
                    p.name === this.playerName || 
                    p.username === this.playerName ||
                    String(p.userId) === String(this.userId)
                );
                
                if (player) {
                    const oldBalance = player.cash || 0;
                    player.cash = this.data.balance;
                    console.log(`🔄 BankModuleV4: Синхронизация баланса игрока ${this.playerName}: $${oldBalance} → $${this.data.balance}`);
                }
            }

            // Обновляем баланс в массиве игроков
            if (window.players && Array.isArray(window.players)) {
                const player = window.players.find(p => 
                    p.name === this.playerName || 
                    p.username === this.playerName ||
                    String(p.userId) === String(this.userId)
                );
                
                if (player) {
                    const oldBalance = player.cash || 0;
                    player.cash = this.data.balance;
                    console.log(`🔄 BankModuleV4: Синхронизация в массиве игроков ${this.playerName}: $${oldBalance} → $${this.data.balance}`);
                }
            }

        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка синхронизации баланса игрока:', error);
        }
    }

    /**
     * Обработка данных комнаты
     */
    processRoomData(roomData) {
        try {
            const room = roomData || {};
            this.players = Array.isArray(room.players) ? room.players : [];
            window.players = this.players;

            const resolvedIndex = this.findPlayerIndex(this.players);
            this.playerIndex = resolvedIndex >= 0 ? resolvedIndex : 0;

            const playerFromRoom = this.players[this.playerIndex] || null;
            const storedUser = this.getStoredUserInfo();

            const resolvedName = playerFromRoom?.name ||
                storedUser?.username ||
                storedUser?.name ||
                localStorage.getItem('username');

            this.playerName = resolvedName || this.playerName || playerFromRoom?.userId || null;

            console.log('📊 BankModuleV4: Игрок определен', {
                playerIndex: this.playerIndex,
                playerName: this.playerName,
                playersCount: this.players.length
            });

        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка обработки данных комнаты:', error);
        }
    }

    /**
     * Поиск индекса игрока
     */
    findPlayerIndex(players) {
        for (let i = 0; i < players.length; i++) {
            if (players[i].user_id === this.userId) {
                return i;
            }
            if (players[i].userId === this.userId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Получение количества детей у игрока
     */
    getChildrenCount() {
        try {
            // Ищем игрока в комнате
            const room = window.gameState?.state?.room || window.gameState?.room;
            if (!room || !room.players) return 0;
            
            const player = room.players.find(p => 
                p.name === this.playerName || 
                p.username === this.playerName ||
                String(p.userId) === String(this.userId)
            );
            
            if (player) {
                return Math.min(Number(player.children || 0), 3); // Максимум 3 ребенка
            }
            
            return 0;
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка получения количества детей:', error);
            return 0;
        }
    }

    /**
     * Получение суммы кредита по типу
     */
    getLoanAmount(loanType) {
        const loanData = this.data.loans || {};
        const loanAmounts = {
            car: 700,
            education: 500,
            mortgage: 1200,
            creditCards: 1000
        };
        
        return loanData[loanType] !== false ? loanAmounts[loanType] : 0;
    }

    /**
     * Расчет общих расходов
     */
    getTotalExpenses() {
        const taxes = 1300;
        const otherExpenses = 1500;
        const carLoan = this.getLoanAmount('car');
        const educationLoan = this.getLoanAmount('education');
        const mortgage = this.getLoanAmount('mortgage');
        const creditCards = this.getLoanAmount('creditCards');
        
        // Добавляем текущий кредит как ежемесячный платеж
        const currentCreditPayment = Math.floor(this.data.credit / 1000) * 100;
        
        return taxes + otherExpenses + carLoan + educationLoan + mortgage + creditCards + currentCreditPayment;
    }

    /**
     * Погашение кредита
     */
    async payoffLoan(loanType) {
        const payoffAmounts = {
            car: 14000,
            education: 10000,
            mortgage: 120000,
            creditCards: 10000
        };
        
        const payoffAmount = payoffAmounts[loanType];
        const currentBalance = this.data.balance;
        
        if (currentBalance < payoffAmount) {
            alert(`Недостаточно средств для погашения! Нужно: $${payoffAmount.toLocaleString()}, доступно: $${currentBalance.toLocaleString()}`);
            return;
        }
        
        if (!confirm(`Погасить ${this.getLoanName(loanType)} за $${payoffAmount.toLocaleString()}?`)) {
            return;
        }
        
        try {
            // Отправляем запрос на сервер для погашения кредита
            const response = await fetch(`/api/bank/loans/payoff`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: this.roomId,
                    username: this.playerName,
                    loanType: loanType,
                    amount: payoffAmount
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Обновляем локальные данные
                    if (!this.data.loans) this.data.loans = {};
                    this.data.loans[loanType] = false; // Кредит погашен
                    this.data.balance -= payoffAmount;
                    
                    // Обновляем UI
                    this.updateUI();
                    
                    alert(`Кредит ${this.getLoanName(loanType)} успешно погашен!`);
                } else {
                    alert(`Ошибка: ${result.message}`);
                }
            } else {
                alert('Ошибка сервера при погашении кредита');
            }
        } catch (error) {
            console.error('Ошибка погашения кредита:', error);
            alert('Ошибка при погашении кредита');
        }
    }

    /**
     * Получение названия кредита
     */
    getLoanName(loanType) {
        const names = {
            car: 'Кредит на авто',
            education: 'Образовательный кредит',
            mortgage: 'Ипотека',
            creditCards: 'Кредитные карты'
        };
        return names[loanType] || loanType;
    }

    /**
     * Переключение деталей доходов
     */
    toggleIncomeDetails() {
        const details = document.getElementById('incomeDetails');
        const icon = document.getElementById('incomeExpandIcon');
        
        if (details && icon) {
            if (details.style.display === 'none') {
                details.style.display = 'block';
                icon.textContent = '▼';
            } else {
                details.style.display = 'none';
                icon.textContent = '▶';
            }
        }
    }

    /**
     * Переключение деталей расходов
     */
    toggleExpensesDetails() {
        const details = document.getElementById('expensesDetails');
        const icon = document.getElementById('expensesExpandIcon');
        
        if (details && icon) {
            if (details.style.display === 'none') {
                details.style.display = 'block';
                icon.textContent = '▼';
            } else {
                details.style.display = 'none';
                icon.textContent = '▶';
            }
        }
    }

    /**
     * Обновление UI
     */
    updateUI() {
        try {
            // Сохраняем текущие значения полей ввода
            const recipientSelect = document.getElementById('recipientSelect');
            const amountInput = document.getElementById('transferAmount');
            const creditAmountInput = document.getElementById('creditAmount');
            
            const currentRecipient = recipientSelect?.value || '';
            const currentAmount = amountInput?.value || '';
            const currentCreditAmount = creditAmountInput?.value || '';

            // Обновляем баланс
            const balanceEl = document.getElementById('currentBalance');
            if (balanceEl) {
                balanceEl.textContent = `$${this.data.balance.toLocaleString()}`;
            }
            
            // Обновляем финансовые детали
            const salaryEl = document.getElementById('salaryAmount');
            if (salaryEl) {
                // Показываем базовую зарплату $10,000
                salaryEl.textContent = `$${(10000).toLocaleString()}`;
            }
            
            const passiveIncomeEl = document.getElementById('passiveIncomeAmount');
            if (passiveIncomeEl) {
                passiveIncomeEl.textContent = `$0`; // Пока нет пассивного дохода
            }
            
            // Обновляем детализированные расходы
            const currentCreditEl = document.getElementById('currentCreditAmount');
            if (currentCreditEl) {
                // Каждые $1000 кредита = $100/мес платеж
                const monthlyPayment = Math.floor(this.data.credit / 1000) * 100;
                currentCreditEl.textContent = `$${monthlyPayment.toLocaleString()}`;
            }
            
            const taxesEl = document.getElementById('taxesAmount');
            if (taxesEl) {
                taxesEl.textContent = `$1,300`;
            }
            
            const otherExpensesEl = document.getElementById('otherExpensesAmount');
            if (otherExpensesEl) {
                otherExpensesEl.textContent = `$1,500`;
            }
            
            const carLoanEl = document.getElementById('carLoanAmount');
            if (carLoanEl) {
                carLoanEl.textContent = `$${this.getLoanAmount('car')}`;
            }
            
            const educationLoanEl = document.getElementById('educationLoanAmount');
            if (educationLoanEl) {
                educationLoanEl.textContent = `$${this.getLoanAmount('education')}`;
            }
            
            const mortgageEl = document.getElementById('mortgageAmount');
            if (mortgageEl) {
                mortgageEl.textContent = `$${this.getLoanAmount('mortgage')}`;
            }
            
            const creditCardsEl = document.getElementById('creditCardsAmount');
            if (creditCardsEl) {
                creditCardsEl.textContent = `$${this.getLoanAmount('creditCards')}`;
            }
            
            const childrenExpensesEl = document.getElementById('childrenExpensesAmount');
            if (childrenExpensesEl) {
                const childrenCount = this.getChildrenCount();
                const childrenExpenses = childrenCount * 400;
                childrenExpensesEl.textContent = `$${childrenExpenses.toLocaleString()}`;
            }
            
            // Обновляем общие суммы доходов и расходов
            const totalIncomeEl = document.getElementById('totalIncomeAmount');
            if (totalIncomeEl) {
                const income = Number(this.data.income || 0);
                const passiveIncome = Number(this.data.passiveIncome || 0);
                const totalIncome = income + passiveIncome;
                totalIncomeEl.textContent = `$${totalIncome.toLocaleString()}`;
            }
            
            const totalExpensesEl = document.getElementById('totalExpensesAmount');
            if (totalExpensesEl) {
                const childrenCount = this.getChildrenCount();
                const childrenExpenses = childrenCount * 400;
                const totalExpenses = this.getTotalExpenses() + childrenExpenses;
                totalExpensesEl.textContent = `$${totalExpenses.toLocaleString()}`;
            }
            
            const netIncomeEl = document.getElementById('netIncomeAmount');
            if (netIncomeEl) {
                const childrenCount = this.getChildrenCount();
                const childrenExpenses = childrenCount * 400;
                const income = Number(this.data.income || 0);
                const passiveIncome = Number(this.data.passiveIncome || 0);
                // Чистый доход = доходы - все расходы (включая штраф по кредиту)
                const totalExpenses = this.getTotalExpenses() + childrenExpenses;
                const netIncome = (income + passiveIncome) - totalExpenses;
                netIncomeEl.textContent = `$${netIncome.toLocaleString()}`;
            }
            
            // Обновляем PAYDAY
            const paydayEl = document.getElementById('paydayAmount');
            if (paydayEl) {
                const childrenCount = this.getChildrenCount();
                const childrenExpenses = childrenCount * 400;
                const income = Number(this.data.income || 0);
                const passiveIncome = Number(this.data.passiveIncome || 0);
                // PAYDAY = доходы - все расходы (включая штраф по кредиту)
                const totalExpenses = this.getTotalExpenses() + childrenExpenses;
                const payday = (income + passiveIncome) - totalExpenses;
                paydayEl.textContent = `$${payday.toLocaleString()}/мес`;
            }
            
            // Обновляем кредитную информацию
            const currentDebtEl = document.getElementById('currentDebt');
            if (currentDebtEl) {
                currentDebtEl.textContent = `$${(this.data.credit || 0).toLocaleString()}`;
            }
            
            
            // Рассчитываем максимальный лимит один раз для обеих полей
            const childrenCount = this.getChildrenCount();
            const childrenExpenses = childrenCount * 400;
            const income = Number(this.data.income || 0);
            const passiveIncome = Number(this.data.passiveIncome || 0);
            // Максимальный лимит рассчитывается от базового PAYDAY без учета текущего кредита
            // Исключаем штраф по кредиту из расчета максимального лимита
            const creditPenalty = Math.floor((this.data.credit || 0) / 1000) * 100;
            const baseExpenses = this.getTotalExpenses() + childrenExpenses;
            const baseNetIncome = (income + passiveIncome) - baseExpenses + creditPenalty;
            const maxCredit = Math.max(0, baseNetIncome * 10);
            
            const maxLimitEl = document.getElementById('maxLimit');
            if (maxLimitEl) {
                maxLimitEl.textContent = `$${maxCredit.toLocaleString()}`;
            }
            
            const freeLimitEl = document.getElementById('freeLimit');
            if (freeLimitEl) {
                // Свободный лимит = Максимальный лимит (не вычитаем текущий долг)
                // Текущий долг уже учтен в расходах и платежах
                freeLimitEl.textContent = `$${maxCredit.toLocaleString()}`;
            }
            
            // Обновляем историю переводов
            this.updateTransfersHistory();

            const historyCountEl = document.getElementById('historyCount');
            if (historyCountEl) {
                historyCountEl.textContent = this.data.transfers.length;
            }

            // Восстанавливаем значения полей ввода
            if (recipientSelect && currentRecipient) {
                recipientSelect.value = currentRecipient;
            }
            if (amountInput && currentAmount) {
                amountInput.value = currentAmount;
            }
            if (creditAmountInput && currentCreditAmount) {
                creditAmountInput.value = currentCreditAmount;
            }

            console.log('🎨 BankModuleV4: UI обновлен');
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка обновления UI:', error);
        }
    }

    /**
     * Инициализация списка получателей
     */
    initRecipientsList() {
        try {
            const recipientSelect = document.getElementById('recipientSelect');
            if (!recipientSelect) return;

            // Сохраняем текущий выбор
            const currentSelection = recipientSelect.value;

            // Очищаем список
            recipientSelect.innerHTML = '<option value="">Выберите получателя</option>';

            // Добавляем игроков
            if (this.players && this.players.length > 0) {
                this.players.forEach((player, index) => {
                    if (player.name !== this.playerName) {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = player.name;
                        recipientSelect.appendChild(option);
                    }
                });
            }

            // Восстанавливаем выбор, если он все еще валиден
            if (currentSelection && recipientSelect.querySelector(`option[value="${currentSelection}"]`)) {
                recipientSelect.value = currentSelection;
            }

            console.log('👥 BankModuleV4: Список получателей обновлен');
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка инициализации списка получателей:', error);
        }
    }

    /**
     * Обновление истории переводов
     */
    updateTransfersHistory() {
        try {
            const historyContainer = document.getElementById('transfersHistory');
            if (!historyContainer) return;
            
            // Очищаем контейнер
            historyContainer.innerHTML = '';

            if (!this.data.transfers.length) {
                historyContainer.innerHTML = '<div class="transfer-empty">Нет операций</div>';
                console.log('📋 BankModuleV4: История пуста');
                return;
            }

            // Отладочная информация о транзакциях
            console.log(`🔍 BankModuleV4: Анализ транзакций для игрока ${this.playerName}:`, this.data.transfers.map(t => ({
                from: t.from,
                to: t.to,
                sender: t.sender,
                recipient: t.recipient,
                amount: t.amount,
                reason: t.reason || t.description,
                playerName: this.playerName,
                fullTransfer: t
            })));

            // Фильтруем дубликаты и проблемные записи
            const uniqueTransfers = this.data.transfers.filter((transfer, index, self) => {
                const key = `${transfer.amount}_${transfer.description || transfer.reason}_${transfer.timestamp}`;
                const isDuplicate = self.findIndex(t => 
                    `${t.amount}_${t.description || t.reason}_${t.timestamp}` === key
                ) !== index;
                
                // Исключаем отрицательные записи "стартовые сбережения"
                const isNegativeStartingSavings = (transfer.description || transfer.reason) === 'стартовые сбережения' && 
                                                Number(transfer.amount) < 0;
                
                // Для "стартовые сбережения" - показываем только положительные суммы для текущего игрока
                const isStartingSavings = (transfer.description || transfer.reason) === 'стартовые сбережения';
                const isStartingSavingsForCurrentPlayer = isStartingSavings && 
                    (transfer.to === this.playerName || transfer.recipient === this.playerName);
                const shouldShowStartingSavings = isStartingSavingsForCurrentPlayer && Number(transfer.amount) > 0;
                
                // Для обычных транзакций - показываем только те, которые относятся к текущему игроку
                const isRegularTransaction = !isStartingSavings;
                const isRegularTransactionForCurrentPlayer = isRegularTransaction && 
                    (transfer.from === this.playerName || transfer.to === this.playerName || 
                     transfer.sender === this.playerName || transfer.recipient === this.playerName);
                
                // Показываем транзакции, которые относятся к игроку ИЛИ являются стартовыми сбережениями для текущего игрока
                // Убираем проверку на дубликаты для стартовых сбережений, так как они могут быть одинаковыми
                const shouldShow = (isRegularTransactionForCurrentPlayer || shouldShowStartingSavings) && !isNegativeStartingSavings;
                
                if (isStartingSavings) {
                    console.log(`🔍 Стартовые сбережения: amount=${transfer.amount}, to=${transfer.to}, playerName=${this.playerName}, shouldShow=${shouldShow}, isStartingSavingsForCurrentPlayer=${isStartingSavingsForCurrentPlayer}, isDuplicate=${isDuplicate}, isNegativeStartingSavings=${isNegativeStartingSavings}, isRegularTransactionForCurrentPlayer=${isRegularTransactionForCurrentPlayer}`);
                }
                
                return shouldShow;
            });

            const orderedTransfers = [...uniqueTransfers].sort((a, b) => {
                const aTime = new Date(a?.timestamp || 0).getTime();
                const bTime = new Date(b?.timestamp || 0).getTime();
                return bTime - aTime;
            });

            orderedTransfers.forEach(transfer => {
                const transferEl = this.createTransferElement(transfer);
                historyContainer.appendChild(transferEl);
            });

            console.log(`📋 BankModuleV4: История обновлена (${uniqueTransfers.length} уникальных записей из ${this.data.transfers.length})`);
            
            // Отладочная информация о фильтрации
            const filteredOut = this.data.transfers.length - uniqueTransfers.length;
            if (filteredOut > 0) {
                console.log(`🔍 BankModuleV4: Отфильтровано ${filteredOut} записей (дубликаты, не для игрока, отрицательные стартовые сбережения)`);
            }
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка обновления истории:', error);
        }
    }

    /**
     * Создание элемента перевода
     */
    createTransferElement(transfer) {
        const element = document.createElement('div');
        element.className = 'transfer-item';

        const rawAmount = Number(transfer?.amount || 0);
        const type = transfer?.type || '';
        const from = transfer?.from || transfer?.sender || 'Банк';
        const to = transfer?.to || transfer?.recipient || '';

        const isNotification = type === 'notification';
        const isCreditTake = type === 'credit_take';
        const isCreditRepay = type === 'credit_repay';

        const isReceived = isNotification
            ? rawAmount >= 0
            : to === this.playerName;
            
        // Отладочная информация для стартовых сбережений
        if ((transfer?.reason || transfer?.description) === 'стартовые сбережения') {
            console.log('🔍 Стартовые сбережения:', {
                from,
                to,
                playerName: this.playerName,
                rawAmount,
                isReceived,
                type
            });
        }

        const amountClass = isReceived ? 'received' : 'sent';
        const absoluteAmount = Math.abs(rawAmount);
        const amountPrefix = isReceived ? '+' : '-';
        const displayAmount = `${amountPrefix}$${absoluteAmount.toLocaleString()}`;

        let description = transfer?.reason || transfer?.description || '';

        if (!description) {
            if (isCreditTake) {
                description = `Кредит от банка`;
            } else if (isCreditRepay) {
                description = `Погашение кредита`;
            } else if (isNotification) {
                description = isReceived ? 'Поступление' : 'Списание';
            } else if (isReceived) {
                description = `Получено от ${from}`;
            } else {
                description = `Перевод ${to || 'Банк'}`;
            }
        }

        const timeLabel = transfer?.timestamp ? this.formatTime(transfer.timestamp) : '—';

        element.innerHTML = `
            <div class="transfer-amount ${amountClass}">${displayAmount}</div>
            <div class="transfer-description">${description}</div>
            <div class="transfer-time">${timeLabel}</div>
        `;

        return element;
    }

    /**
     * Форматирование времени
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        return date.toLocaleDateString();
    }

    /**
     * Запрос кредита
     */
    async requestCredit(amount = 1000) {
        try {
            console.log(`💰 BankModuleV4: Запрос кредита на $${amount} через банковский сервер`);
            
            if (!this.playerName) {
                throw new Error('Не удалось определить имя текущего игрока');
            }

            // Проверяем лимит на основе базового PAYDAY (без штрафа по кредиту)
            const childrenCount = this.getChildrenCount();
            const childrenExpenses = childrenCount * 400;
            const income = Number(this.data.income || 0);
            const passiveIncome = Number(this.data.passiveIncome || 0);
            const baseExpenses = this.getTotalExpenses() + childrenExpenses;
            const baseNetIncome = (income + passiveIncome) - baseExpenses;
            const maxCredit = Math.max(0, baseNetIncome * 10);
            
            if (amount > maxCredit) {
                throw new Error(`Превышен максимальный лимит кредита. Максимум: $${maxCredit.toLocaleString()}`);
            }

            // Отправляем запрос через сервер банка
            const response = await this.makeApiRequest('/api/bank/credit/take', {
                method: 'POST',
                body: JSON.stringify({
                    username: this.playerName,
                    roomId: this.roomId,
                    amount: amount
                })
            });

            const result = await response.json();
            if (result?.error) {
                throw new Error(result.error);
            }
            if (result?.success === false) {
                throw new Error('Не удалось получить кредит');
            }

            // Обновляем данные (принудительно)
            await this.loadData(true);

            console.log(`✅ BankModuleV4: Кредит на $${amount} получен`);
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка запроса кредита:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Погашение кредита
     */
    async payoffCredit(amount = null) {
        try {
            console.log('💰 BankModuleV4: Погашение кредита через банковский сервер');
            
            if (this.data.credit <= 0) {
                throw new Error('У вас нет активных кредитов');
            }

            if (!this.playerName) {
                throw new Error('Не удалось определить имя текущего игрока');
            }

            const payoffAmount = Number(amount || this.data.credit);
            if (!Number.isFinite(payoffAmount) || payoffAmount <= 0) {
                throw new Error('Некорректная сумма погашения');
            }

            const response = await this.makeApiRequest('/api/bank/credit/repay', {
                method: 'POST',
                body: JSON.stringify({
                    username: this.playerName,
                    roomId: this.roomId,
                    amount: payoffAmount
                })
            });

            const result = await response.json();
            if (result?.error) {
                throw new Error(result.error);
            }
            if (result?.success === false) {
                throw new Error('Не удалось погасить кредит');
            }

            // Обновляем данные (принудительно)
            await this.loadData(true);

            console.log('✅ BankModuleV4: Кредит погашен');
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка погашения кредита:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Перевод средств
     */
    async transferMoney(recipientRef, amount) {
        try {
            const numericAmount = Number(amount);
            console.log(`💸 BankModuleV4: Перевод $${numericAmount} через банковский сервер`);

            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                throw new Error('Укажите корректную сумму перевода');
            }

            if (numericAmount > this.data.balance) {
                throw new Error('Недостаточно средств');
            }

            if (!this.playerName) {
                throw new Error('Не удалось определить имя текущего игрока');
            }

            let recipientName = recipientRef;
            if (typeof recipientRef === 'number') {
                recipientName = this.players?.[recipientRef]?.name;
            }

            if (!recipientName) {
                throw new Error('Получатель не найден');
            }

            if (recipientName === this.playerName) {
                throw new Error('Нельзя перевести средства самому себе');
            }

            const response = await this.makeApiRequest('/api/bank/transfer', {
                method: 'POST',
                body: JSON.stringify({
                    from: this.playerName,
                    to: recipientName,
                    amount: numericAmount,
                    roomId: this.roomId
                })
            });

            const result = await response.json();
            if (result?.error) {
                throw new Error(result.error);
            }
            if (result?.success === false) {
                throw new Error('Не удалось выполнить перевод');
            }

            // Обновляем данные (принудительно)
            await this.loadData(true);
            
            // Принудительно обновляем UI
            this.updateUI();
            
            // Обновляем историю переводов
            await this.updateTransfersHistory();

            console.log(`✅ BankModuleV4: Перевод $${numericAmount} выполнен`);
            return true;
            
        } catch (error) {
            console.error('❌ BankModuleV4: Ошибка перевода:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Запуск автоматической синхронизации
     */
    startAutoSync() {
        // Синхронизация каждые 10 секунд (увеличено с 5)
        this.syncInterval = setInterval(() => {
            // Проверяем, не загружаем ли мы уже данные
            if (!this.isLoading) {
            this.loadData();
            } else {
                console.log('⏳ BankModuleV4: Пропускаем автосинхронизацию - загрузка уже выполняется');
            }
        }, 10000);
        
        console.log('🔄 BankModuleV4: Автосинхронизация запущена (каждые 10 сек)');
    }

    /**
     * Остановка автоматической синхронизации
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ BankModuleV4: Автосинхронизация остановлена');
        }
    }

    /**
     * Открытие банковского окна
     */
    openBank() {
        console.log('🏦 BankModuleV4: openBank() вызван');
        const modal = document.getElementById('bankModal');
        console.log('🏦 BankModuleV4: modal элемент найден:', !!modal);
        if (modal) {
            console.log('🏦 BankModuleV4: Текущий display:', modal.style.display);
            modal.style.display = 'flex';
            console.log('🏦 BankModuleV4: Новый display установлен:', modal.style.display);
            
            // Добавляем обработчик клика по фону для закрытия
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeBank();
                }
            });
            
            console.log('🏦 BankModuleV4: Банк открыт');
        } else {
            console.error('❌ BankModuleV4: Элемент bankModal не найден!');
        }
    }

    /**
     * Закрытие банковского окна
     */
    closeBank() {
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('🏦 BankModuleV4: Банк закрыт');
        }
    }

    /**
     * Получение текущих данных
     */
    getData() {
        // Если доступен DataStore и он готов, используем его как источник истины
        if (window.dataStore && window.dataStore.isReady()) {
            const dataStoreData = window.dataStore.getBankModuleData();
            console.log('📊 BankModuleV4: Данные получены из DataStore', dataStoreData);
            return dataStoreData;
        }
        
        // Fallback к локальным данным
        console.log('📊 BankModuleV4: Данные получены из локального кэша', this.data);
        return { ...this.data };
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        this.stopAutoSync();
        this.listeners.clear();
        console.log('🗑️ BankModuleV4: Модуль уничтожен');
    }
}

// Глобальный экземпляр
let bankModuleV4 = null;
let isInitializing = false;

/**
 * Получение User ID из localStorage (вспомогательная функция)
 */
function getUserIdFromStorage() {
    // 1. Из localStorage (авторизованный пользователь)
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            return user.id || user._id;
        } catch (e) {
            console.warn('Ошибка парсинга user data:', e);
        }
    }
    
    // 2. Из других источников localStorage
    return localStorage.getItem('userId') || localStorage.getItem('user_id');
}

/**
 * Инициализация банковского модуля v4
 */
async function initBankModuleV4() {
    // Предотвращаем множественную инициализацию
    if (bankModuleV4?.isInitialized) {
        console.log('✅ BankModuleV4: Уже инициализирован');
        return bankModuleV4;
    }
    
    if (isInitializing) {
        console.log('⏳ BankModuleV4: Инициализация уже выполняется');
        return null;
    }

    isInitializing = true;
    
    try {
        console.log('🚀 Инициализация BankModuleV4...');
        
        bankModuleV4 = new BankModuleV4();
        const success = await bankModuleV4.init();
        
        if (success) {
            console.log('✅ BankModuleV4: Инициализация успешна');
            return bankModuleV4;
        } else {
            console.error('❌ BankModuleV4: Инициализация не удалась');
            return null;
        }
    } catch (error) {
        console.error('❌ BankModuleV4: Критическая ошибка:', error);
        return null;
    } finally {
        isInitializing = false;
    }
}

/**
 * Принудительная инициализация с известным Room ID
 */
async function forceInitBankModuleV4(roomId, userId) {
    // Предотвращаем множественную инициализацию
    if (bankModuleV4?.isInitialized) {
        console.log('✅ BankModuleV4: Уже инициализирован');
        return bankModuleV4;
    }
    
    if (isInitializing) {
        console.log('⏳ BankModuleV4: Инициализация уже выполняется');
        return null;
    }

    isInitializing = true;
    
    try {
        console.log('🚀 Принудительная инициализация BankModuleV4...', { roomId, userId });
        
        bankModuleV4 = new BankModuleV4();
        bankModuleV4.roomId = roomId;
        bankModuleV4.userId = userId;
        
        const success = await bankModuleV4.init();
        
        if (success) {
            console.log('✅ BankModuleV4: Принудительная инициализация успешна');
            return bankModuleV4;
        } else {
            console.error('❌ BankModuleV4: Принудительная инициализация не удалась');
            return null;
        }
    } catch (error) {
        console.error('❌ BankModuleV4: Критическая ошибка принудительной инициализации:', error);
        return null;
    } finally {
        isInitializing = false;
    }
}

/**
 * Открытие банка v4
 */
async function openBankV4() {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        bankModuleV4.openBank();
    }
}

/**
 * Закрытие банка v4
 */
function closeBankV4() {
    if (bankModuleV4) {
        bankModuleV4.closeBank();
    }
}

/**
 * Запрос кредита v4
 */
async function requestCreditV4(amount = 1000) {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        return await bankModuleV4.requestCredit(amount);
    }
    
    return false;
}

/**
 * Погашение кредита v4
 */
async function payoffCreditV4() {
    if (!bankModuleV4) {
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        return await bankModuleV4.payoffCredit();
    }
    
    return false;
}

/**
 * Перевод средств v4
 */
async function transferMoneyV4(recipientIndex, amount) {
    console.log('🔄 transferMoneyV4: Начинаем перевод', { recipientIndex, amount });
    
    if (!bankModuleV4) {
        console.log('🔄 transferMoneyV4: bankModuleV4 не инициализирован, пытаемся инициализировать');
        await initBankModuleV4();
    }
    
    if (bankModuleV4) {
        console.log('🔄 transferMoneyV4: bankModuleV4 найден, вызываем transferMoney');
        return await bankModuleV4.transferMoney(recipientIndex, amount);
    }
    
    console.log('❌ transferMoneyV4: bankModuleV4 не найден после инициализации');
    return false;
}

/**
 * Получение данных v4
 */
function getBankDataV4() {
    if (bankModuleV4) {
        return bankModuleV4.getData();
    }
    return null;
}

// Экспорт функций в глобальную область
window.initBankModuleV4 = initBankModuleV4;
window.forceInitBankModuleV4 = forceInitBankModuleV4;
window.openBankV4 = openBankV4;
window.closeBankV4 = closeBankV4;
window.requestCreditV4 = requestCreditV4;
window.payoffCreditV4 = payoffCreditV4;
window.transferMoneyV4 = transferMoneyV4;
window.payoffLoan = (loanType) => {
    if (window.bankModuleV4) {
        window.bankModuleV4.payoffLoan(loanType);
    } else {
        console.error('BankModuleV4 не инициализирован');
    }
};

// Функция для выполнения перевода из формы
async function executeTransferV4() {
    try {
        console.log('🔄 executeTransferV4: Начинаем перевод');
        
        const recipientSelect = document.getElementById('recipientSelect');
        const amountInput = document.getElementById('transferAmount');
        
        console.log('🔍 executeTransferV4: Элементы формы:', { recipientSelect: !!recipientSelect, amountInput: !!amountInput });
        
        if (!recipientSelect || !amountInput) {
            throw new Error('Элементы формы не найдены');
        }
        
        const recipientIndex = parseInt(recipientSelect.value);
        const amount = parseFloat(amountInput.value);
        
        console.log('🔍 executeTransferV4: Данные формы:', { recipientIndex, amount });
        
        if (recipientIndex === null || recipientIndex === undefined || !amount) {
            alert('Пожалуйста, выберите получателя и укажите сумму');
            return;
        }
        
        if (amount <= 0) {
            alert('Сумма должна быть положительной');
            return;
        }
        
        console.log('🔄 executeTransferV4: Вызываем transferMoneyV4');
        const success = await transferMoneyV4(recipientIndex, amount);
        console.log('🔍 executeTransferV4: Результат transferMoneyV4:', success);
        
        if (success) {
            // Очищаем только сумму, оставляем получателя
            amountInput.value = '';
            
            // Принудительно обновляем данные
            if (bankModuleV4) {
                console.log('🔄 executeTransferV4: Обновляем данные');
                await bankModuleV4.loadData(true);
                bankModuleV4.updateUI();
                await bankModuleV4.updateTransfersHistory();
            }
            
            // alert('Перевод выполнен успешно!'); // Убрано по запросу пользователя
        } else {
            alert('Перевод не удался. Проверьте консоль для подробностей.');
        }
        
    } catch (error) {
        console.error('❌ executeTransferV4: Ошибка перевода:', error);
        alert(`Ошибка перевода: ${error.message}`);
    }
}

window.executeTransferV4 = executeTransferV4;

// Функции для кнопок кредита
async function takeCreditV4() {
    try {
        const amountInput = document.getElementById('creditAmount');
        const amount = parseFloat(amountInput?.value) || 1000;
        
        if (amount <= 0) {
            alert('Сумма кредита должна быть положительной');
            return;
        }
        
        const success = await requestCreditV4(amount);
        if (success) {
            alert(`Кредит $${amount} получен успешно!`);
        }
        
    } catch (error) {
        console.error('Ошибка получения кредита:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

async function payoffCreditV4Button() {
    try {
        // Вызываем основную функцию погашения кредита напрямую
        if (!bankModuleV4) {
            await initBankModuleV4();
        }
        
        if (bankModuleV4) {
            const success = await bankModuleV4.payoffCredit();
            if (success) {
                alert('Кредит погашен успешно!');
            }
        } else {
            alert('Банковский модуль не инициализирован');
        }
        
    } catch (error) {
        console.error('Ошибка погашения кредита:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

window.takeCreditV4 = takeCreditV4;
window.payoffCreditV4 = payoffCreditV4Button;
window.getBankDataV4 = getBankDataV4;

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализация BankModuleV4...');
    
    // Отладочная информация
    console.log('🔍 Отладочная информация:');
    console.log('URL:', window.location.href);
    console.log('URL params:', new URLSearchParams(window.location.search));
    console.log('window.currentRoomId:', window.currentRoomId);
    console.log('window.roomId:', window.roomId);
    
    // Пробуем обычную инициализацию
    initBankModuleV4().then(result => {
        if (!result) {
            // Если не удалось, ждем 2 секунды и пробуем принудительную инициализацию
            setTimeout(async () => {
                const roomId = window.gameState?.roomId || window.gameState?.state?.roomId;
                const userId = getUserIdFromStorage(); // Получаем реальный user_id
                
                if (userId) {
                    console.log('🔄 Попытка принудительной инициализации...', { roomId, userId });
                    await forceInitBankModuleV4(roomId, userId);
                } else {
                    console.warn('⚠️ Не удалось получить User ID для принудительной инициализации');
                }
            }, 2000);
        }
    });
});

// Глобальные функции для переключения деталей
window.toggleIncomeDetails = function() {
    if (bankModuleV4) {
        bankModuleV4.toggleIncomeDetails();
    }
};

window.toggleExpensesDetails = function() {
    if (bankModuleV4) {
        bankModuleV4.toggleExpensesDetails();
    }
};

console.log('🏦 BankModuleV4 загружен');
