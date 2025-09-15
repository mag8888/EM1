/**
 * ИНТЕГРАЦИЯ МОДУЛЯ БАНКА С ОСНОВНЫМ ПРОЕКТОМ
 * 
 * Этот файл содержит функции-обертки для интеграции модуля банка
 * с существующим кодом без изменения основной логики
 */

// Глобальная переменная для модуля банка
let bankModule = null;

/**
 * ИНИЦИАЛИЗАЦИЯ МОДУЛЯ БАНКА
 * Вызывается при инициализации игры
 */
async function initBankModule() {
    try {
        console.log('🏦 Инициализация модуля банка...');
        
        // Создаем экземпляр модуля банка
        bankModule = new BankModule();
        
        // Инициализируем модуль
        await bankModule.init();
        
        console.log('✅ Модуль банка инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации модуля банка:', error);
    }
}

/**
 * ОБНОВЛЕНИЕ ЛОКАЛЬНОГО БАЛАНСА
 * Обертка для совместимости с существующим кодом
 */
function updateLocalBalance(amount, description = '') {
    if (bankModule) {
        return bankModule.updateLocalBalance(amount, description);
    } else {
        console.warn('Bank module not initialized, using fallback');
        // Fallback для совместимости
        currentBalance += amount;
        window.lastBalanceUpdate = Date.now();
        console.log(`💰 Fallback обновление баланса: ${currentBalance} (${description})`);
        return currentBalance;
    }
}

/**
 * ЗАГРУЗКА ДАННЫХ БАНКА
 * Обертка для совместимости с существующим кодом
 */
async function loadBankData(forceUpdate = false) {
    if (bankModule) {
        await bankModule.loadFromServer(forceUpdate);
    } else {
        console.warn('Bank module not initialized, using fallback');
        // Fallback для совместимости
        await loadBankDataFallback(forceUpdate);
    }
}

/**
 * FALLBACK ДЛЯ ЗАГРУЗКИ ДАННЫХ БАНКА
 * Используется если модуль банка не инициализирован
 */
async function loadBankDataFallback(forceUpdate = false) {
    try {
        // Проверяем, нужно ли загружать данные
        if (!forceUpdate && !shouldLoadBankData()) {
            console.log('⏭️ Пропускаем загрузку данных - недавно обновлялись');
            return;
        }
        
        const roomId = getRoomIdFromURL();
        if (!roomId) {
            console.log('Room ID not found, skipping bank data load');
            return;
        }
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            console.log('User not found, skipping bank data load');
            return;
        }
        
        const response = await fetch(`/api/rooms/${roomId}?user_id=${user.id}`);
        if (!response.ok) {
            console.log(`Failed to load room data: HTTP ${response.status}`);
            return;
        }
        
        const data = await response.json();
        
        // Обновляем баланс
        const playerIndex = data.players.findIndex(p => p.user_id === user.id);
        
        if (playerIndex !== -1) {
            let newBalance = currentBalance; // Сохраняем текущий баланс по умолчанию
            
            // Сначала пробуем новую структуру (game_data.player_balances)
            if (data.game_data?.player_balances) {
                newBalance = data.game_data.player_balances[playerIndex] || 0;
                console.log('Balance loaded from game_data.player_balances:', newBalance, 'for player', playerIndex);
            } 
            // Если нет, используем старую структуру (players[].balance)
            else if (data.players[playerIndex]?.balance !== undefined) {
                newBalance = data.players[playerIndex].balance;
                console.log('Balance loaded from players[].balance:', newBalance, 'for player', playerIndex);
            } else {
                console.log('No balance data found, playerIndex:', playerIndex, 'player data:', data.players[playerIndex]);
            }
            
            // Обновляем баланс только если:
            // 1. Новый баланс больше текущего (пополнение)
            // 2. Текущий баланс равен 0 (первая загрузка)
            // 3. Прошло больше 5 секунд с последнего обновления (защита от сброса после переводов)
            // 4. Принудительное обновление (forceUpdate = true)
            const now = Date.now();
            const timeSinceLastUpdate = now - (window.lastBalanceUpdate || 0);
            
            if (newBalance > currentBalance || currentBalance === 0 || timeSinceLastUpdate > 5000 || forceUpdate) {
                currentBalance = newBalance;
                window.lastBalanceUpdate = now;
                console.log('Balance updated to:', currentBalance, 'timeSinceLastUpdate:', timeSinceLastUpdate + 'ms', 'forceUpdate:', forceUpdate);
            } else {
                console.log('Keeping current balance:', currentBalance, '(new:', newBalance, ')', 'timeSinceLastUpdate:', timeSinceLastUpdate + 'ms', 'forceUpdate:', forceUpdate);
            }
        } else {
            console.log('Player not found in room, user.id:', user.id, 'players:', data.players.map(p => p.user_id));
        }
        
        // Обновляем историю переводов
        if (data.game_data?.transfers_history) {
            transfersHistory = data.game_data.transfers_history;
        }
        
        // Загружаем финансовые данные
        await loadFinancialData(roomId, playerIndex);
        
        // Обновляем UI
        updateBankUI();
        
        console.log('=== BANK DATA LOADED ===');
        console.log('Balance:', currentBalance);
        console.log('Income:', totalIncome);
        console.log('Expenses:', totalExpenses);
        console.log('Cash Flow:', monthlyIncome);
        console.log('Credit:', currentCredit);
        
    } catch (error) {
        console.error('Error loading bank data:', error);
    }
}

/**
 * ПРОВЕРКА НУЖНОСТИ ЗАГРУЗКИ ДАННЫХ
 * Fallback для совместимости
 */
function shouldLoadBankData() {
    const now = Date.now();
    const timeSinceLastUpdate = now - (window.lastBalanceUpdate || 0);
    
    // Загружаем данные только если:
    // 1. Прошло больше 5 секунд с последнего обновления
    // 2. Или это первая загрузка (lastBalanceUpdate не установлен)
    return timeSinceLastUpdate > 5000 || !window.lastBalanceUpdate;
}

/**
 * СИНХРОНИЗАЦИЯ С СЕРВЕРОМ
 * Вызывается после локальных изменений
 */
async function syncBankWithServer() {
    if (bankModule) {
        await bankModule.syncWithServer();
    } else {
        console.warn('Bank module not initialized, using fallback');
        await loadBankData(true);
    }
}

/**
 * ОТКРЫТИЕ БАНКА
 * Обертка для совместимости
 */
async function openBank() {
    console.log('=== OPENING BANK MODAL ===');
    
    try {
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        // Загружаем актуальные данные
        await loadBankData(true); // Принудительное обновление при открытии банка
        
        // Открываем модальное окно
        const bankModal = document.getElementById('bankModal');
        if (bankModal) {
            bankModal.style.display = 'flex';
            bankModal.classList.add('show');
            
            // Загружаем получателей
            await loadRecipients();
            
            // Обновляем UI
            updateBankUI();
            
            console.log('=== BANK MODAL OPENED SUCCESSFULLY ===');
        } else {
            throw new Error('Bank modal not found');
        }
        
    } catch (error) {
        console.error('Error opening bank:', error);
        showError('Ошибка при открытии банка');
    } finally {
        hideLoadingIndicator();
    }
}

/**
 * ЗАКРЫТИЕ БАНКА
 * Обертка для совместимости
 */
function closeBankModal() {
    const bankModal = document.getElementById('bankModal');
    if (bankModal) {
        bankModal.classList.remove('show');
        setTimeout(() => {
            bankModal.style.display = 'none';
        }, 300);
    }
}

// Экспортируем функции для глобального использования
window.initBankModule = initBankModule;
window.updateLocalBalance = updateLocalBalance;
window.loadBankData = loadBankData;
window.shouldLoadBankData = shouldLoadBankData;
window.syncBankWithServer = syncBankWithServer;
window.openBank = openBank;
window.closeBankModal = closeBankModal;
