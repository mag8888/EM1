export default class PlayersList {
    constructor({ container, state }) {
        this.container = container;
        this.state = state;
    }

    init() {
        if (!this.container) {
            return;
        }
        this.state.on('change', (room) => this.render(room));
    }

    render(room) {
        if (!room || !Array.isArray(room.players)) {
            this.container.innerHTML = '';
            return;
        }
        const dreamsById = new Map((room.availableDreams || []).map((dream) => [dream.id, dream]));
        const tokensById = new Map((room.availableTokens || []).map((token) => [token.id, token]));
        const currentUserId = room.currentPlayer?.userId;

        this.container.innerHTML = '';
        room.players.forEach((player) => {
            const item = document.createElement('div');
            item.className = 'player-item';
            if (player.userId === currentUserId) {
                item.classList.add('current-user');
            }

            const avatar = document.createElement('div');
            avatar.className = 'player-avatar';
            avatar.textContent = (player.name || 'Игрок').slice(0, 1).toUpperCase();

            const info = document.createElement('div');
            info.className = 'player-info';

            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = player.name + (player.userId === currentUserId ? ' (Вы)' : '');
            info.appendChild(name);

            if (player.selectedToken) {
                const token = tokensById.get(player.selectedToken);
                if (token) {
                    const tokenRow = document.createElement('div');
                    tokenRow.className = 'player-token';
                    tokenRow.innerHTML = `<span>${token.icon || '🎯'}</span><span>${token.name || token.id}</span>`;
                    info.appendChild(tokenRow);
                }
            }

            if (player.selectedDream) {
                const dream = dreamsById.get(player.selectedDream) || null;
                if (dream) {
                    const dreamRow = document.createElement('div');
                    dreamRow.className = 'player-dream';
                    dreamRow.innerHTML = `<span class="dream-icon">${dream.icon || '🌟'}</span><span class="dream-name">${dream.name}</span>`;
                    info.appendChild(dreamRow);
                }
            }

            const status = document.createElement('div');
            status.className = 'player-status';
            if (room.gameStarted) {
                status.textContent = 'В игре';
                status.classList.add('status-ready');
            } else if (player.isReady) {
                status.textContent = 'Готов';
                status.classList.add('status-ready');
            } else {
                status.textContent = player.userId === currentUserId ? 'Выберите мечту и фишку' : 'Ожидает';
                status.classList.add('status-waiting');
            }

            item.appendChild(avatar);
            item.appendChild(info);
            item.appendChild(status);
            this.container.appendChild(item);
        });
    }
}
