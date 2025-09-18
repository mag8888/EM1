/**
 * Game Board UI - Модуль для улучшения визуализации игрового поля
 */

class GameBoardUI {
    constructor() {
        console.log('🎨 GameBoardUI: Инициализация UI игрового поля');
        this.playerTokens = new Map();
        this.animations = new Map();
        // Отслеживаем расположение фишек: playerIndex -> position (номер клетки 1..24/44)
        this.tokenPositions = new Map();
        // К каким игрокам привязана каждая клетка: position -> [playerIndex, ...]
        this.positionToPlayers = new Map();
    }

    /**
     * Создать улучшенную фишку игрока
     */
    createPlayerToken(playerIndex, playerName, color, position = 0) {
        const tokenId = `player${playerIndex}`;
        
        // Удаляем старую фишку если есть
        const existingToken = document.getElementById(tokenId);
        if (existingToken) {
            existingToken.remove();
        }

        // Создаем новую фишку
        const token = document.createElement('div');
        token.id = tokenId;
        token.className = 'player-token enhanced-token';
        token.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 16px;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        // Добавляем номер игрока
        const number = document.createElement('div');
        number.textContent = playerIndex + 1;
        number.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        `;
        token.appendChild(number);

        // Добавляем эффект свечения при наведении
        token.addEventListener('mouseenter', () => {
            token.style.transform = 'scale(1.2)';
            token.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        });

        token.addEventListener('mouseleave', () => {
            token.style.transform = 'scale(1)';
            token.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        });

        // Добавляем информацию о игроке при клике
        token.addEventListener('click', () => {
            this.showPlayerInfo(playerIndex, playerName, color);
        });

        // Позиционируем фишку
        this.positionToken(token, position, playerIndex);
        
        // Добавляем на игровое поле
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            gameBoard.appendChild(token);
        }

        this.playerTokens.set(playerIndex, token);
        console.log('🎨 GameBoardUI: Создана фишка для игрока', { playerIndex, playerName, color });
        
        return token;
    }

    /**
     * Позиционировать фишку на поле
     */
    positionToken(token, position, playerIndex = null) {
        // Предпочитаем малый круг (внутренние клетки) при позиционировании
        const targetCell = document.querySelector(`.inner-square[data-cell="${position}"]`) ||
                           document.querySelector(`[data-cell="${position}"]`);
        if (!targetCell) {
            console.warn('🎨 GameBoardUI: Клетка не найдена', position);
            return;
        }

        const cellRect = targetCell.getBoundingClientRect();
        const boardRect = document.querySelector('.game-board').getBoundingClientRect();
        
        // 15% смещение для нескольких фишек на одной клетке
        const offset = cellRect.width * 0.15;
        let offsetX = 0;
        let offsetY = 0;

        // Определяем индекс игрока и регистрируем его на позиции
        const idxFromId = token.id && token.id.startsWith('player')
            ? parseInt(token.id.replace('player', ''), 10)
            : null;
        const pIndex = (playerIndex !== null && playerIndex !== undefined) ? playerIndex : idxFromId;

        if (pIndex !== null && !Number.isNaN(pIndex)) {
            const prevPos = this.tokenPositions.get(pIndex);
            if (prevPos !== undefined && this.positionToPlayers.has(prevPos)) {
                // Удаляем из предыдущей клетки
                const arr = this.positionToPlayers.get(prevPos).filter(v => v !== pIndex);
                this.positionToPlayers.set(prevPos, arr);
            }

            if (!this.positionToPlayers.has(position)) this.positionToPlayers.set(position, []);
            const playersHere = this.positionToPlayers.get(position);
            if (!playersHere.includes(pIndex)) playersHere.push(pIndex);
            this.tokenPositions.set(pIndex, position);

            const localIndex = playersHere.indexOf(pIndex); // 0..N-1
            const angle = (localIndex % 8) * (Math.PI / 4); // шаг 45°
            offsetX = Math.cos(angle) * offset;
            offsetY = Math.sin(angle) * offset;
        }

        const x = cellRect.left - boardRect.left + cellRect.width / 2 + offsetX;
        const y = cellRect.top - boardRect.top + cellRect.height / 2 + offsetY;

        token.style.left = `${x - 20}px`;
        token.style.top = `${y - 20}px`;
    }

    /**
     * Анимированное перемещение фишки
     */
    async moveToken(playerIndex, fromPosition, toPosition, steps) {
        const token = this.playerTokens.get(playerIndex);
        if (!token) {
            console.error('🎨 GameBoardUI: Фишка не найдена', playerIndex);
            return;
        }

        console.log('🎨 GameBoardUI: Перемещение фишки', { playerIndex, fromPosition, toPosition, steps });

        // Анимация перемещения по шагам
        for (let i = 1; i <= steps; i++) {
            const currentPosition = (fromPosition + i) % 40; // 40 клеток на поле
            await this.animateStep(token, currentPosition, i === steps);
            
            // Небольшая задержка между шагами
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    /**
     * Анимация одного шага
     */
    async animateStep(token, position, isLastStep = false) {
        return new Promise((resolve) => {
            const targetCell = document.querySelector(`.inner-square[data-cell="${position}"]`) ||
                               document.querySelector(`[data-cell="${position}"]`);
            if (!targetCell) {
                resolve();
                return;
            }

            const cellRect = targetCell.getBoundingClientRect();
            const boardRect = document.querySelector('.game-board').getBoundingClientRect();
            
            // 15% смещение как и при позиционировании
            const offset = cellRect.width * 0.15;
            let offsetX = 0;
            let offsetY = 0;
            const pIndex = token.id && token.id.startsWith('player')
                ? parseInt(token.id.replace('player', ''), 10)
                : null;
            if (pIndex !== null && !Number.isNaN(pIndex)) {
                if (!this.positionToPlayers.has(position)) this.positionToPlayers.set(position, []);
                const playersHere = this.positionToPlayers.get(position);
                if (!playersHere.includes(pIndex)) playersHere.push(pIndex);
                const localIndex = playersHere.indexOf(pIndex);
                const angle = (localIndex % 8) * (Math.PI / 4);
                offsetX = Math.cos(angle) * offset;
                offsetY = Math.sin(angle) * offset;
            }

            const x = cellRect.left - boardRect.left + cellRect.width / 2 + offsetX;
            const y = cellRect.top - boardRect.top + cellRect.height / 2 + offsetY;

            // Анимация перемещения
            token.style.transition = 'all 0.3s ease';
            token.style.left = `${x - 20}px`;
            token.style.top = `${y - 20}px`;

            // Эффект прыжка на последнем шаге
            if (isLastStep) {
                token.style.transform = 'scale(1.3)';
                setTimeout(() => {
                    token.style.transform = 'scale(1)';
                }, 150);
            }

            setTimeout(resolve, 300);
        });
    }

    /**
     * Показать информацию о игроке
     */
    showPlayerInfo(playerIndex, playerName, color) {
        // Создаем модальное окно с информацией о игроке
        const modal = document.createElement('div');
        modal.className = 'player-info-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            max-width: 300px;
        `;

        content.innerHTML = `
            <h3 style="color: ${color}; margin-bottom: 10px;">${playerName}</h3>
            <p>Игрок #${playerIndex + 1}</p>
            <p>Позиция: <span id="playerPosition">0</span></p>
            <p>Баланс: <span id="playerBalance">$0</span></p>
            <button onclick="this.closest('.player-info-modal').remove()" 
                    style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Закрыть
            </button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Обновить позицию фишки
     */
    updateTokenPosition(playerIndex, position) {
        const token = this.playerTokens.get(playerIndex);
        if (token) {
            this.positionToken(token, position);
        }
    }

    /**
     * Добавить эффект к фишке
     */
    addTokenEffect(playerIndex, effect) {
        const token = this.playerTokens.get(playerIndex);
        if (!token) return;

        switch (effect) {
            case 'glow':
                token.style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.8)';
                break;
            case 'pulse':
                token.style.animation = 'pulse 1s infinite';
                break;
            case 'shake':
                token.style.animation = 'shake 0.5s ease-in-out';
                break;
        }
    }

    /**
     * Убрать эффект с фишки
     */
    removeTokenEffect(playerIndex) {
        const token = this.playerTokens.get(playerIndex);
        if (!token) return;

        token.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        token.style.animation = 'none';
    }

    /**
     * Получить все фишки
     */
    getAllTokens() {
        return Array.from(this.playerTokens.values());
    }

    /**
     * Очистить все фишки
     */
    clearAllTokens() {
        this.playerTokens.forEach(token => token.remove());
        this.playerTokens.clear();
    }
}

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .enhanced-token {
        transition: all 0.3s ease;
    }
    
    .enhanced-token:hover {
        transform: scale(1.2);
        z-index: 101;
    }
`;
document.head.appendChild(style);

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameBoardUI;
} else {
    window.GameBoardUI = GameBoardUI;
}
