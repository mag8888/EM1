export default class UpdateIndicator {
    constructor({ state, element }) {
        this.state = state;
        this.element = element;
    }

    init() {
        if (!this.element) {
            return;
        }
        this.state.on('loading', (isLoading) => this.toggle(isLoading));
        this.state.on('change', () => this.toggle(false));
    }

    toggle(isLoading) {
        if (!this.element) {
            return;
        }
        if (isLoading) {
            this.element.className = 'update-indicator updating';
            this.element.querySelector('.update-label')?.textContent = 'Обновление...';
        } else {
            this.element.className = 'update-indicator ready';
            this.element.querySelector('.update-label')?.textContent = 'Готово';
        }
    }
}
