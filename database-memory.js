const fs = require('fs');
const path = require('path');

class MemoryDatabase {
    constructor() {
        this.rooms = new Map();
        this.players = new Map(); // roomId -> players[]
        this.dbPath = path.join(__dirname, 'game_rooms.json');
        this.initialized = false;
    }

    async init() {
        try {
            // Загружаем данные из файла если он существует
            if (fs.existsSync(this.dbPath)) {
                const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
                this.rooms = new Map(data.rooms || []);
                this.players = new Map(data.players || []);
                console.log('✅ Данные загружены из файла');
            }
            this.initialized = true;
            console.log('✅ Memory Database инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации Memory Database:', error.message);
            this.initialized = true; // Продолжаем работу без файла
        }
    }

    async saveToFile() {
        try {
            const data = {
                rooms: Array.from(this.rooms.entries()),
                players: Array.from(this.players.entries()),
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Ошибка сохранения в файл:', error.message);
        }
    }

    async createRoom(roomData) {
        const { id, name, creatorId, creatorName, maxPlayers = 4, minPlayers = 2 } = roomData;
        
        const room = {
            id,
            name,
            creatorId,
            creatorName,
            maxPlayers,
            minPlayers,
            gameStarted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActivity: Date.now()
        };
        
        this.rooms.set(id, room);
        this.players.set(id, []);
        
        await this.saveToFile();
        console.log('✅ Комната создана в памяти:', id);
        return room;
    }

    async getRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return null;
        }
        
        const roomPlayers = this.players.get(roomId) || [];
        const readyCount = roomPlayers.filter(p => p.isReady).length;
        
        return {
            ...room,
            playersCount: roomPlayers.length,
            readyCount,
            canStart: roomPlayers.length >= room.minPlayers && readyCount >= room.minPlayers
        };
    }

    async getAllRooms() {
        const rooms = [];
        for (const [roomId, room] of this.rooms) {
            const roomPlayers = this.players.get(roomId) || [];
            const readyCount = roomPlayers.filter(p => p.isReady).length;
            
            rooms.push({
                ...room,
                playersCount: roomPlayers.length,
                readyCount,
                canStart: roomPlayers.length >= room.minPlayers && readyCount >= room.minPlayers
            });
        }
        
        return rooms.sort((a, b) => b.lastActivity - a.lastActivity);
    }

    async addPlayerToRoom(roomId, playerData) {
        const { userId, name, avatar, isHost = false } = playerData;
        
        if (!this.rooms.has(roomId)) {
            throw new Error('Комната не найдена');
        }
        
        const roomPlayers = this.players.get(roomId) || [];
        
        // Удаляем игрока если он уже есть
        const existingIndex = roomPlayers.findIndex(p => p.userId === userId);
        if (existingIndex >= 0) {
            roomPlayers.splice(existingIndex, 1);
        }
        
        // Добавляем игрока
        roomPlayers.push({
            userId,
            name,
            avatar,
            isHost,
            isReady: false,
            selectedDream: null,
            selectedToken: null,
            position: 0,
            balance: 1000,
            joinedAt: new Date().toISOString()
        });
        
        this.players.set(roomId, roomPlayers);
        await this.saveToFile();
        
        console.log('✅ Игрок добавлен в комнату:', { roomId, userId, name });
    }

    async getRoomPlayers(roomId) {
        return this.players.get(roomId) || [];
    }

    async updatePlayerReady(roomId, userId, isReady) {
        const roomPlayers = this.players.get(roomId) || [];
        const player = roomPlayers.find(p => p.userId === userId);
        
        if (!player) {
            throw new Error('Игрок не найден');
        }
        
        player.isReady = isReady;
        player.updatedAt = new Date().toISOString();
        
        this.players.set(roomId, roomPlayers);
        await this.saveToFile();
        
        console.log('✅ Готовность игрока обновлена:', { roomId, userId, isReady });
    }

    async updateRoomActivity(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.lastActivity = Date.now();
            room.updatedAt = new Date().toISOString();
            this.rooms.set(roomId, room);
            await this.saveToFile();
        }
    }

    async deleteRoom(roomId) {
        this.rooms.delete(roomId);
        this.players.delete(roomId);
        await this.saveToFile();
        console.log('✅ Комната удалена:', roomId);
    }

    async close() {
        await this.saveToFile();
        console.log('✅ Memory Database закрыта');
    }
}

module.exports = MemoryDatabase;
