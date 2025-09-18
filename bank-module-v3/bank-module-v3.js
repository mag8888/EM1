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
    return bankModuleInstance.openBank();
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

