import GameState from './GameState.js';
import NotificationCenter from './NotificationCenter.js';
import PlayersPanel from './PlayersPanel.js';
import TurnController from './TurnController.js';
import DealController from './DealController.js';
import AssetsManager from './AssetsManager.js';
import PlayerSummary from './PlayerSummary.js';

class GameModule {
    constructor({ roomId }) {
        this.roomId = roomId;
        this.state = new GameState({ roomId });
        this.notifier = new NotificationCenter(document.getElementById('gameToast'));
        this.modules = [];
    }

    async init() {
        this.setupModules();
        this.setupListeners();
        this.setupUiShortcuts();
        try {
            await this.state.init();
        } catch (error) {
            this.notifier.show(error.message || 'Не удалось загрузить игру', { type: 'error' });
        }
    }

    setupModules() {
        const playersPanel = new PlayersPanel({
            state: this.state,
            container: document.getElementById('playersPanelList')
        });
        playersPanel.init();
        this.modules.push(playersPanel);

        const turnController = new TurnController({
            state: this.state,
            rollButton: document.getElementById('rollDiceBtn'),
            endTurnButton: document.getElementById('endTurnBtn'),
            phaseLabel: document.getElementById('turnState'),
            lastRollLabel: document.getElementById('lastRollValue'),
            notifier: this.notifier,
            statusChip: document.getElementById('turnStatusChip')
        });
        turnController.init();
        this.modules.push(turnController);

        const dealController = new DealController({
            state: this.state,
            modalElement: document.getElementById('dealModal'),
            notifier: this.notifier
        });
        dealController.init();
        this.modules.push(dealController);

        const assetsManager = new AssetsManager({
            state: this.state,
            container: document.getElementById('assetsList'),
            notifier: this.notifier
        });
        assetsManager.init();
        this.modules.push(assetsManager);

        const playerSummary = new PlayerSummary({ state: this.state });
        playerSummary.init();
        this.modules.push(playerSummary);
    }

    setupListeners() {
        this.state.on('error', (error) => {
            this.notifier.show(error.message || 'Произошла ошибка', { type: 'error' });
        });
    }

    setupUiShortcuts() {
        const bankBtn = document.getElementById('bankButton');
        bankBtn?.addEventListener('click', () => {
            const v = Date.now();
            window.open(`/game-board/bank-module.html?v=${v}`, 'bankModule', 'width=720,height=840,scrollbars=yes');
        });

        const dealsBtn = document.getElementById('dealsButton');
        dealsBtn?.addEventListener('click', () => {
            const v = Date.now();
            window.open(`/game-board/deals-module.html?v=${v}`, 'dealsModule', 'width=960,height=820,scrollbars=yes');
        });

        const leaveBtn = document.getElementById('leaveRoomBtn');
        leaveBtn?.addEventListener('click', () => {
            window.location.assign(`/room/${this.roomId}`);
        });

        const user = this.state.api?.getCurrentUser?.();
        if (user) {
            const nameEl = document.getElementById('username');
            const avatarEl = document.getElementById('user-avatar');
            if (nameEl) {
                nameEl.textContent = user.first_name || user.username || user.email || 'Игрок';
            }
            if (avatarEl) {
                avatarEl.textContent = (user.first_name || user.username || 'U').slice(0, 1).toUpperCase();
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.GameModule = GameModule;
}

export default GameModule;
