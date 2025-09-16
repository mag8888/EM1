// Bank Module v3 bootstrap
if (typeof window.BankModule === 'undefined') {
  console.warn('BankModule base not found. Load bank-module-v2 core files first.');
}

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
  const instance = new window.BankModule();
  await instance.init();
  return instance;
}

async function openBankV3() {
  const m = window.getBankModule ? window.getBankModule() : null;
  if (m) return m.openBank();
  const created = await initBankModuleV3();
  return created?.openBank();
}

window.initBankModuleV3 = initBankModuleV3;
window.openBankV3 = openBankV3;

