export default class ReadyButton {
    constructor({ state, button }) {
        this.state = state;
        this.button = button;
        this.isProcessing = false;
    }

    init() {
        if (!this.button) {
            return;
        }
        this.button.addEventListener('click', () => this.handleClick());
        this.state.on('change', (room) => this.update(room));
        this.state.on('loading', (isLoading) => {
            if (isLoading) {
                this.button.classList.add('loading');
            } else {
                this.button.classList.remove('loading');
            }
        });
    }

    update(room) {
        const player = room?.currentPlayer;
        if (!player) {
            this.button.disabled = true;
            this.button.textContent = 'Ожидание...';
            return;
        }
        const hasDream = Boolean(player.selectedDream);
        const hasToken = Boolean(player.selectedToken);
        const ready = Boolean(player.isReady);

        if (!hasDream || !hasToken) {
            this.button.disabled = true;
            this.button.textContent = hasDream ? 'Выберите фишку' : 'Выберите мечту';
            this.button.classList.add('disabled');
        } else {
            this.button.disabled = false;
            this.button.classList.remove('disabled');
            this.button.textContent = ready ? 'Отменить готовность' : 'Готов';
        }

        if (ready) {
            this.button.classList.add('ready');
        } else {
            this.button.classList.remove('ready');
        }
    }

    async handleClick() {
        if (this.isProcessing || this.button.disabled) {
            return;
        }
        this.isProcessing = true;
        this.button.dataset.loading = 'true';
        try {
            await this.state.toggleReady();
        } catch (error) {
            console.error('Не удалось изменить статус готовности:', error);
        } finally {
            this.button.dataset.loading = 'false';
            this.isProcessing = false;
        }
    }
}
