export default class DreamSelector {
    constructor({ state, container }) {
        this.state = state;
        this.container = container;
        this.currentDreamId = null;
        this.isProcessing = false;
    }

    init() {
        if (!this.container) {
            return;
        }
        this.state.on('change', (room) => this.render(room));
    }

    render(room) {
        if (!room || !Array.isArray(room.availableDreams)) {
            return;
        }
        const player = room.currentPlayer;
        this.currentDreamId = player?.selectedDream ?? null;
        this.container.innerHTML = '';

        room.availableDreams.forEach((dream) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'dream-item';
            if (dream.id === this.currentDreamId) {
                item.classList.add('selected');
            }
            item.dataset.dreamId = dream.id;
            item.innerHTML = `
                <span class="dream-icon">${dream.icon || '🌟'}</span>
                <span class="dream-name">${dream.name}</span>
                <span class="dream-cost">$${Number(dream.cost || 0).toLocaleString()}</span>
            `;
            item.addEventListener('click', () => this.handleSelection(dream.id));
            this.container.appendChild(item);
        });
    }

    async handleSelection(dreamId) {
        if (this.isProcessing || dreamId === this.currentDreamId) {
            return;
        }
        this.isProcessing = true;
        try {
            await this.state.selectDream(dreamId);
        } catch (error) {
            console.error('Не удалось выбрать мечту:', error);
        } finally {
            this.isProcessing = false;
        }
    }
}
