/**
 * Game Board Service - Модуль для управления игровым полем и фишками игроков
 */

class GameBoardService {
    constructor() {
        console.log('🎲 GameBoardService: Инициализация игрового поля');
        this.boardSize = 40; // Количество клеток на поле
        this.players = []; // Массив игроков с их позициями
        this.currentPlayerIndex = 0; // Индекс текущего игрока
        this.diceValue = 0; // Значение кубика
    }

    /**
     * Инициализировать игровое поле
     */
    initializeBoard(players) {
        console.log('🎲 GameBoardService: Инициализация поля для игроков', players.length);
        
        this.players = players.map((player, index) => ({
            id: player._id || player.user_id,
            name: player.name,
            position: 0, // Начальная позиция
            color: this.getPlayerColor(index),
            token: this.getPlayerToken(index),
            money: 3000, // Стартовые деньги
            properties: [],
            isActive: true
        }));

        this.currentPlayerIndex = 0;
        console.log('🎲 GameBoardService: Поле инициализировано', this.players);
    }

    /**
     * Получить цвет игрока
     */
    getPlayerColor(index) {
        const colors = [
            '#FF6B6B', // Красный
            '#4ECDC4', // Бирюзовый
            '#45B7D1', // Синий
            '#96CEB4', // Зеленый
            '#FFEAA7', // Желтый
            '#DDA0DD', // Фиолетовый
            '#FFB347', // Оранжевый
            '#98D8C8'  // Мятный
        ];
        return colors[index % colors.length];
    }

    /**
     * Получить символ фишки игрока
     */
    getPlayerToken(index) {
        const tokens = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '🔶', '🔷'];
        return tokens[index % tokens.length];
    }

    /**
     * Бросить кубик
     */
    rollDice() {
        this.diceValue = Math.floor(Math.random() * 6) + 1;
        console.log('🎲 GameBoardService: Выпало', this.diceValue);
        return this.diceValue;
    }

    /**
     * Переместить игрока
     */
    movePlayer(playerIndex, steps) {
        if (playerIndex < 0 || playerIndex >= this.players.length) {
            throw new Error('Неверный индекс игрока');
        }

        const player = this.players[playerIndex];
        const oldPosition = player.position;
        player.position = (player.position + steps) % this.boardSize;
        
        console.log('🎲 GameBoardService: Игрок перемещен', {
            player: player.name,
            from: oldPosition,
            to: player.position,
            steps: steps
        });

        return {
            player: player.name,
            oldPosition: oldPosition,
            newPosition: player.position,
            steps: steps,
            passedGo: this.checkPassedGo(oldPosition, player.position)
        };
    }

    /**
     * Проверить, прошел ли игрок через старт
     */
    checkPassedGo(oldPosition, newPosition) {
        return newPosition < oldPosition;
    }

    /**
     * Передать ход следующему игроку
     */
    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        console.log('🎲 GameBoardService: Ход передан игроку', this.players[this.currentPlayerIndex].name);
        return this.currentPlayerIndex;
    }

    /**
     * Получить текущего игрока
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Получить всех игроков
     */
    getPlayers() {
        return this.players;
    }

    /**
     * Обновить деньги игрока
     */
    updatePlayerMoney(playerIndex, amount, reason = '') {
        if (playerIndex < 0 || playerIndex >= this.players.length) {
            throw new Error('Неверный индекс игрока');
        }

        const player = this.players[playerIndex];
        player.money += amount;
        
        console.log('🎲 GameBoardService: Деньги обновлены', {
            player: player.name,
            amount: amount,
            newBalance: player.money,
            reason: reason
        });

        return player.money;
    }

    /**
     * Получить информацию о позиции игрока
     */
    getPlayerPosition(playerIndex) {
        if (playerIndex < 0 || playerIndex >= this.players.length) {
            return null;
        }
        return {
            position: this.players[playerIndex].position,
            color: this.players[playerIndex].color,
            token: this.players[playerIndex].token
        };
    }

    /**
     * Получить статистику игры
     */
    getGameStats() {
        return {
            totalPlayers: this.players.length,
            currentPlayer: this.currentPlayerIndex,
            currentPlayerName: this.players[this.currentPlayerIndex].name,
            diceValue: this.diceValue,
            boardSize: this.boardSize
        };
    }
}

module.exports = GameBoardService;
