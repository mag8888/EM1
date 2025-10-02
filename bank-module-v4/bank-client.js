/**
 * Bank Client Module - Только отображение и отправка запросов на сервер
 * Вся логика работает на сервере
 */

class BankClient {
    constructor() {
        console.log('🏦 BankClient: Инициализация клиентского модуля');
        this.roomId = null;
        this.userId = null;
        this.playerName = null;
        this.isInitialized = false;
        this.data = {
            balance: 0,
            income: 0,
            expenses: 0,
            credit: 0,
            maxCredit: 0,
            payday: 0,
            transfers: []
        };
    }

    async init(roomId, userId, playerName) {
        console.log('🏦 BankClient: Инициализация с параметрами', { roomId, userId, playerName });
        
        this.roomId = roomId;
        this.userId = userId;
        this.playerName = playerName;
        this.isInitialized = true;
        
        // Загружаем данные с сервера
        await this.loadData();
        
        console.log('✅ BankClient: Инициализирован');
    }

    async loadData() {
        if (!this.isInitialized) {
            console.warn('⚠️ BankClient: Не инициализирован');
            return;
        }

        try {
            console.log('🔄 BankClient: Загрузка данных с сервера');
            const encodedName = encodeURIComponent(this.playerName || '');
            const encodedRoom = encodeURIComponent(this.roomId || '');
            
            // Загружаем баланс
            const balanceResponse = await fetch(`/api/bank/balance/${encodedName}/${encodedRoom}`);
            if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                this.data.balance = balanceData.amount || 0;
            } else {
                console.warn('⚠️ BankClient: Не удалось загрузить баланс:', balanceResponse.status);
            }

            // Загружаем финансовые данные
            const financialsResponse = await fetch(`/api/bank/financials/${encodedName}/${encodedRoom}`);
            if (financialsResponse.ok) {
                const financialsData = await financialsResponse.json();
                this.data.income = financialsData.income || 0;
                this.data.expenses = financialsData.expenses || 0;
                this.data.payday = financialsData.payday || 0;
            } else {
                console.warn('⚠️ BankClient: Не удалось загрузить финансовые данные:', financialsResponse.status);
            }

            // Загружаем кредитные данные
            const creditResponse = await fetch(`/api/bank/credit/status/${encodedName}/${encodedRoom}`);
            if (creditResponse.ok) {
                const creditData = await creditResponse.json();
                this.data.credit = creditData.credit || 0;
                this.data.maxCredit = creditData.maxCredit || 0;
            } else {
                console.warn('⚠️ BankClient: Не удалось загрузить кредитные данные:', creditResponse.status);
            }

            // Загружаем историю переводов
            const historyResponse = await fetch(`/api/bank/history/${encodedRoom}`);
            if (historyResponse.ok) {
                this.data.transfers = await historyResponse.json();
            } else {
                console.warn('⚠️ BankClient: Не удалось загрузить историю переводов:', historyResponse.status);
            }

            console.log('✅ BankClient: Данные загружены', this.data);
            this.updateUI();
            
        } catch (error) {
            console.error('❌ BankClient: Ошибка загрузки данных:', error);
        }
    }

    updateUI() {
        // Обновляем элементы интерфейса
        const elements = {
            currentBalance: document.getElementById('currentBalance'),
            totalIncome: document.getElementById('totalIncome'),
            totalExpenses: document.getElementById('totalExpenses'),
            monthlyIncome: document.getElementById('monthlyIncome'),
            currentCredit: document.getElementById('currentCredit'),
            maxCredit: document.getElementById('maxCredit'),
            bankBalanceValue: document.getElementById('bankBalanceValue')
        };

        // Обновляем баланс
        if (elements.currentBalance) {
            elements.currentBalance.textContent = `$${this.data.balance.toLocaleString()}`;
        }
        if (elements.bankBalanceValue) {
            elements.bankBalanceValue.textContent = `$${this.data.balance.toLocaleString()}`;
        }

        // Обновляем доходы
        if (elements.totalIncome) {
            elements.totalIncome.textContent = `$${this.data.income.toLocaleString()}`;
        }

        // Обновляем расходы
        if (elements.totalExpenses) {
            elements.totalExpenses.textContent = `$${this.data.expenses.toLocaleString()}`;
        }

        // Обновляем PAYDAY
        if (elements.monthlyIncome) {
            elements.monthlyIncome.textContent = `$${this.data.payday.toLocaleString()}/мес`;
        }

        // Обновляем кредиты
        if (elements.currentCredit) {
            elements.currentCredit.textContent = `$${this.data.credit.toLocaleString()}`;
        }
        if (elements.maxCredit) {
            elements.maxCredit.textContent = `$${this.data.maxCredit.toLocaleString()}`;
        }

        console.log('🎨 BankClient: UI обновлен');
    }

    async openBank() {
        console.log('🏦 BankClient: Открытие банка');
        
        if (!this.isInitialized) {
            console.error('❌ BankClient: Не инициализирован');
            return;
        }

        // Загружаем свежие данные
        await this.loadData();
        
        // Показываем модальное окно
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ BankClient: Банк открыт');
        } else {
            console.error('❌ BankClient: Модальное окно не найдено');
        }
    }

    closeBank() {
        console.log('🏦 BankClient: Закрытие банка');
        
        const modal = document.getElementById('bankModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ BankClient: Банк закрыт');
        }
    }

    async requestCredit(amount) {
        console.log('🏦 BankClient: Запрос кредита', amount);
        
        if (!this.isInitialized) {
            console.error('❌ BankClient: Не инициализирован');
            return false;
        }

        try {
            const response = await fetch('/api/bank/credit/take', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: this.playerName,
                    roomId: this.roomId,
                    amount: amount
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ BankClient: Кредит получен', result);
                await this.loadData(); // Обновляем данные
                return true;
            } else {
                const error = await response.json();
                console.error('❌ BankClient: Ошибка получения кредита', error);
                alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
                return false;
            }
        } catch (error) {
            console.error('❌ BankClient: Ошибка запроса кредита:', error);
            return false;
        }
    }

    async payoffCredit(amount) {
        console.log('🏦 BankClient: Погашение кредита', amount);
        
        if (!this.isInitialized) {
            console.error('❌ BankClient: Не инициализирован');
            return false;
        }

        try {
            const response = await fetch('/api/bank/credit/repay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: this.playerName,
                    roomId: this.roomId,
                    amount: amount
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ BankClient: Кредит погашен', result);
                await this.loadData(); // Обновляем данные
                return true;
            } else {
                const error = await response.json();
                console.error('❌ BankClient: Ошибка погашения кредита', error);
                alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
                return false;
            }
        } catch (error) {
            console.error('❌ BankClient: Ошибка погашения кредита:', error);
            return false;
        }
    }

    async transferMoney(recipientIndex, amount) {
        console.log('🏦 BankClient: Перевод денег', { recipientIndex, amount });
        
        if (!this.isInitialized) {
            console.error('❌ BankClient: Не инициализирован');
            return false;
        }

        // Получаем список игроков из комнаты
        try {
            const roomResponse = await fetch(`/api/rooms/${this.roomId}`);
            if (!roomResponse.ok) {
                throw new Error('Не удалось получить данные комнаты');
            }
            
            const roomData = await roomResponse.json();
            const players = roomData.room.players || [];
            
            if (recipientIndex < 0 || recipientIndex >= players.length) {
                alert('Неверный индекс получателя');
                return false;
            }
            
            const recipient = players[recipientIndex];
            
            const response = await fetch('/api/bank/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: this.playerName,
                    to: recipient.name,
                    amount: amount,
                    roomId: this.roomId
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ BankClient: Перевод выполнен', result);
                await this.loadData(); // Обновляем данные
                return true;
            } else {
                const error = await response.json();
                console.error('❌ BankClient: Ошибка перевода', error);
                alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
                return false;
            }
        } catch (error) {
            console.error('❌ BankClient: Ошибка перевода:', error);
            alert(`Ошибка: ${error.message}`);
            return false;
        }
    }

    getData() {
        return { ...this.data };
    }
}

// Глобальные переменные
let bankClient = null;

// Функции инициализации
async function initBankClient(roomId, userId, playerName) {
    console.log('🏦 Инициализация BankClient', { roomId, userId, playerName });
    
    bankClient = new BankClient();
    await bankClient.init(roomId, userId, playerName);
    window.bankClient = bankClient;
    
    return bankClient;
}

// Глобальные функции для совместимости
window.openBank = function() {
    if (bankClient) {
        bankClient.openBank();
    } else {
        console.error('❌ BankClient не инициализирован');
    }
};

window.closeBank = function() {
    if (bankClient) {
        bankClient.closeBank();
    } else {
        console.error('❌ BankClient не инициализирован');
    }
};

window.requestCredit = function(amount) {
    if (bankClient) {
        return bankClient.requestCredit(amount);
    } else {
        console.error('❌ BankClient не инициализирован');
        return Promise.resolve(false);
    }
};

window.payoffCredit = function(amount) {
    if (bankClient) {
        return bankClient.payoffCredit(amount);
    } else {
        console.error('❌ BankClient не инициализирован');
        return Promise.resolve(false);
    }
};

window.transferMoney = function(recipientIndex, amount) {
    if (bankClient) {
        return bankClient.transferMoney(recipientIndex, amount);
    } else {
        console.error('❌ BankClient не инициализирован');
        return Promise.resolve(false);
    }
};

// Функции для работы с формой перевода
window.processTransfer = function() {
    const recipientSelect = document.getElementById('recipientSelect');
    const amountInput = document.getElementById('transferAmount');
    
    const recipientIndex = parseInt(recipientSelect.value);
    const amount = parseInt(amountInput.value);

    if (!recipientIndex || !amount) {
        alert('Пожалуйста, выберите получателя и укажите сумму');
        return;
    }
    
    transferMoney(recipientIndex, amount).then(success => {
        if (success) {
            resetTransferForm();
            alert('Перевод выполнен успешно!');
        }
    });
};

window.resetTransferForm = function() {
    document.getElementById('transferAmount').value = '';
};

// Инициализация списка получателей
function updateRecipientsList() {
    const select = document.getElementById('recipientSelect');
    if (!select) return;
    
    // Получаем список игроков из глобальной переменной или загружаем
    const players = window.players || [];
    const currentPlayerName = bankClient?.playerName;
    
    select.innerHTML = '<option value="">Выберите получателя</option>';
    
    players.forEach((player, index) => {
        if (player.name !== currentPlayerName) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = player.name;
            select.appendChild(option);
        }
    });
}

console.log('🏦 BankClient загружен');
