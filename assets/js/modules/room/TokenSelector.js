const DEFAULT_TOKENS = [
    { id: 'lion', icon: '🦁', name: 'Лев' },
    { id: 'tiger', icon: '🐯', name: 'Тигр' },
    { id: 'fox', icon: '🦊', name: 'Лиса' },
    { id: 'panda', icon: '🐼', name: 'Панда' },
    { id: 'frog', icon: '🐸', name: 'Лягушка' },
    { id: 'owl', icon: '🦉', name: 'Сова' },
    { id: 'octopus', icon: '🐙', name: 'Осьминог' },
    { id: 'whale', icon: '🐳', name: 'Кит' }
];

export default class TokenSelector {
    constructor({ state, container }) {
        this.state = state;
        this.container = container;
        this.currentTokenId = null;
        this.isProcessing = false;
    }

    init() {
        if (!this.container) {
            return;
        }
        this.state.on('change', (room) => this.render(room));
    }

    render(room) {
        if (!room) {
            return;
        }
        const tokens = Array.isArray(room.availableTokens) && room.availableTokens.length
            ? room.availableTokens
            : DEFAULT_TOKENS;
        const player = room.currentPlayer;
        this.currentTokenId = player?.selectedToken ?? null;
        this.container.innerHTML = '';

        tokens.forEach((token) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'token-item';
            button.dataset.tokenId = token.id;
            button.innerHTML = `
                <span class="token-icon">${token.icon || '🎲'}</span>
                <span class="token-name">${token.name || token.id}</span>
            `;

            const takenByOther = token.taken && token.id !== this.currentTokenId;
            if (takenByOther) {
                button.disabled = true;
                button.classList.add('taken');
            }
            if (token.id === this.currentTokenId) {
                button.classList.add('selected');
            }

            button.addEventListener('click', () => this.handleSelection(token.id));
            this.container.appendChild(button);
        });
    }

    async handleSelection(tokenId) {
        if (this.isProcessing || tokenId === this.currentTokenId) {
            return;
        }
        this.isProcessing = true;
        try {
            await this.state.selectToken(tokenId);
        } catch (error) {
            console.error('Не удалось выбрать фишку:', error);
        } finally {
            this.isProcessing = false;
        }
    }
}
