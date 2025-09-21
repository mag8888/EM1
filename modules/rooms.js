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
        MIN_PLAYERS
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
                room.players = [];
                room.game_data.player_balances = [];
                room.game_data.credit_data.player_credits = [];

                for (const playerRow of snapshot.players || []) {
                    const player = addPlayerToRoom(room, {
                        userId: playerRow.user_id,
                        name: playerRow.name,
                        avatar: playerRow.avatar
                    });
                    player.isHost = Boolean(playerRow.is_host);
                    player.isReady = Boolean(playerRow.is_ready);
                    player.selectedDream = playerRow.selected_dream;
                    player.selectedToken = playerRow.selected_token;
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

    app.get('/api/rooms', async (req, res) => {
        try {
            let result = [];
            if (isDbReady?.()) {
                const dbRooms = await db.getAllRooms();
                result = await Promise.all(dbRooms.map(async (row) => {
                    let room = getRoomById(row.id);
                    if (!room) {
                        room = await ensureRoomLoaded(row.id);
                    }
                    return sanitizeRoom(room || {
                        id: row.id,
                        name: row.name,
                        creatorId: row.creator_id,
                        creatorName: row.creator_name,
                        maxPlayers: row.max_players,
                        turnTime: row.turn_time,
                        assignProfessions: Boolean(row.assign_professions),
                        status: row.status,
                        gameStarted: Boolean(row.game_started),
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        players: []
                    });
                }));
            } else {
                result = listRooms().map((room) => sanitizeRoom(room));
            }
            res.json({ success: true, rooms: result });
        } catch (error) {
            console.error('Ошибка получения списка комнат:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
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
                avatar: user?.avatar || null
            });
            host.isHost = true;

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
            }
            res.json({ success: true, room: buildRoomResponse(room, userId) });
        } catch (error) {
            console.error('Ошибка запуска игры:', error);
            res.status(400).json({ success: false, message: error.message || 'Ошибка запуска игры' });
        }
    });
}

module.exports = registerRoomsModule;
