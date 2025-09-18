// Bank Module v3 bootstrap
if (typeof window.BankModule === 'undefined') {
  console.warn('BankModule base not found. Load bank-module-v2 core files first.');
}

let bankModuleInstance = null;

async function ensureBankModalV3() {
  if (!document.getElementById('bankModal')) {
    const resp = await fetch('/bank-module-v3/bank-modal.html', { cache: 'no-store' });
    const html = await resp.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    const el = tmp.firstElementChild;
    if (el) document.body.appendChild(el);
  }
}

async function initBankModuleV3() {
  await ensureBankModalV3();
  if (!window.BankModule) return null;
  bankModuleInstance = new window.BankModule();
  await bankModuleInstance.init();
  return bankModuleInstance;
}

async function openBankV3() {
  if (!bankModuleInstance) {
    await initBankModuleV3();
  }
  if (bankModuleInstance) {
    const result = await bankModuleInstance.openBank();
    
    // Принудительно обновляем кредитные данные при открытии банка
    setTimeout(() => {
      forceUpdateCreditData();
    }, 500);
    
    return result;
  }
  console.error('Failed to initialize bank module');
}

function processTransfer() {
  if (bankModuleInstance) {
    return bankModuleInstance.executeTransfer();
  }
  console.error('Bank module not initialized');
}

function resetTransferForm() {
  if (bankModuleInstance) {
    return bankModuleInstance.resetTransferForm();
  }
  console.error('Bank module not initialized');
}

async function requestCredit() {
  if (!bankModuleInstance) {
    console.log('🔄 BankModule v3: Инициализация модуля для запроса кредита');
    await initBankModuleV3();
  }
  
  if (bankModuleInstance) {
    return bankModuleInstance.requestCredit();
  }
  console.error('Bank module not initialized');
}

function payoffCredit() {
  if (bankModuleInstance) {
    return bankModuleInstance.payoffCredit();
  }
  console.error('Bank module not initialized');
}

// Make functions globally available
window.initBankModuleV3 = initBankModuleV3;
window.openBankV3 = openBankV3;
window.processTransfer = processTransfer;
window.resetTransferForm = resetTransferForm;
window.requestCredit = requestCredit;
window.payoffCredit = payoffCredit;

// Автоинициализация для заполнения сайдбара значениями при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Неблокирующая инициализация; ошибки в консоль
  setTimeout(() => {
    initBankModuleV3().catch(err => console.warn('Bank v3 auto-init failed:', err));
  }, 0);
});

// Удобный вызов: открывает банк и показывает окно ввода суммы кредита
async function openCreditModalV3() {
  if (!bankModuleInstance) {
    await initBankModuleV3();
  }
  const defaultAmount = 1000;
  const input = prompt('Введите сумму кредита (шаг 1000)', String(defaultAmount));
  if (input === null) return; // cancel
  const amount = parseInt(input, 10);
  if (Number.isNaN(amount) || amount <= 0) {
    alert('Введите корректную сумму');
    return;
  }
  if (bankModuleInstance?.requestCredit) {
    // Обновлённый метод поддерживает сумму как параметр (fallback на авто)
    try {
      await bankModuleInstance.requestCredit(amount);
      // Обновляем данные без открытия окна банка
      if (bankModuleInstance.loadBankData) {
        await bankModuleInstance.loadBankData(true);
      }
      // Ненавязчивое уведомление
      try { console.log('✅ Кредит зачислен: ' + amount); } catch (_) {}
    } catch (e) { console.error(e); }
  } else {
    alert('Кредитный модуль недоступен');
  }
}

window.openCreditModalV3 = openCreditModalV3;

// Функции для показа деталей доходов и расходов
function showIncomeDetails() {
  // Получаем данные о доходах из глобальных переменных
  const totalIncome = window.monthlyIncome || 0;
  const playerBusinesses = window.playerBusinesses || {};
  const currentPlayer = window.currentPlayer || 0;
  
  const businesses = playerBusinesses[currentPlayer] || [];
  
  let details = `💰 ДЕТАЛИ ДОХОДОВ\n\n`;
  details += `📊 Общий доход: $${totalIncome.toLocaleString()}\n\n`;
  
  if (businesses.length > 0) {
    details += `🏢 Бизнесы:\n`;
    businesses.forEach((business, index) => {
      const cell = window.getOuterCellDataNew?.(business);
      if (cell) {
        details += `• ${cell.name}: $${(cell.income || 0).toLocaleString()}/мес\n`;
      }
    });
  } else {
    details += `❌ Нет активных источников дохода`;
  }
  
  alert(details);
}

function showExpenseDetails() {
  const monthlyExpenses = window.monthlyExpenses || 0;
  const expensesBreakdown = window.expensesBreakdown || { base: 0, credit: 0 };
  const totalCredit = window.totalCredit || 0;
  const creditPayment = window.creditPayment || 0;
  
  let details = `💸 ДЕТАЛИ РАСХОДОВ\n\n`;
  details += `📊 Общие расходы: $${monthlyExpenses.toLocaleString()}\n\n`;
  details += `📋 Детализация:\n`;
  details += `• Базовые расходы: $${expensesBreakdown.base.toLocaleString()}\n`;
  details += `• Платежи по кредитам: $${expensesBreakdown.credit.toLocaleString()}\n\n`;
  
  if (totalCredit > 0) {
    details += `💳 Кредитная информация:\n`;
    details += `• Общий долг: $${totalCredit.toLocaleString()}\n`;
    details += `• Ежемесячный платеж: $${creditPayment.toLocaleString()}\n`;
  } else {
    details += `✅ Кредитов нет`;
  }
  
  alert(details);
}

// Делаем функции глобально доступными
window.showIncomeDetails = showIncomeDetails;
window.showExpenseDetails = showExpenseDetails;

// Функция для обновления баланса в банковском модуле
async function updateBankBalance(newBalance) {
  if (bankModuleInstance && bankModuleInstance.core) {
    try {
      // Обновляем баланс в ядре банковского модуля
      bankModuleInstance.core.updateBalance(newBalance, 'externalUpdate');
      
      // Обновляем UI
      bankModuleInstance.updateUI();
      
      console.log('✅ Баланс обновлен в банковском модуле:', newBalance);
    } catch (error) {
      console.error('❌ Ошибка обновления баланса в банковском модуле:', error);
    }
  }
}

// Делаем функцию глобально доступной
window.updateBankBalance = updateBankBalance;

// ===== ЦЕНТРАЛИЗОВАННЫЕ БАНКОВСКИЕ ФУНКЦИИ =====

// Глобальные переменные для финансов
let globalCurrentBalance = 0;
let globalMonthlyIncome = 0;
let globalMonthlyExpenses = 0;
let globalTotalCredit = 0;
let globalCreditPayment = 0;
let globalExpensesBreakdown = { base: 0, credit: 0 };

// Функция для добавления средств к балансу
async function addBalance(amount, description) {
    console.log(`💰 addBalance: +$${amount} - ${description}`);
    globalCurrentBalance = (globalCurrentBalance || 0) + amount;
    
    try {
        // Синхронизируем с банковским модулем
        if (window.updateBankBalance) {
            await window.updateBankBalance(globalCurrentBalance);
        }
        
        // Также пытаемся синхронизировать через старый банковский модуль
        if (window.bankModule?.loadBankData) {
            await window.bankModule.loadBankData(true);
        }
    } catch (error) {
        console.error('Ошибка синхронизации баланса:', error);
    }
    
    updateBalanceDisplay();
    syncVariablesToTable(); // Синхронизируем переменные обратно в table.html
}

// Функция для списания средств с баланса
async function subtractBalance(amount, description) {
    console.log(`💸 subtractBalance: -$${amount} - ${description}`);
    globalCurrentBalance = Math.max(0, (globalCurrentBalance || 0) - amount);
    
    try {
        // Синхронизируем с банковским модулем
        if (window.updateBankBalance) {
            await window.updateBankBalance(globalCurrentBalance);
        }
        
        // Также пытаемся синхронизировать через старый банковский модуль
        if (window.bankModule?.loadBankData) {
            await window.bankModule.loadBankData(true);
        }
    } catch (error) {
        console.error('Ошибка синхронизации баланса:', error);
    }
    
    updateBalanceDisplay();
    syncVariablesToTable(); // Синхронизируем переменные обратно в table.html
}

// Функция для взятия кредита
async function takeCredit(amount) {
    if (amount <= 0) return;
    
    console.log(`💰 takeCredit: взят кредит на $${amount}`);
    
    // Добавляем кредит к балансу
    globalTotalCredit += amount;
    globalCurrentBalance += amount;
    
    // Рассчитываем ежемесячный платеж (10% от суммы кредита)
    const newCreditPayment = Math.floor(amount * 0.1);
    globalCreditPayment += newCreditPayment;
    
    // Обновляем расходы и PAYDAY
    globalMonthlyExpenses += newCreditPayment;
    globalExpensesBreakdown.credit += newCreditPayment;
    
    console.log(`💰 Взят кредит: $${amount.toLocaleString()}`);
    console.log(`💸 Ежемесячный платеж: $${newCreditPayment.toLocaleString()}`);
    console.log(`📊 Общий платеж по кредитам: $${globalCreditPayment.toLocaleString()}`);
    console.log(`📊 Новые расходы: $${globalMonthlyExpenses.toLocaleString()}`);
    
    // Синхронизируем с банковским модулем
    try {
        if (window.updateBankBalance) {
            await window.updateBankBalance(globalCurrentBalance);
        }
        
        if (window.bankModule?.loadBankData) {
            await window.bankModule.loadBankData(true);
        }
    } catch (error) {
        console.error('Ошибка синхронизации кредита:', error);
    }
    
    // Обновляем отображение
    updateCreditDisplay();
    updateBalanceDisplay();
    updateFinancesDisplay();
    
    // Показываем уведомление
    alert(`✅ Кредит взят на $${amount.toLocaleString()}\n💸 Ежемесячный платеж: $${newCreditPayment.toLocaleString()}\n📊 Расходы увеличены на $${newCreditPayment.toLocaleString()}`);
}

// Функция для погашения кредита
async function payoffCredit() {
    if (globalTotalCredit <= 0) {
        alert('❌ У вас нет активных кредитов');
        return;
    }
    
    const canAfford = globalCurrentBalance >= globalTotalCredit;
    if (!canAfford) {
        alert(`❌ Недостаточно средств для погашения кредита.\nНужно: $${globalTotalCredit.toLocaleString()}\nУ вас: $${globalCurrentBalance.toLocaleString()}`);
        return;
    }
    
    const confirmPayoff = confirm(`Погасить кредит на $${globalTotalCredit.toLocaleString()}?`);
    if (confirmPayoff) {
        console.log(`💰 payoffCredit: погашение кредита на $${globalTotalCredit}`);
        
        // Списываем кредит с баланса
        globalCurrentBalance -= globalTotalCredit;
        
        // Уменьшаем расходы на сумму платежа
        globalMonthlyExpenses -= globalCreditPayment;
        globalExpensesBreakdown.credit = Math.max(0, globalExpensesBreakdown.credit - globalCreditPayment);
        
        console.log(`✅ Кредит погашен: $${globalTotalCredit.toLocaleString()}`);
        console.log(`📊 Расходы уменьшены на: $${globalCreditPayment.toLocaleString()}`);
        
        // Сбрасываем кредитные переменные
        const oldCreditPayment = globalCreditPayment;
        globalTotalCredit = 0;
        globalCreditPayment = 0;
        
        // Синхронизируем с банковским модулем
        try {
            if (window.updateBankBalance) {
                await window.updateBankBalance(globalCurrentBalance);
            }
            
            if (window.bankModule?.loadBankData) {
                await window.bankModule.loadBankData(true);
            }
        } catch (error) {
            console.error('Ошибка синхронизации погашения кредита:', error);
        }
        
        // Обновляем отображение
        updateCreditDisplay();
        updateBalanceDisplay();
        updateFinancesDisplay();
        
        alert(`✅ Кредит успешно погашен!\n📊 Расходы уменьшены на $${oldCreditPayment.toLocaleString()}`);
    }
}

// Функция для добавления ежемесячного дохода
function addMonthlyIncome(amount, description) {
    globalMonthlyIncome += amount;
    console.log(`📈 Добавлен ежемесячный доход: $${amount.toLocaleString()} - ${description}`);
    console.log(`📊 Общий ежемесячный доход: $${globalMonthlyIncome.toLocaleString()}`);
    
    // Обновляем отображение
    updateFinancesDisplay();
    updateCreditDisplay();
}

// Функция для обновления отображения баланса
function updateBalanceDisplay() {
    // Обновляем отображение баланса в UI
    const balanceElements = document.querySelectorAll('#bankBalance, .balance-amount, #dealCurrentBalance, #currentBalance');
    balanceElements.forEach(el => {
        if (el) {
            el.textContent = `$${globalCurrentBalance.toLocaleString()}`;
        }
    });
    
    // Обновляем глобальную переменную currentBalance для совместимости
    if (typeof window.currentBalance !== 'undefined') {
        window.currentBalance = globalCurrentBalance;
    }
}

// Функция для обновления отображения кредитов
function updateCreditDisplay() {
    // Обновляем отображение кредита
    const currentCreditElement = document.getElementById('currentCredit');
    if (currentCreditElement) {
        currentCreditElement.textContent = `$${globalTotalCredit.toLocaleString()}`;
    }
    
    // Обновляем максимальный кредит
    const maxCreditElement = document.getElementById('maxCredit');
    if (maxCreditElement) {
        const maxCredit = globalMonthlyIncome * 10;
        maxCreditElement.textContent = `$${maxCredit.toLocaleString()}`;
    }
    
    // Обновляем глобальные переменные для совместимости
    if (typeof window.totalCredit !== 'undefined') {
        window.totalCredit = globalTotalCredit;
    }
    if (typeof window.creditPayment !== 'undefined') {
        window.creditPayment = globalCreditPayment;
    }
}

// Функция для обновления отображения финансов
function updateFinancesDisplay() {
    console.log('🔍 updateFinancesDisplay: monthlyIncome =', globalMonthlyIncome, 'monthlyExpenses =', globalMonthlyExpenses);
    
    // Находим элементы расходов и PAYDAY
    const expensesElement = document.getElementById('totalExpenses');
    const paydayElement = document.getElementById('monthlyIncome');
    
    if (expensesElement) {
        expensesElement.textContent = `$${(globalMonthlyExpenses || 0).toLocaleString()}`;
    }
    
    // Детализация расходов
    const baseEl = document.getElementById('expenseBase');
    const creditEl = document.getElementById('expenseCredit');
    if (baseEl) baseEl.textContent = `$${((globalExpensesBreakdown?.base) || 0).toLocaleString()}`;
    if (creditEl) creditEl.textContent = `$${((globalExpensesBreakdown?.credit) || 0).toLocaleString()}`;

    if (paydayElement) {
        // PAYDAY = доход - расходы
        const payday = (globalMonthlyIncome || 0) - (globalMonthlyExpenses || 0);
        paydayElement.textContent = `$${payday.toLocaleString()}/мес`;
        console.log('🔍 PAYDAY calculated:', payday);
        
        // Меняем цвет в зависимости от значения
        if (payday < 0) {
            paydayElement.style.color = '#ef4444'; // Красный для отрицательного
        } else if (payday > 0) {
            paydayElement.style.color = '#10b981'; // Зеленый для положительного
        } else {
            paydayElement.style.color = '#f59e0b'; // Оранжевый для нуля
        }
    }
    
    // Обновляем глобальные переменные для совместимости
    if (typeof window.monthlyIncome !== 'undefined') {
        window.monthlyIncome = globalMonthlyIncome;
    }
    if (typeof window.monthlyExpenses !== 'undefined') {
        window.monthlyExpenses = globalMonthlyExpenses;
    }
    if (typeof window.expensesBreakdown !== 'undefined') {
        window.expensesBreakdown = globalExpensesBreakdown;
    }
}

// Функция для запроса кредита (локальная версия)
function requestCreditLocal() {
    const creditAmountInput = document.getElementById('creditAmount');
    if (!creditAmountInput) return;
    
    const amount = parseInt(creditAmountInput.value) || 0;
    
    if (amount <= 0) {
        alert('❌ Введите сумму кредита');
        return;
    }
    
    if (amount < 1000) {
        alert('❌ Минимальная сумма кредита: $1,000');
        return;
    }
    
    if (amount % 1000 !== 0) {
        alert('❌ Сумма кредита должна быть кратна $1,000');
        return;
    }
    
    // Проверяем максимальный кредит (учитываем уже взятые кредиты)
    const maxCredit = globalMonthlyIncome * 10;
    const availableCredit = maxCredit - globalTotalCredit;
    
    if (amount > availableCredit) {
        alert(`❌ Максимальная доступная сумма кредита: $${availableCredit.toLocaleString()}\n💳 Уже взято: $${globalTotalCredit.toLocaleString()}\n📊 Максимум: $${maxCredit.toLocaleString()}`);
        return;
    }
    
    // Берем кредит
    takeCredit(amount);
    
    // Закрываем модальное окно
    closeCreditModal();
    // Обновляем финансы, чтобы PAYDAY и детализация обновились немедленно
    updateFinancesDisplay();
}

// Функция для взятия кредита на расходы
function takeCreditForExpense() {
    const card = window.currentExpenseCard;
    if (!card) return;
    
    const amount = card.amount;
    if (amount <= 0) return;
    
    // Проверяем максимальный кредит
    const maxCredit = globalMonthlyIncome * 10;
    const availableCredit = maxCredit - globalTotalCredit;
    
    if (amount > availableCredit) {
        alert(`❌ Максимальная доступная сумма кредита: $${availableCredit.toLocaleString()}\n💳 Уже взято: $${globalTotalCredit.toLocaleString()}\n📊 Максимум: $${maxCredit.toLocaleString()}`);
        return;
    }
    
    // Берем кредит
    takeCredit(amount);
    
    // Закрываем модальное окно
    closeExpenseCardModal();
    
    // Показываем уведомление
    alert(`✅ Кредит взят на $${amount.toLocaleString()}\n💸 Расходы оплачены: ${card.name}`);
}

// Функция для инициализации глобальных переменных из table.html
function initializeGlobalVariables() {
    // Синхронизируем глобальные переменные с переменными из table.html
    if (typeof window.currentBalance !== 'undefined') {
        globalCurrentBalance = window.currentBalance;
    }
    if (typeof window.monthlyIncome !== 'undefined') {
        globalMonthlyIncome = window.monthlyIncome;
    }
    if (typeof window.monthlyExpenses !== 'undefined') {
        globalMonthlyExpenses = window.monthlyExpenses;
    }
    if (typeof window.totalCredit !== 'undefined') {
        globalTotalCredit = window.totalCredit;
    }
    if (typeof window.creditPayment !== 'undefined') {
        globalCreditPayment = window.creditPayment;
    }
    if (typeof window.expensesBreakdown !== 'undefined') {
        globalExpensesBreakdown = window.expensesBreakdown;
    }
    
    // Синхронизируем с данными из банковского модуля v2 если доступен
    try {
        if (window.bankModule && window.bankModule.core && window.bankModule.core.state) {
            const bankState = window.bankModule.core.state;
            if (bankState.currentCredit !== undefined) {
                globalTotalCredit = bankState.currentCredit;
                console.log('🔄 Синхронизирован кредит из банковского модуля v2:', globalTotalCredit);
            }
        }
    } catch (e) {
        console.warn('Не удалось синхронизировать с банковским модулем v2:', e);
    }
    
    // Принудительная синхронизация кредитных данных с сервера
    setTimeout(() => {
        syncCreditFromServer();
        updateCreditDisplay();
    }, 1000);
    
    console.log('🔄 Инициализированы глобальные переменные банка:', {
        balance: globalCurrentBalance,
        income: globalMonthlyIncome,
        expenses: globalMonthlyExpenses,
        credit: globalTotalCredit
    });
}

// Функция для синхронизации переменных обратно в table.html
function syncVariablesToTable() {
    if (typeof window.currentBalance !== 'undefined') {
        window.currentBalance = globalCurrentBalance;
    }
    if (typeof window.monthlyIncome !== 'undefined') {
        window.monthlyIncome = globalMonthlyIncome;
    }
    if (typeof window.monthlyExpenses !== 'undefined') {
        window.monthlyExpenses = globalMonthlyExpenses;
    }
    if (typeof window.totalCredit !== 'undefined') {
        window.totalCredit = globalTotalCredit;
    }
    if (typeof window.creditPayment !== 'undefined') {
        window.creditPayment = globalCreditPayment;
    }
    if (typeof window.expensesBreakdown !== 'undefined') {
        window.expensesBreakdown = globalExpensesBreakdown;
    }
}

// Функция для принудительной синхронизации кредитных данных с сервера
function syncCreditFromServer() {
    try {
        if (window.bankModule && window.bankModule.core && window.bankModule.core.state) {
            const bankState = window.bankModule.core.state;
            if (bankState.currentCredit !== undefined) {
                const oldCredit = globalTotalCredit;
                globalTotalCredit = bankState.currentCredit;
                
                if (oldCredit !== globalTotalCredit) {
                    console.log(`🔄 Синхронизация кредита: ${oldCredit} → ${globalTotalCredit}`);
                    updateCreditDisplay();
                    syncVariablesToTable();
                }
                
                return globalTotalCredit;
            }
        }
    } catch (e) {
        console.warn('Ошибка синхронизации кредита с сервера:', e);
    }
    return globalTotalCredit;
}

// Делаем все функции глобально доступными
window.addBalance = addBalance;
window.subtractBalance = subtractBalance;
window.takeCredit = takeCredit;
window.payoffCredit = payoffCredit;
window.addMonthlyIncome = addMonthlyIncome;
window.updateBalanceDisplay = updateBalanceDisplay;
window.updateCreditDisplay = updateCreditDisplay;
window.updateFinancesDisplay = updateFinancesDisplay;
window.requestCreditLocal = requestCreditLocal;
window.takeCreditForExpense = takeCreditForExpense;
window.initializeGlobalVariables = initializeGlobalVariables;
window.syncVariablesToTable = syncVariablesToTable;
window.syncCreditFromServer = syncCreditFromServer;

// Функция для проверки состояния кредитов
function checkCreditStatus() {
    try {
        if (window.bankModule && window.bankModule.core && window.bankModule.core.state) {
            const bankState = window.bankModule.core.state;
            const serverCredit = bankState.currentCredit || 0;
            const localCredit = globalTotalCredit || 0;
            
            console.log('🔍 Проверка состояния кредитов:');
            console.log(`📊 Кредит на сервере: $${serverCredit.toLocaleString()}`);
            console.log(`💻 Кредит локально: $${localCredit.toLocaleString()}`);
            console.log(`📈 Максимальный кредит: $${(globalMonthlyIncome * 10).toLocaleString()}`);
            console.log(`💰 Доступно для кредита: $${((globalMonthlyIncome * 10) - serverCredit).toLocaleString()}`);
            
            if (serverCredit !== localCredit) {
                console.warn('⚠️ Расхождение между серверными и локальными данными!');
                globalTotalCredit = serverCredit;
                updateCreditDisplay();
                syncVariablesToTable();
            }
            
            return {
                serverCredit,
                localCredit,
                maxCredit: globalMonthlyIncome * 10,
                availableCredit: (globalMonthlyIncome * 10) - serverCredit
            };
        }
    } catch (e) {
        console.warn('Ошибка проверки состояния кредитов:', e);
    }
    
    return {
        serverCredit: 0,
        localCredit: globalTotalCredit,
        maxCredit: globalMonthlyIncome * 10,
        availableCredit: (globalMonthlyIncome * 10) - globalTotalCredit
    };
}

window.checkCreditStatus = checkCreditStatus;

// Функция для управления индикатором скролла
function updateScrollIndicator() {
    const historyContainer = document.getElementById('transfersHistory');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    if (!historyContainer || !scrollIndicator) return;
    
    // Проверяем, есть ли скролл
    const hasScroll = historyContainer.scrollHeight > historyContainer.clientHeight;
    
    if (hasScroll) {
        scrollIndicator.style.display = 'flex';
        
        // Скрываем индикатор при прокрутке до конца
        historyContainer.addEventListener('scroll', function() {
            const isAtBottom = historyContainer.scrollTop + historyContainer.clientHeight >= historyContainer.scrollHeight - 5;
            scrollIndicator.style.display = isAtBottom ? 'none' : 'flex';
        });
    } else {
        scrollIndicator.style.display = 'none';
    }
}

// Добавляем функцию в глобальный доступ
window.updateScrollIndicator = updateScrollIndicator;

// Функция для принудительного обновления всех кредитных данных
function forceUpdateCreditData() {
    console.log('🔄 Принудительное обновление кредитных данных...');
    
    // Синхронизируем с банковским модулем v2
    syncCreditFromServer();
    
    // Обновляем отображение
    updateCreditDisplay();
    updateFinancesDisplay();
    
    // Синхронизируем с table.html
    syncVariablesToTable();
    
    // Проверяем состояние
    const status = checkCreditStatus();
    console.log('📊 Обновленное состояние кредитов:', status);
    
    return status;
}

// Добавляем в глобальный доступ
window.forceUpdateCreditData = forceUpdateCreditData;

