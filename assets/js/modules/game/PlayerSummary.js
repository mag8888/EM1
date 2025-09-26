export default class PlayerSummary {
    constructor({ state }) {
        this.state = state;
        this.incomeEl = document.getElementById('incomeValue');
        this.passiveIncomeEl = document.getElementById('passiveIncomeValue');
        this.expenseEl = document.getElementById('expenseValue');
        this.paydayEl = document.getElementById('paydayValue');
        this.loanEl = document.getElementById('loanValue');
        this.professionNameEl = document.getElementById('professionName');
        this.professionDescriptionEl = document.getElementById('professionDescription');
        this.professionIconEl = document.getElementById('professionIcon');
        this.professionSalaryEl = document.getElementById('professionSalary');
        this.professionExpensesEl = document.getElementById('professionExpenses');
        this.professionPassiveEl = document.getElementById('professionPassive');
        this.professionCashflowEl = document.getElementById('professionCashflow');
        this.assetsButton = document.getElementById('assetsButton');
    }

    init() {
        this.state.on('change', () => this.render());
        
        // Добавляем обработчик для кнопки активов
        if (this.assetsButton) {
            this.assetsButton.addEventListener('click', () => {
                const playerId = this.state.getUserId();
                if (playerId && window.assetsCatalog) {
                    window.assetsCatalog.show(playerId);
                }
            });
        }
    }

    render() {
        const player = this.state.getCurrentPlayer();
        if (!player) {
            return;
        }

        // Используем данные из банковского модуля как единый источник истины
        let bankData = null;
        if (window.bankModuleV4) {
            bankData = window.bankModuleV4.getData();
        }

        if (bankData) {
            // Данные из банковского модуля
            this.setText(this.incomeEl, `$${(bankData.income || 0).toLocaleString()}`);
            if (this.passiveIncomeEl) {
                this.passiveIncomeEl.textContent = `$${(bankData.passiveIncome || 0).toLocaleString()}`;
            }
            this.setText(this.expenseEl, `$${(bankData.expenses || 0).toLocaleString()}`);
            this.setText(this.loanEl, `$${(bankData.credit || 0).toLocaleString()}`);
            this.setText(this.paydayEl, `$${(bankData.payday || 0).toLocaleString()}/мес`);
        } else {
            // Fallback к старой логике, если банковский модуль недоступен
            const passiveIncome = Number(player.passiveIncome || 0);
            const salary = Number(player.profession?.salary || 0);
            const totalIncome = salary + passiveIncome;
            this.setText(this.incomeEl, `$${totalIncome.toLocaleString()}`);
            
            if (this.passiveIncomeEl) {
                this.passiveIncomeEl.textContent = `$${passiveIncome.toLocaleString()}`;
            }
            
            const baseExpenses = Number(player.profession?.expenses || 0);
            const creditExpense = Number(window._creditExpense || 0);
            const expenses = baseExpenses + creditExpense;
            this.setText(this.expenseEl, `$${expenses.toLocaleString()}`);
            this.setText(this.loanEl, '$0');
            
            const payday = totalIncome - expenses;
            this.setText(this.paydayEl, `$${payday.toLocaleString()}/мес`);
        }

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
        if (this.professionPassiveEl) {
            const passiveIncomeValue = bankData ? (bankData.passiveIncome || 0) : passiveIncome;
            this.professionPassiveEl.textContent = `$${passiveIncomeValue.toLocaleString()}`;
        }
        if (this.professionCashflowEl) {
            const paydayValue = bankData ? bankData.payday : (totalIncome - expenses);
            this.professionCashflowEl.textContent = `$${paydayValue.toLocaleString()}`;
        }

        // Условие перехода на большой круг: пассивный доход > расходы
        // Здесь только отображение; сам переход запустим отдельным контроллером
        const passiveIncomeValue = bankData ? (bankData.passiveIncome || 0) : passiveIncome;
        const expensesValue = bankData ? bankData.expenses : expenses;
        const canGoOuter = passiveIncomeValue > expensesValue;
        if (canGoOuter) {
            console.log('✅ Условие перехода на большой круг выполнено');
        }
    }

    setText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }
}
