export default class PlayerSummary {
    constructor({ state }) {
        this.state = state;
        this.incomeEl = document.getElementById('incomeValue');
        this.expenseEl = document.getElementById('expenseValue');
        this.paydayEl = document.getElementById('paydayValue');
        this.loanEl = document.getElementById('loanValue');
        this.professionNameEl = document.getElementById('professionName');
        this.professionDescriptionEl = document.getElementById('professionDescription');
        this.professionIconEl = document.getElementById('professionIcon');
        this.professionSalaryEl = document.getElementById('professionSalary');
        this.professionExpensesEl = document.getElementById('professionExpenses');
        this.professionCashflowEl = document.getElementById('professionCashflow');
    }

    init() {
        this.state.on('change', () => this.render());
    }

    render() {
        const player = this.state.getCurrentPlayer();
        if (!player) {
            return;
        }
        const passiveIncome = Number(player.passiveIncome || 0);
        this.setText(this.incomeEl, `$${passiveIncome.toLocaleString()}`);
        this.setText(this.paydayEl, `$${passiveIncome.toLocaleString()}/мес`);
        // Расходы и кредиты пока не синхронизированы с сервером
        this.setText(this.expenseEl, '$0');
        this.setText(this.loanEl, '$0');

        const profession = player.profession || {};
        if (this.professionNameEl) {
            this.professionNameEl.textContent = profession.name || '—';
        }
        if (this.professionDescriptionEl) {
            this.professionDescriptionEl.textContent = profession.description || '—';
        }
        if (this.professionIconEl) {
            this.professionIconEl.textContent = profession.icon || '🚀';
        }
        if (this.professionSalaryEl) {
            this.professionSalaryEl.textContent = `$${Number(profession.salary || 0).toLocaleString()}`;
        }
        if (this.professionExpensesEl) {
            this.professionExpensesEl.textContent = `$${Number(profession.expenses || 0).toLocaleString()}`;
        }
        if (this.professionCashflowEl) {
            this.professionCashflowEl.textContent = `$${Number(profession.cashFlow || 0).toLocaleString()}`;
        }
    }

    setText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }
}
