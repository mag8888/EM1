const roomState = require('../services/room-state');

function registerRoomsModule({ app, db, auth, isDbReady }) {
    const {
        listRooms,
        getRoomById,
        createRoomInstance,
        addPlayerToRoom,
        removePlayerFromRoom,
        assignDreamToPlayer,
        assignTokenToPlayer,
        toggleReadyStatus,
        sanitizeRoom,
        initializeGame,
        MIN_PLAYERS,
        forceSaveRoom
    } = roomState;

    const authenticate = auth?.authenticateToken;

    const ensureAuth = (req, res, next) => {
        if (!authenticate) {
            return res.status(401).json({ success: false, message: 'Авторизация недоступна' });
        }
        if (!req.headers.authorization) {
            return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        }
        return authenticate(req, res, next);
    };

    const ensureRoomLoaded = async (roomId) => {
        let room = getRoomById(roomId);
        if (!room && isDbReady?.()) {
            const snapshot = await db.getRoomWithPlayers(roomId);
            if (snapshot?.room) {
                room = createRoomInstance({
                    id: snapshot.room.id,
                    name: snapshot.room.name,
                    creator: {},
                    maxPlayers: snapshot.room.max_players,
                    turnTime: snapshot.room.turn_time,
                    assignProfessions: snapshot.room.assign_professions,
                    register: true
                });
                room.creatorId = snapshot.room.creator_id;
                room.status = snapshot.room.status;
                room.gameStarted = Boolean(snapshot.room.game_started);
                room.createdAt = snapshot.room.created_at;
                room.updatedAt = snapshot.room.updated_at;
                room.lastActivity = snapshot.room.last_activity || Date.now();
                
                // Очищаем данные игроков
                room.players = [];
                room.game_data.player_balances = [];
                room.game_data.credit_data.player_credits = [];

                for (const playerRow of snapshot.players || []) {
                    console.log(`🔍 ensureRoomLoaded: загружаем игрока ${playerRow.name}, is_host: ${playerRow.is_host}, is_ready: ${playerRow.is_ready}`);
                    const player = addPlayerToRoom(room, {
                        userId: playerRow.user_id,
                        name: playerRow.name,
                        avatar: playerRow.avatar,
                        isHost: Boolean(playerRow.is_host),
                        isReady: Boolean(playerRow.is_ready),
                        selectedDream: playerRow.selected_dream,
                        selectedToken: playerRow.selected_token
                    });
                    console.log(`✅ ensureRoomLoaded: игрок ${player.name} добавлен, isHost: ${player.isHost}, isReady: ${player.isReady}`);
                }
            }
        }
        return getRoomById(roomId);
    };

    const getDisplayName = (user) => {
        if (!user) return 'Игрок';
        return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email || 'Игрок';
    };

    const buildRoomResponse = (room, userId) => sanitizeRoom(room, { includePlayers: true, userId });

    const loadRooms = async ({ userId = null, includePlayers = true } = {}) => {
        if (isDbReady?.()) {
            const dbRooms = await db.getAllRooms();
            const result = [];
            for (const row of dbRooms) {
                const loaded = await ensureRoomLoaded(row.id);
                if (loaded) {
                    result.push(sanitizeRoom(loaded, { includePlayers, userId }));
                }
            }
            return result;
        }

        return listRooms().map((room) => sanitizeRoom(room, { includePlayers, userId }));
    };

    app.get('/api/rooms', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || null;
            const result = await loadRooms({ userId, includePlayers: true });
            res.json({ success: true, rooms: result });
        } catch (error) {
            console.error('Ошибка получения списка комнат:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    });

    app.get('/api/rooms/simple', async (req, res) => {
        try {
            const rooms = await loadRooms({ includePlayers: false });
            const simplified = rooms.map(room => ({
                id: room.id,
                name: room.name,
                creatorName: room.creatorName,
                maxPlayers: room.maxPlayers,
                playersCount: room.players?.length || 0,
                status: room.status,
                gameStarted: room.gameStarted,
                canStart: room.canStart
            }));
            res.json({ success: true, rooms: simplified });
        } catch (error) {
            console.error('Ошибка получения простого списка комнат:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    });

    app.get('/api/rooms/:roomId', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || null;
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }
            res.json({ success: true, room: sanitizeRoom(room, { includePlayers: true, userId }) });
        } catch (error) {
            console.error('Ошибка получения комнаты:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка получения комнаты' });
        }
    });

    app.post('/api/rooms', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            if (!userId) {
                throw new Error('Не указан идентификатор пользователя');
            }
            let user = null;
            if (isDbReady?.()) {
                user = await db.getUserById(userId);
            }
            const room = createRoomInstance({
                name: req.body?.name,
                creator: {
                    id: userId,
                    name: getDisplayName(user),
                    avatar: user?.avatar || null
                },
                maxPlayers: req.body?.max_players || req.body?.maxPlayers,
                turnTime: req.body?.turn_time || req.body?.turnTime,
                assignProfessions: req.body?.assign_professions || req.body?.profession_mode
            });

            const host = addPlayerToRoom(room, {
                userId,
                name: getDisplayName(user),
                avatar: user?.avatar || null,
                isHost: true
            });

            if (isDbReady?.()) {
                await db.createRoom({
                    id: room.id,
                    name: room.name,
                    creatorId: room.creatorId,
                    creatorName: room.creatorName,
                    creatorAvatar: room.creatorAvatar,
                    maxPlayers: room.maxPlayers,
                    minPlayers: room.minPlayers,
                    turnTime: room.turnTime,
                    assignProfessions: room.assignProfessions
                });
                await db.addPlayerToRoom(room.id, {
                    userId: host.userId,
                    name: host.name,
                    avatar: host.avatar,
                    isHost: true
                });
                
                // Принудительное сохранение после создания комнаты
                await forceSaveRoom(room.id);
                console.log(`💾 Комната ${room.name} принудительно сохранена после создания`);
            }

            res.status(201).json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка создания комнаты:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка создания комнаты' });
        }
    });

    app.post('/api/rooms/:roomId/join', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            if (!userId) {
                throw new Error('Не указан идентификатор пользователя');
            }
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }
            if (room.players.length >= room.maxPlayers) {
                return res.status(400).json({ success: false, message: 'Комната заполнена' });
            }
            let user = null;
            if (isDbReady?.()) {
                user = await db.getUserById(userId);
            }
            const newPlayer = addPlayerToRoom(room, {
                userId,
                name: getDisplayName(user),
                avatar: user?.avatar || null
            });

            if (isDbReady?.()) {
                await db.addPlayerToRoom(room.id, {
                    userId,
                    name: newPlayer.name,
                    avatar: newPlayer.avatar,
                    isHost: newPlayer.isHost
                });
                
                // Принудительное сохранение после присоединения игрока
                await forceSaveRoom(room.id);
                console.log(`💾 Комната ${room.name} принудительно сохранена после присоединения игрока`);
            }

            res.json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка присоединения к комнате:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка присоединения' });
        }
    });

    app.post('/api/rooms/:roomId/leave', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            if (!userId) {
                throw new Error('Не указан идентификатор пользователя');
            }
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }

            const wasHost = room.players.find(p => p.userId === userId.toString())?.isHost;
            removePlayerFromRoom(room, userId);

            if (isDbReady?.()) {
                await db.removePlayerFromRoom(room.id, userId);
                if (wasHost && room.players.length > 0) {
                    await db.setRoomHost(room.id, room.players[0].userId);
                }
                if (room.players.length === 0) {
                    await db.deleteRoom(room.id);
                }
            }

            res.json({ success: true, room: buildRoomResponse(room, req.user?.userId) });
        } catch (error) {
            console.error('Ошибка выхода из комнаты:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка выхода' });
        }
    });

    app.post('/api/rooms/:roomId/dream', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            const { dream_id } = req.body || {};
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }
            assignDreamToPlayer(room, userId, dream_id);
            const player = room.players.find(p => p.userId === userId.toString());
            if (isDbReady?.()) {
                await db.updatePlayerSelection(room.id, userId, {
                    dreamId: player?.selectedDream ?? dream_id,
                    tokenId: player?.selectedToken ?? null
                });
                
                // Принудительное сохранение после выбора мечты
                await forceSaveRoom(room.id);
                console.log(`💾 Комната ${room.name} принудительно сохранена после выбора мечты игроком ${userId}`);
            }
            res.json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка выбора мечты:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка выбора мечты' });
        }
    });

    app.post('/api/rooms/:roomId/token', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            const { token_id } = req.body || {};
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }
            assignTokenToPlayer(room, userId, token_id);
            const player = room.players.find(p => p.userId === userId.toString());
            if (isDbReady?.()) {
                await db.updatePlayerSelection(room.id, userId, {
                    dreamId: player?.selectedDream ?? null,
                    tokenId: player?.selectedToken ?? token_id
                });
                
                // Принудительное сохранение после выбора фишки
                await forceSaveRoom(room.id);
                console.log(`💾 Комната ${room.name} принудительно сохранена после выбора фишки игроком ${userId}`);
            }
            res.json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка выбора фишки:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка выбора фишки' });
        }
    });

    app.post('/api/rooms/:roomId/ready', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }
            const isReady = toggleReadyStatus(room, userId);
            if (isDbReady?.()) {
                await db.updatePlayerReady(room.id, userId, isReady);
                
                // Принудительное сохранение после изменения статуса готовности
                await forceSaveRoom(room.id);
                console.log(`💾 Комната ${room.name} принудительно сохранена после изменения готовности игрока ${userId}`);
            }
            res.json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка переключения готовности:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка готовности' });
        }
    });

    app.post('/api/rooms/:roomId/start', ensureAuth, async (req, res) => {
        try {
            const userId = req.user?.userId || req.headers['x-user-id'];
            const room = await ensureRoomLoaded(req.params.roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Комната не найдена' });
            }
            if (room.creatorId && room.creatorId.toString() !== userId.toString()) {
                return res.status(403).json({ success: false, message: 'Только создатель комнаты может начать игру' });
            }
            const readyPlayers = room.players.filter(player => player.isReady);
            if (readyPlayers.length < MIN_PLAYERS) {
                return res.status(400).json({ success: false, message: 'Недостаточно готовых игроков' });
            }
            initializeGame(room);
            if (isDbReady?.()) {
                await db.markRoomStatus(room.id, { status: 'playing', gameStarted: true });
                
                // Принудительное сохранение после запуска игры
                await forceSaveRoom(room.id);
                console.log(`💾 Комната ${room.name} принудительно сохранена после запуска игры`);
            }
            res.json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка запуска игры:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка запуска игры' });
        }
    });
}

module.exports = registerRoomsModule;
