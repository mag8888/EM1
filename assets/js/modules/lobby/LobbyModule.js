/**
 * LobbyModule — управление логикой лобби, реализованной через микромодули.
 */
class LobbyModule {
    constructor({ api = new window.RoomApi(), pollInterval = 10000 } = {}) {
        // Защита от множественной инициализации
        if (window.lobbyModuleInstance) {
            console.warn('LobbyModule already initialized, returning existing instance');
            return window.lobbyModuleInstance;
        }
        
        this.api = api;
        this.pollInterval = pollInterval;
        this.currentUser = null;
        this.rooms = [];
        this.selectedProfession = 'entrepreneur';
        this.selectedRoomId = null;
        this.timers = [];
        this.dom = {};
        
        // Сохраняем экземпляр глобально
        window.lobbyModuleInstance = this;
    }

    /**
     * Инициализация модуля
     */
    async init() {
        // Защита от множественной инициализации
        if (this.initialized) {
            console.warn('LobbyModule already initialized, skipping');
            return;
        }
        
        console.log('=== Инициализация LobbyModule ===');
        console.log('Current URL:', window.location.href);
        console.log('Current domain:', window.location.hostname);
        
        this.cacheDom();
        this.bindEvents();
        this.exposeLegacyBridges();
        
        // Проверяем авторизацию перед загрузкой данных
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.log('❌ No auth token found, redirecting to login');
            this.showError(null, 'Необходимо войти в систему');
            setTimeout(() => {
                window.location.href = '/auth.html';
            }, 2000);
            return;
        }
        
        await this.initializeUser();
        
        // Небольшая задержка для стабилизации localStorage
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Проверяем токен еще раз перед загрузкой данных
        const authToken2 = localStorage.getItem('authToken');
        if (!authToken2) {
            console.log('❌ Auth token lost during initialization, redirecting to login');
            this.showError(null, 'Сессия прервана. Необходимо войти в систему');
            setTimeout(() => {
                window.location.href = '/auth.html';
            }, 2000);
            return;
        }
        
        await this.loadUserStats();
        await this.loadRooms();
        this.scheduleRoomRefresh();
        
        this.initialized = true;
        console.log('=== LobbyModule инициализирован ===');
    }

    exposeLegacyBridges() {
        window.enterRoom = () => {
            const roomId = localStorage.getItem('currentRoomId');
            if (!roomId) {
                alert('Комната не найдена. Выберите или создайте комнату.');
                return;
            }
            window.location.assign(`/room/${roomId}`);
        };

        window.leaveRoom = async () => {
            const roomId = localStorage.getItem('currentRoomId');
            if (!roomId) {
                alert('Вы не находитесь в комнате');
                return;
            }
            try {
                await this.api.leaveRoom(roomId, {});
                localStorage.removeItem('currentRoomId');
                localStorage.removeItem('currentRoom');
                await this.loadRooms();
                alert('Вы покинули комнату');
            } catch (error) {
                alert(error.message || 'Не удалось покинуть комнату');
            }
        };
    }

    cacheDom() {
        this.dom.userName = document.getElementById('userName');
        this.dom.userBalance = document.getElementById('userBalance');
        this.dom.totalGames = document.getElementById('totalGames');
        this.dom.totalWins = document.getElementById('totalWins');
        this.dom.userLevel = document.getElementById('userLevel');
        this.dom.onlinePlayers = document.getElementById('onlinePlayers');
        this.dom.roomsList = document.getElementById('roomsList');
        this.dom.createRoomModal = document.getElementById('createRoomModal');
        this.dom.joinRoomModal = document.getElementById('joinRoomModal');
        this.dom.createRoomForm = document.getElementById('createRoomForm');
        this.dom.createRoomError = document.getElementById('createRoomError');
        this.dom.joinRoomError = document.getElementById('joinRoomError');
        this.dom.joinRoomPassword = document.getElementById('joinRoomPassword');
        this.dom.joinRoomLoading = document.getElementById('joinRoomLoading');
        this.dom.roomName = document.getElementById('roomName');
        this.dom.maxPlayers = document.getElementById('maxPlayers');
        this.dom.turnTime = document.getElementById('turnTime');
        this.dom.assignProfessions = document.getElementById('assignProfessions');
        this.dom.roomPassword = document.getElementById('roomPassword');
        this.dom.createRoomLoading = document.getElementById('createRoomLoading');
    }

    bindEvents() {
        const createBtn = document.querySelector('.create-room-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateRoomModal());
        }

        const quickJoinBtn = document.querySelector('.quick-join-btn');
        if (quickJoinBtn) {
            quickJoinBtn.addEventListener('click', () => this.quickJoin());
        }

        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.loadRooms();
            });
        }

        const logoutBtn = document.querySelector('.logout-btn');
        logoutBtn?.addEventListener('click', () => this.logout());

        if (this.dom.createRoomModal) {
            const closeBtn = this.dom.createRoomModal.querySelector('.close-btn');
            closeBtn?.addEventListener('click', () => this.hideCreateRoomModal());
            const cancelBtn = this.dom.createRoomModal.querySelector('.modal-actions .btn-secondary');
            cancelBtn?.addEventListener('click', () => this.hideCreateRoomModal());
        }

        if (this.dom.joinRoomModal) {
            const closeBtn = this.dom.joinRoomModal.querySelector('.close-btn');
            closeBtn?.addEventListener('click', () => this.hideJoinRoomModal());
            const cancelBtn = this.dom.joinRoomModal.querySelector('.modal-actions .btn-secondary');
            cancelBtn?.addEventListener('click', () => this.hideJoinRoomModal());
        }

        if (this.dom.createRoomForm) {
            this.dom.createRoomForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.createRoom();
            });
        }

        document.querySelectorAll('.profession-card').forEach(card => {
            card.addEventListener('click', () => this.selectProfession(card));
        });

        const joinConfirmBtn = this.dom.joinRoomModal?.querySelector('.modal-actions .btn-primary');
        if (joinConfirmBtn) {
            joinConfirmBtn.addEventListener('click', () => this.confirmJoinRoom());
        }

        const joinCancelBtn = this.dom.joinRoomModal?.querySelector('.modal-actions .btn-secondary');
        joinCancelBtn?.addEventListener('click', () => this.hideJoinRoomModal());
    }

    scheduleRoomRefresh() {
        this.timers.push(setInterval(() => this.loadRooms(false), this.pollInterval));
    }

    async initializeUser() {
        console.log('=== Инициализация пользователя ===');
        
        // Сначала попробуем загрузить пользователя из localStorage
        const savedUser = localStorage.getItem('user');
        const authToken = localStorage.getItem('authToken');
        
        console.log('Saved user:', savedUser ? 'Found' : 'Not found');
        console.log('Auth token:', authToken ? 'Found' : 'Not found');
        console.log('All localStorage keys:', Object.keys(localStorage));
        
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                console.log('Loaded user from localStorage:', this.currentUser);
                this.updateUserDisplay();
            } catch (error) {
                console.error('Failed to parse saved user data:', error);
            }
        }
        
        // Если нет токена, не пытаемся валидировать
        if (!authToken) {
            console.log('No auth token found, skipping validation');
            console.log('This might be the cause of the logout issue');
            return;
        }
        
        console.log('Validating user with token...');
        const userValid = await this.validateAndUpdateUser();
        if (!userValid) {
            console.log('User validation failed, logging out');
            this.logout();
            return;
        }
        console.log('User validation successful');
        this.updateUserDisplay();
    }

    updateUserDisplay() {
        if (!this.currentUser) {
            console.log('No current user data available');
            return;
        }
        
        console.log('Updating user display with data:', this.currentUser);
        console.log('User name fields:', {
            first_name: this.currentUser.first_name,
            last_name: this.currentUser.last_name,
            username: this.currentUser.username,
            email: this.currentUser.email
        });
        
        if (this.dom.userName) {
            let displayName = 'Игрок';
            
            if (this.currentUser.first_name && this.currentUser.last_name) {
                displayName = `${this.currentUser.first_name} ${this.currentUser.last_name}`.trim();
            } else if (this.currentUser.first_name) {
                displayName = this.currentUser.first_name;
            } else if (this.currentUser.username) {
                displayName = this.currentUser.username;
            } else if (this.currentUser.email) {
                displayName = this.currentUser.email.split('@')[0];
            }
            
            console.log('Setting display name to:', displayName);
            this.dom.userName.textContent = displayName;
        }
        if (this.dom.userBalance && typeof this.currentUser.balance === 'number') {
            this.dom.userBalance.textContent = `$${this.currentUser.balance.toLocaleString()}`;
        }
    }

    async validateAndUpdateUser() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('No auth token found');
                return false;
            }
            
            // Используем RoomApi для консистентности
            const data = await this.roomApi.request('/api/user/profile');
            if (!data.id && data._id) {
                data.id = data._id;
            }
            if (!data.id) {
                console.log('Invalid user data received');
                return false;
            }
            localStorage.setItem('user', JSON.stringify(data));
            this.currentUser = data;
            return true;
        } catch (error) {
            console.error('Failed to validate user', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            return false;
        }
    }

    async loadUserStats() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('No auth token found, skipping user stats');
                return;
            }
            
            const response = await fetch('/api/user/stats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.log('User stats not available');
                return;
            }
            const stats = await response.json();
            if (this.dom.totalGames) this.dom.totalGames.textContent = stats.games_played ?? stats.gamesPlayed ?? 0;
            if (this.dom.totalWins) this.dom.totalWins.textContent = stats.wins_count ?? stats.totalWins ?? 0;
            if (this.dom.userLevel) this.dom.userLevel.textContent = stats.level ?? 1;
        } catch (error) {
            console.error('Failed to load user stats', error);
            // Не блокируем загрузку страницы из-за ошибки статистики
            // Но если это ошибка авторизации, то перенаправляем
            if (error.message && (error.message.includes('401') || error.message.includes('Сессия истекла'))) {
                console.log('Authorization error in loadUserStats, redirecting to login');
                this.showError(null, 'Сессия истекла. Необходимо войти в систему');
                setTimeout(() => {
                    window.location.href = '/auth.html';
                }, 2000);
            }
        }
    }

    async loadRooms(showLoading = true) {
        console.log('=== Загрузка комнат ===');
        console.log('Auth token present:', !!localStorage.getItem('authToken'));
        
        // Дополнительная проверка токена перед загрузкой
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.log('❌ No auth token found in loadRooms, redirecting to login');
            this.showError(null, 'Сессия истекла. Необходимо войти в систему');
            setTimeout(() => {
                window.location.href = '/auth.html';
            }, 2000);
            return;
        }
        
        try {
            if (showLoading) {
                this.setRoomsLoading(true);
            }
            const result = await this.api.listRooms();
            console.log('Rooms loaded successfully:', result);
            this.rooms = Array.isArray(result) ? result : [];
            this.renderRooms();
        } catch (error) {
            console.error('Failed to load rooms', error);
            console.log('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            // Проверяем, если это ошибка авторизации, то перенаправляем
            if (error.message && (error.message.includes('401') || error.message.includes('Сессия истекла'))) {
                console.log('Authorization error, redirecting to login');
                this.showError(this.dom.createRoomError, 'Сессия истекла. Необходимо войти в систему');
                setTimeout(() => {
                    window.location.href = '/auth.html';
                }, 2000);
            } else {
                this.showError(this.dom.createRoomError, error.message || 'Не удалось загрузить комнаты');
            }
        } finally {
            if (showLoading) {
                this.setRoomsLoading(false);
            }
        }
    }

    setRoomsLoading(isLoading) {
        const container = document.querySelector('.rooms-list');
        if (!container) return;
        container.classList.toggle('loading', isLoading);
    }

    renderRooms() {
        if (!this.dom.roomsList) return;
        if (!this.rooms.length) {
            this.dom.roomsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🛋️</div>
                    <div class="empty-title">Пока нет активных комнат</div>
                    <div class="empty-text">Создайте свою комнату или подождите, пока другие игроки создадут комнаты.</div>
                </div>`;
            return;
        }

        this.dom.roomsList.innerHTML = this.rooms.map(room => this.renderRoomCard(room)).join('');
        this.bindRoomActions();
    }

    renderRoomCard(room) {
        const isInRoom = room.players?.some(player => player.userId === this.currentUser?.id || player.user_id?.toString() === this.currentUser?.id?.toString());
        const players = room.players || [];
        const freeSlots = Math.max(0, (room.maxPlayers || 4) - players.length);
        const statusClass = this.getRoomStatusClass(room);
        const statusText = this.getRoomStatusText(room);
        const createdAt = room.createdAt || room.created_at;
        const canJoin = !room.gameStarted && players.length < (room.maxPlayers || 4);
        const joinLabel = isInRoom ? 'Войти в комнату' : (canJoin ? 'Присоединиться' : 'Комната заполнена');

        return `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-header">
                    <div>
                        <div class="room-title">${room.name}</div>
                        <div class="room-meta">Создатель: ${room.creatorName || 'Неизвестно'}</div>
                    </div>
                    <div class="room-status ${statusClass}">${statusText}</div>
                </div>
                <div class="room-details">
                    <div class="detail-item">
                        <span>👥 Игроков:</span>
                        <span>${players.length}/${room.maxPlayers || 4}</span>
                    </div>
                    <div class="detail-item">
                        <span>⏱️ Ход:</span>
                        <span>${room.turnTime || 3} мин</span>
                    </div>
                    <div class="detail-item">
                        <span>🕐 Создана:</span>
                        <span>${createdAt ? new Date(createdAt).toLocaleString('ru-RU') : '-'}</span>
                    </div>
                </div>
                <div class="room-players">
                    ${players.map(player => `
                        <div class="player-avatar ${player.userId?.toString() === this.currentUser?.id ? 'current-user' : ''}" title="${player.name || player.user_name || 'Игрок'}">
                            ${(player.name || player.user_name || 'И')[0].toUpperCase()}
                        </div>
                    `).join('')}
                    ${Array(freeSlots).fill('<div class="empty-slot"></div>').join('')}
                </div>
                <div class="room-actions">
                    <button class="join-btn ${isInRoom ? 'in-room' : ''}"
                        data-room-id="${room.id}"
                        ${(!canJoin && !isInRoom) ? 'disabled' : ''}>
                        ${joinLabel}
                    </button>
                </div>
            </div>
        `;
    }

    getRoomStatusClass(room) {
        if (room.players?.length >= (room.maxPlayers || 4)) return 'status-full';
        if (room.gameStarted || room.game_started) return 'status-playing';
        return 'status-waiting';
    }

    getRoomStatusText(room) {
        if (room.players?.length >= (room.maxPlayers || 4)) return 'Заполнена';
        if (room.gameStarted || room.game_started) return 'Игра идет';
        return 'Ожидание';
    }

    bindRoomActions() {
        this.dom.roomsList?.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', (event) => this.handleRoomCardClick(event, card.dataset.roomId));
        });
        this.dom.roomsList?.querySelectorAll('.join-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.joinRoom(button.dataset.roomId);
            });
        });
    }

    handleRoomCardClick(event, roomId) {
        this.selectedRoomId = roomId;
        this.dom.roomsList?.querySelectorAll('.room-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.roomId === roomId);
        });
    }

    showCreateRoomModal() {
        if (!this.dom.createRoomModal) return;
        this.dom.createRoomModal.style.display = 'flex';
        this.dom.createRoomForm?.reset();
        this.dom.createRoomError.textContent = '';
        this.dom.createRoomError.style.display = 'none';
        document.querySelectorAll('.profession-card').forEach(card => card.classList.remove('selected'));
        const firstCard = document.querySelector('.profession-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            this.selectedProfession = firstCard.dataset.profession;
        }
        setTimeout(() => this.dom.roomName?.focus(), 100);
    }

    hideCreateRoomModal() {
        if (this.dom.createRoomModal) {
            this.dom.createRoomModal.style.display = 'none';
        }
    }

    showJoinRoomModal(roomId) {
        if (!this.dom.joinRoomModal) return;
        this.selectedRoomId = roomId;
        this.dom.joinRoomError.textContent = '';
        this.dom.joinRoomError.style.display = 'none';
        this.dom.joinRoomPassword.value = '';
        this.dom.joinRoomLoading.style.display = 'none';
        this.dom.joinRoomModal.style.display = 'flex';
    }

    hideJoinRoomModal() {
        if (this.dom.joinRoomModal) {
            this.dom.joinRoomModal.style.display = 'none';
        }
    }

    selectProfession(element) {
        document.querySelectorAll('.profession-card').forEach(card => card.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedProfession = element.dataset.profession;
    }

    async createRoom() {
        if (!this.dom.createRoomForm) return;
        const name = this.dom.roomName?.value?.trim();
        if (!name) {
            return this.showError(this.dom.createRoomError, 'Введите название комнаты');
        }
        const payload = {
            name,
            max_players: this.dom.maxPlayers?.value || 4,
            turn_time: this.dom.turnTime?.value || 3,
            assign_professions: this.dom.assignProfessions?.checked,
            password: this.dom.roomPassword?.value || null,
            profession: this.selectedProfession
        };

        try {
            this.showLoader(this.dom.createRoomLoading, true);
            const room = await this.api.createRoom(payload);
            if (room?.id) {
                localStorage.setItem('currentRoomId', room.id);
                localStorage.setItem('currentRoom', JSON.stringify(room));
                try {
                    const joinResult = await this.api.joinRoom(room.id, {});
                    if (joinResult?.room) {
                        localStorage.setItem('currentRoom', JSON.stringify(joinResult.room));
                    }
                } catch (joinError) {
                    console.warn('Auto-join after creation failed:', joinError);
                }
                this.hideCreateRoomModal();
                window.location.assign(`/room/${room.id}`);
                return;
            }
            this.showError(this.dom.createRoomError, 'Комната создана, но отсутствует идентификатор');
        } catch (error) {
            this.showError(this.dom.createRoomError, error.message || 'Не удалось создать комнату');
        } finally {
            this.showLoader(this.dom.createRoomLoading, false);
            await this.loadRooms(false);
        }
    }

    async joinRoom(roomId) {
        if (!roomId) return;
        const room = this.rooms.find(r => r.id === roomId);
        try {
            const result = await this.api.joinRoom(roomId, {});
            localStorage.setItem('currentRoomId', roomId);
            const roomData = result?.room || room || null;
            if (roomData) {
                localStorage.setItem('currentRoom', JSON.stringify(roomData));
            }
            window.location.assign(`/room/${roomId}`);
        } catch (error) {
            if (room?.requiresPassword) {
                this.showJoinRoomModal(roomId);
                this.showError(this.dom.joinRoomError, error.message || 'Требуется пароль комнаты');
            } else {
                this.showJoinRoomModal(roomId);
                this.showError(this.dom.joinRoomError, error.message || 'Не удалось присоединиться к комнате');
                this.showLoader(this.dom.joinRoomLoading, false);
            }
        }
    }

    async confirmJoinRoom() {
        if (!this.selectedRoomId) return;
        try {
            this.showLoader(this.dom.joinRoomLoading, true);
            const password = this.dom.joinRoomPassword?.value;
            const result = await this.api.joinRoom(this.selectedRoomId, password ? { password } : {});
            localStorage.setItem('currentRoomId', this.selectedRoomId);
            const room = result?.room || this.rooms.find(r => r.id === this.selectedRoomId);
            if (room) {
                localStorage.setItem('currentRoom', JSON.stringify(room));
            }
            window.location.assign(`/room/${this.selectedRoomId}`);
        } catch (error) {
            this.showError(this.dom.joinRoomError, error.message || 'Не удалось присоединиться к комнате');
        } finally {
            this.showLoader(this.dom.joinRoomLoading, false);
        }
    }

    async quickJoin() {
        const available = this.rooms.find(room => !room.gameStarted && (room.players?.length || 0) < (room.maxPlayers || 4));
        if (!available) {
            return this.showError(this.dom.createRoomError, 'Нет доступных комнат. Создайте свою!');
        }
        try {
            const password = available.requiresPassword ? this.dom.joinRoomPassword?.value : null;
            const result = await this.api.joinRoom(available.id, password ? { password } : {});
            localStorage.setItem('currentRoomId', available.id);
            const room = result?.room || available;
            if (room) {
                localStorage.setItem('currentRoom', JSON.stringify(room));
            }
            window.location.assign(`/room/${available.id}`);
        } catch (error) {
            this.showError(this.dom.createRoomError, error.message || 'Не удалось присоединиться к комнате');
        }
    }

    showLoader(element, show) {
        if (!element) return;
        element.style.display = show ? 'flex' : 'none';
    }

    showError(target, message) {
        if (!target) {
            // Если target null, показываем alert
            if (message) {
                alert(message);
            }
            return;
        }
        target.textContent = message;
        target.style.display = message ? 'block' : 'none';
    }

    logout() {
        console.log('=== Logout called ===');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        console.log('Cleared localStorage, redirecting to auth');
        window.location.href = '/auth.html';
    }
}

// Экспортируем в window для глобального доступа
window.LobbyModule = LobbyModule;
