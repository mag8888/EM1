/**
 * Контроллер ходов игроков для игры "Энергия денег"
 */

export class TurnController {
    constructor({ state, rollButton, endTurnButton, phaseLabel, lastRollLabel, notifier, statusChip, timerLabel }) {
        this.state = state;
        this.rollButton = rollButton;
        this.endTurnButton = endTurnButton;
        this.phaseLabel = phaseLabel;
        this.lastRollLabel = lastRollLabel;
        this.notifier = notifier;
        this.statusChip = statusChip;
        this.timerLabel = timerLabel;
        
        this.turnOrder = [];
        this.currentPlayerIndex = 0;
        this.currentPhase = 'waiting';
        this.turnHistory = [];
        this.isDestroyed = false;
        this.lastTurnIndex = null; // Track which turn we last started timer for
        this.hasRolledThisTurn = false; // Track if player has rolled dice this turn
        
        this.config = {
            turnTimeLimit: 60000,
            maxConsecutiveTurns: 3,
            consecutiveTurns: 0
        };
        
        this.turnTimer = null;
    }

    async init() {
        console.log('🎮 TurnController инициализирован');
        
        this.setupUI();
        this.state?.on('change', (snapshot) => this.updateFromState(snapshot));
    }

    setupUI() {
        if (this.rollButton) {
            this.rollButton.addEventListener('click', () => this.handleRollDice());
        }
        if (this.endTurnButton) {
            this.endTurnButton.addEventListener('click', () => this.handleEndTurn());
        }
    }

    updateFromState(snapshot) {
        if (!snapshot) return;
        
        const currentPlayer = this.state?.getCurrentPlayer();
        const isMyTurn = this.state?.isMyTurn() || false;
        
        this.updateUI(isMyTurn, currentPlayer);

        // Use server time if available, otherwise fallback to client timer
        console.log('🔍 TurnController.updateFromState:', {
            isMyTurn,
            turnTimeLeft: snapshot.turnTimeLeft,
            turnTime: snapshot.turnTime,
            activeIndex: snapshot.activeIndex
        });
        
        if (isMyTurn) {
            // Only start timer if we don't already have one running for this turn
            const shouldStartTimer = !this.turnTimer || this.lastTurnIndex !== snapshot.activeIndex;
            
            if (shouldStartTimer) {
                this.lastTurnIndex = snapshot.activeIndex;
                this.hasRolledThisTurn = false; // Reset dice roll flag for new turn
                
                // Приоритет: серверный таймер, если есть данные
                if (snapshot.turnTimeLeft !== undefined && snapshot.turnTimeLeft > 0) {
                    console.log('🕒 Starting server timer with', snapshot.turnTimeLeft, 'seconds');
                    this.startServerTimer(snapshot.turnTimeLeft);
                } else {
                    // Fallback: клиентский таймер с данными из комнаты
                    const turnTime = snapshot.turnTime || this.state.getTurnTimeSec(120);
                    console.log('🕒 Starting client timer with', turnTime, 'seconds (fallback)');
                    this.startTurnTimer(turnTime);
                }
            }
        } else {
            console.log('🕒 Clearing timers - not my turn');
            this.clearTimers();
            this.lastTurnIndex = null;
            this.hasRolledThisTurn = false; // Reset dice roll flag when not my turn
        }
    }

    updateUI(isMyTurn, currentPlayer) {
        if (this.phaseLabel) {
            this.phaseLabel.textContent = isMyTurn ? 'Ваш ход' : 'Ожидание хода';
        }
        
        if (this.rollButton) {
            // Disable roll button if not my turn OR if already rolled this turn
            this.rollButton.disabled = !isMyTurn || this.hasRolledThisTurn;
        }
        
        if (this.endTurnButton) {
            // Enable end turn button only if it's my turn and I've rolled
            this.endTurnButton.disabled = !isMyTurn || !this.hasRolledThisTurn;
        }
        
        if (this.statusChip) {
            this.statusChip.classList.toggle('is-my-turn', isMyTurn);
        }
    }

    async handleRollDice() {
        if (!this.state) return;
        
        // Check if already rolled this turn
        if (this.hasRolledThisTurn) {
            console.log('🎲 Already rolled this turn, ignoring');
            return;
        }
        
        try {
            this.rollButton.disabled = true;
            this.hasRolledThisTurn = true; // Mark as rolled
            
            const result = await this.state.rollDice();
            
            if (result?.result) {
                const { dice1, dice2, total, isDouble } = result.result;
                if (this.lastRollLabel) {
                    this.lastRollLabel.textContent = dice2 ? `${dice1} + ${dice2} = ${total}` : `${dice1}`;
                }
                
                if (this.notifier) {
                    this.notifier.show(`Выпало: ${total}${isDouble ? ' (дубль!)' : ''}`, { type: 'info' });
                }

                // Двигаем фишку сервером и обновляем состояние
                try {
                    const moveRes = await fetch(`/api/rooms/${this.state.roomId}/move`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': this.state.getUserId() },
                        body: JSON.stringify({ steps: total, user_id: this.state.getUserId() })
                    });
                    const moveData = await moveRes.json();
                    if (moveRes.ok && moveData.state) {
                        // Обновляем состояние игры с сервера
                        this.state.applyState(moveData.state);
                        
                        // Анимируем движение фишки
                        if (Array.isArray(moveData.path)) {
                            const currentUserId = this.state.getUserId();
                            console.log('🎬 Calling animateInnerMove with userId:', currentUserId);
                            window.animateInnerMove?.(moveData.path, 500, currentUserId);
                        }
                        
                        // Обновляем UI после успешного броска и движения
                        const currentPlayer = this.state?.getCurrentPlayer();
                        const isMyTurn = this.state?.isMyTurn() || false;
                        this.updateUI(isMyTurn, currentPlayer);
                        // Жестко фиксируем состояния кнопок после броска
                        if (this.rollButton) this.rollButton.disabled = true;
                        if (this.endTurnButton) this.endTurnButton.disabled = !isMyTurn ? true : false;
                    }
                } catch (error) {
                    console.error('Ошибка движения:', error);
                    // Обновляем UI даже если движение не удалось, но бросок был успешным
                    const currentPlayer = this.state?.getCurrentPlayer();
                    const isMyTurn = this.state?.isMyTurn() || false;
                    this.updateUI(isMyTurn, currentPlayer);
                    if (this.rollButton) this.rollButton.disabled = true;
                    if (this.endTurnButton) this.endTurnButton.disabled = !isMyTurn ? true : false;
                }
            } else {
                // Если результат не получен, но бросок был выполнен, обновляем UI
                const currentPlayer = this.state?.getCurrentPlayer();
                const isMyTurn = this.state?.isMyTurn() || false;
                this.updateUI(isMyTurn, currentPlayer);
                if (this.rollButton) this.rollButton.disabled = true;
                if (this.endTurnButton) this.endTurnButton.disabled = !isMyTurn ? true : false;
            }
        } catch (error) {
            console.error('Ошибка броска кубика:', error);
            if (this.notifier) {
                this.notifier.show('Ошибка броска кубика', { type: 'error' });
            }
            // Reset roll flag on error and re-enable button
            this.hasRolledThisTurn = false;
            this.rollButton.disabled = false;
        }
        // НЕ разблокируем кнопку после успешного хода - только после завершения хода
    }

    async handleEndTurn() {
        if (!this.state) return;
        
        try {
            this.endTurnButton.disabled = true;
            await this.state.endTurn();
            
            if (this.notifier) {
                this.notifier.show('Ход завершен', { type: 'success' });
            }
        } catch (error) {
            console.error('Ошибка завершения хода:', error);
            if (this.notifier) {
                this.notifier.show('Ошибка завершения хода', { type: 'error' });
            }
        } finally {
            // Сбрасываем флаг броска кубика при завершении хода
            this.hasRolledThisTurn = false;
            
            // Обновляем UI через updateUI для правильного состояния кнопок
            const currentPlayer = this.state?.getCurrentPlayer();
            const isMyTurn = this.state?.isMyTurn() || false;
            this.updateUI(isMyTurn, currentPlayer);
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
        
        // Сбрасываем флаг броска кубика для нового игрока
        this.hasRolledThisTurn = false;
        
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

    startTurnTimer(totalSec = 120) {
        this.clearTimers();
        let left = totalSec;
        const tick = () => {
            if (this.timerLabel) this.timerLabel.textContent = `${left}s`;
            left -= 1;
            if (left < 0) {
                this.clearTimers();
                // Server handles auto-end turn, just clear display
                if (this.timerLabel) this.timerLabel.textContent = '0s';
                return;
            }
            this.turnTimer = setTimeout(tick, 1000);
        };
        tick();
    }

    startServerTimer(serverTimeLeft) {
        this.clearTimers();
        let left = Math.max(0, serverTimeLeft);
        const tick = () => {
            if (this.timerLabel) this.timerLabel.textContent = `${left}s`;
            left -= 1;
            if (left < 0) {
                this.clearTimers();
                // Server will auto-end turn, just clear display
                if (this.timerLabel) this.timerLabel.textContent = '0s';
                return;
            }
            this.turnTimer = setTimeout(tick, 1000);
        };
        tick();
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