/**
 * Контроллер ходов игроков для игры "Энергия денег"
 */

export class TurnController {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.turnOrder = [];
        this.currentPlayerIndex = 0;
        this.currentPhase = 'waiting';
        this.turnHistory = [];
        this.isDestroyed = false;
        
        this.config = {
            turnTimeLimit: 60000,
            maxConsecutiveTurns: 3,
            consecutiveTurns: 0
        };
        
        this.turnTimer = null;
    }

    async init() {
        console.log('🎮 TurnController инициализирован');
        
        if (this.gameCore && this.gameCore.eventBus) {
            this.gameCore.eventBus.on('gameStarted', this.onGameStarted.bind(this));
            this.gameCore.eventBus.on('diceRolled', this.onDiceRolled.bind(this));
        } else {
            console.warn('⚠️ TurnController: gameCore или eventBus недоступны');
        }
    }

    initializeTurns(players) {
        if (players.length < 2) {
            throw new Error('Минимум 2 игрока для начала игры');
        }

        this.turnOrder = [...players.map(p => p.id)];
        this.currentPlayerIndex = 0;
        this.currentPhase = 'waiting';
        this.turnHistory = [];

        console.log('🎮 Порядок ходов инициализирован:', this.turnOrder);
        this.gameCore.eventBus.emit('turnsInitialized', {
            turnOrder: this.turnOrder,
            currentPlayer: this.getCurrentPlayer()
        });

        return this.turnOrder;
    }

    startTurn(playerId = null) {
        if (this.isDestroyed) return false;

        const currentPlayer = this.getCurrentPlayer();
        if (playerId && playerId !== currentPlayer?.id) return false;

        if (this.currentPhase !== 'waiting' && this.currentPhase !== 'ending') {
            return false;
        }

        this.currentPhase = 'rolling';
        this.consecutiveTurns = 0;
        this.startTurnTimer();

        const turnData = {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            turnNumber: this.turnHistory.length + 1,
            phase: this.currentPhase,
            startTime: Date.now()
        };

        console.log(`🎮 Начало хода игрока ${currentPlayer.name}`);
        this.gameCore.eventBus.emit('turnStarted', turnData);
        
        return true;
    }

    endTurn(playerId, turnResult = {}) {
        const currentPlayer = this.getCurrentPlayer();
        if (playerId !== currentPlayer?.id) return false;

        const turnData = {
            playerId,
            playerName: currentPlayer.name,
            turnNumber: this.turnHistory.length + 1,
            phase: this.currentPhase,
            result: turnResult,
            duration: Date.now() - (turnResult.startTime || Date.now()),
            completedAt: Date.now()
        };

        this.turnHistory.push(turnData);
        if (this.turnHistory.length > 100) {
            this.turnHistory.shift();
        }

        this.clearTimers();
        this.nextPlayer();

        console.log(`🎮 Ход игрока ${currentPlayer.name} завершен`);
        this.gameCore.eventBus.emit('turnEnded', turnData);
        
        return true;
    }

    nextPlayer() {
        this.currentPhase = 'waiting';
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
        
        const currentPlayer = this.getCurrentPlayer();
        console.log(`🎮 Переход к игроку ${currentPlayer?.name}`);
        
        this.gameCore.eventBus.emit('turnChanged', {
            currentPlayer,
            turnIndex: this.currentPlayerIndex,
            totalTurns: this.turnHistory.length
        });

        return this.currentPlayerIndex;
    }

    getCurrentPlayer() {
        if (this.turnOrder.length === 0) return null;
        
        const playerManager = this.gameCore.getModule('playerManager');
        if (!playerManager) return null;

        const currentPlayerId = this.turnOrder[this.currentPlayerIndex];
        return playerManager.getPlayer(currentPlayerId);
    }

    canRollAgain(isDouble) {
        if (!isDouble) return false;
        if (this.consecutiveTurns >= this.config.maxConsecutiveTurns) return false;
        return true;
    }

    handleRollAgain() {
        if (!this.canRollAgain(true)) return false;

        this.consecutiveTurns++;
        this.currentPhase = 'rolling';

        console.log(`🎮 Повторный ход (${this.consecutiveTurns}/${this.config.maxConsecutiveTurns})`);
        
        this.gameCore.eventBus.emit('rollAgain', {
            consecutiveTurns: this.consecutiveTurns,
            maxConsecutiveTurns: this.config.maxConsecutiveTurns
        });

        return true;
    }

    nextPhase(nextPhase) {
        const validPhases = ['waiting', 'rolling', 'moving', 'acting', 'ending'];
        if (!validPhases.includes(nextPhase)) return false;

        const oldPhase = this.currentPhase;
        this.currentPhase = nextPhase;

        console.log(`🎮 Переход от фазы ${oldPhase} к ${nextPhase}`);
        
        this.gameCore.eventBus.emit('phaseChanged', {
            oldPhase,
            newPhase: nextPhase,
            currentPlayer: this.getCurrentPlayer()
        });

        return true;
    }

    startTurnTimer() {
        this.clearTimers();
        
        this.turnTimer = setTimeout(() => {
            console.log('🎮 Время хода истекло');
            this.handleTurnTimeout();
        }, this.config.turnTimeLimit);
    }

    handleTurnTimeout() {
        const currentPlayer = this.getCurrentPlayer();
        
        this.endTurn(currentPlayer.id, {
            reason: 'timeout',
            automatic: true
        });

        this.gameCore.eventBus.emit('turnTimeout', {
            player: currentPlayer,
            timeoutPhase: this.currentPhase
        });
    }

    clearTimers() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
    }

    getTurnsStats() {
        const totalTurns = this.turnHistory.length;
        
        return {
            totalTurns,
            currentPlayer: this.getCurrentPlayer(),
            currentPhase: this.currentPhase,
            consecutiveTurns: this.consecutiveTurns,
            turnOrder: this.turnOrder
        };
    }

    getTurnsHistory(limit = 10) {
        return this.turnHistory.slice(-limit);
    }

    onGameStarted(data) {
        console.log('🎮 Игра началась, инициализация ходов...');
    }

    onDiceRolled(data) {
        if (this.currentPhase === 'rolling') {
            this.nextPhase('moving');
            
            if (data.result && data.result.isDouble) {
                setTimeout(() => {
                    if (this.canRollAgain(true)) {
                        this.handleRollAgain();
                    }
                }, 1000);
            }
        }
    }

    destroy() {
        this.clearTimers();
        this.turnOrder = [];
        this.turnHistory = [];
        this.isDestroyed = true;
        console.log('🗑️ TurnController уничтожен');
    }
}

export default TurnController;