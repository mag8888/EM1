// Проверяем, не загружен ли уже модуль
if (window.StartButton) {
    console.log('StartButton уже загружен, пропускаем повторную загрузку');
} else {

class StartButton {
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
    }

    update(room) {
        const player = room?.currentPlayer;
        const isHost = Boolean(player?.isHost);
        if (!isHost) {
            this.button.style.display = 'none';
            return;
        }

        this.button.style.display = 'block';
        const canStart = Boolean(room?.canStart);
        this.button.disabled = !canStart;
        this.button.textContent = canStart ? 'Старт' : 'Ожидание игроков';
        this.button.classList.toggle('disabled', !canStart);
    }

    async handleClick() {
        if (this.isProcessing || this.button.disabled) {
            return;
        }
        this.isProcessing = true;
        this.button.dataset.loading = 'true';
        try {
            const room = await this.state.startGame();
            if (room?.gameStarted) {
                // redirect handled by orchestrator
            }
        } catch (error) {
            console.error('Не удалось запустить игру:', error);
        } finally {
            this.button.dataset.loading = 'false';
            this.isProcessing = false;
        }
    }
}

window.StartButton = StartButton;

} // Конец блока else для проверки существования модуля
