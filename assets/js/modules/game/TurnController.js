export default class TurnController {
    constructor({ state, rollButton, endTurnButton, phaseLabel, lastRollLabel, notifier, statusChip }) {
        this.state = state;
        this.rollButton = rollButton;
        this.endTurnButton = endTurnButton;
        this.phaseLabel = phaseLabel;
        this.lastRollLabel = lastRollLabel;
        this.notifier = notifier;
        this.statusChip = statusChip;
        this.isRolling = false;
    }

    init() {
        this.state.on('change', (snapshot) => this.update(snapshot));
        this.state.on('rolled', (payload) => this.handleRollResult(payload));
        this.rollButton?.addEventListener('click', () => this.handleRollClick());
        this.endTurnButton?.addEventListener('click', () => this.handleEndTurn());
    }

    update(snapshot) {
        if (!snapshot) {
            return;
        }
        const myTurn = this.state.isMyTurn();
        const phase = snapshot.phase || 'awaiting_roll';
        const activePlayer = snapshot.players?.find(player => player.userId === snapshot.activePlayerId);
        if (this.statusChip) {
            this.statusChip.classList.toggle('is-my-turn', myTurn);
        }
        if (this.phaseLabel) {
            if (myTurn) {
                this.phaseLabel.textContent = `Ваш ход — ${this.describePhase(phase)}`;
            } else if (activePlayer) {
                this.phaseLabel.textContent = `Ход игрока: ${activePlayer.name}`;
            } else {
                this.phaseLabel.textContent = 'Ожидание игроков';
            }
        }

        if (this.rollButton) {
            if (myTurn && phase === 'awaiting_roll') {
                this.rollButton.disabled = false;
                this.rollButton.textContent = 'Бросить кубик';
            } else {
                this.rollButton.disabled = true;
                this.rollButton.textContent = myTurn ? 'Действие недоступно' : 'Ожидаем ход';
            }
        }

        if (this.endTurnButton) {
            const canEnd = myTurn && (phase === 'awaiting_end' || phase === 'awaiting_roll');
            this.endTurnButton.disabled = !canEnd;
        }

        if (this.lastRollLabel) {
            this.lastRollLabel.textContent = snapshot.lastRoll
                ? `${snapshot.lastRoll.values.join(' + ')} = ${snapshot.lastRoll.total}`
                : '—';
        }
    }

    describePhase(phase) {
        switch (phase) {
            case 'awaiting_roll':
                return 'бросьте кубик';
            case 'awaiting_deal_choice':
                return 'выберите сделку';
            case 'awaiting_deal_resolution':
                return 'примите решение по сделке';
            case 'awaiting_end':
                return 'завершите ход';
            default:
                return phase;
        }
    }

    async handleRollClick() {
        if (this.isRolling || this.rollButton?.disabled) {
            return;
        }
        this.isRolling = true;
        this.rollButton.classList.add('loading');
        try {
            await this.state.rollDice();
        } catch (error) {
            this.notifier?.show(error.message || 'Не удалось бросить кубик', { type: 'error' });
        } finally {
            this.rollButton.classList.remove('loading');
            this.isRolling = false;
        }
    }

    handleRollResult(payload) {
        if (!payload || !payload.roll || !this.notifier) {
            return;
        }
        const { roll } = payload;
        this.notifier.show(`Вы бросили ${roll.values.join(' + ')} = ${roll.total}`, { type: 'success' });
    }

    async handleEndTurn() {
        if (this.endTurnButton?.disabled) {
            return;
        }
        this.endTurnButton.classList.add('loading');
        try {
            await this.state.endTurn();
        } catch (error) {
            this.notifier?.show(error.message || 'Не удалось завершить ход', { type: 'error' });
        } finally {
            this.endTurnButton.classList.remove('loading');
        }
    }
}
