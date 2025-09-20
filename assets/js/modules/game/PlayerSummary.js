export default class PlayerSummary {
    constructor({ state }) {
        this.state = state;
        this.incomeEl = document.getElementById('incomeValue');
        this.expenseEl = document.getElementById('expenseValue');
        this.paydayEl = document.getElementById('paydayValue');
        this.loanEl = document.getElementById('loanValue');
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
    }

    setText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }
}
