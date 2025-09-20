export default class PlayersPanel {
    constructor({ state, container }) {
        this.state = state;
        this.container = container;
    }

    init() {
        if (!this.container) {
            return;
        }
        this.state.on('change', (snapshot) => this.render(snapshot));
    }

    render(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.players)) {
            this.container.innerHTML = '';
            return;
        }
        const activeId = snapshot.activePlayerId;
        const currentPlayer = this.state.getCurrentPlayer();
        this.container.innerHTML = '';

        snapshot.players.forEach((player) => {
            const item = document.createElement('div');
            item.className = 'player-card';
            if (player.userId === activeId) {
                item.classList.add('is-active');
            }
            if (currentPlayer && player.userId === currentPlayer.userId) {
                item.classList.add('is-self');
            }

            item.innerHTML = `
                <div class="player-card-header">
                    <span class="player-card-name">${player.name}</span>
                    <span class="player-card-cash">$${Number(player.cash || 0).toLocaleString()}</span>
                </div>
                <div class="player-card-meta">
                    <span>Доход: $${Number(player.passiveIncome || 0).toLocaleString()}</span>
                    <span>Активы: ${player.assets?.length || 0}</span>
                </div>
                <div class="player-card-stats">
                    <span>Ходы: ${player.stats?.turnsTaken || 0}</span>
                    <span>Сделки: ${player.stats?.dealsBought || 0}</span>
                    <span>Передачи: ${player.stats?.dealsTransferred || 0}</span>
                </div>
            `;

            this.container.appendChild(item);
        });
    }
}
