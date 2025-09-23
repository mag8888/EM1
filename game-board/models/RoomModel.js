const { getDb } = require("../config/database-mongodb");
const { ObjectId } = require("mongodb");

class Room {
    constructor({ id, name, maxPlayers, turnTime, players, status, createdAt, updatedAt, assignProfessions, password, creatorId, creatorEmail, gameState = {} }) {
        this._id = id ? new ObjectId(id) : new ObjectId();
        this.name = name;
        this.maxPlayers = maxPlayers;
        this.turnTime = turnTime;
        this.players = players || [];
        this.status = status || "waiting";
        this.createdAt = createdAt || new Date().toISOString();
        this.updatedAt = updatedAt || new Date().toISOString();
        this.assignProfessions = assignProfessions || false;
        this.password = password || null;
        this.creatorId = creatorId;
        this.creatorEmail = creatorEmail;
        this.gameState = gameState; // Добавляем игровое состояние
    }

    static collection() {
        return getDb().collection("rooms");
    }

    async save() {
        const doc = { ...this, _id: this._id };
        await Room.collection().updateOne(
            { _id: this._id },
            { $set: doc },
            { upsert: true }
        );
        return this;
    }

    static async findById(id) {
        const room = await Room.collection().findOne({ _id: new ObjectId(id) });
        return room ? new Room(room) : null;
    }

    static async find(query = {}) {
        const rooms = await Room.collection().find(query).toArray();
        return rooms.map(room => new Room(room));
    }

    static async deleteById(id) {
        const result = await Room.collection().deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }

    static async updateOne(id, update) {
        const result = await Room.collection().updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...update, updatedAt: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }

    static async addPlayer(roomId, player) {
        const result = await Room.collection().updateOne(
            { _id: new ObjectId(roomId) },
            { $push: { players: player }, $set: { updatedAt: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }

    static async removePlayer(roomId, playerId) {
        const result = await Room.collection().updateOne(
            { _id: new ObjectId(roomId) },
            { $pull: { players: { userId: playerId } }, $set: { updatedAt: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }

    static async updatePlayer(roomId, playerId, update) {
        const result = await Room.collection().updateOne(
            { _id: new ObjectId(roomId), "players.userId": playerId },
            { $set: { "players.$": update, updatedAt: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }

    static async updateGameState(roomId, gameState) {
        const result = await Room.collection().updateOne(
            { _id: new ObjectId(roomId) },
            { $set: { gameState: gameState, updatedAt: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }
}

module.exports = Room;

