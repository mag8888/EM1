const { getDb } = require("../config/database-mongodb");
const { ObjectId } = require("mongodb");

class User {
    constructor({ id, email, username, first_name, last_name, password, registeredAt, lastSeen, isOnline = false, socketConnections = [] }) {
        this._id = id ? new ObjectId(id) : new ObjectId();
        this.email = email;
        this.username = username;
        this.first_name = first_name;
        this.last_name = last_name;
        this.password = password;
        this.registeredAt = registeredAt || new Date().toISOString();
        this.lastSeen = lastSeen || new Date().toISOString();
        this.isOnline = isOnline;
        this.socketConnections = socketConnections; // Array of socket IDs
    }

    static collection() {
        return getDb().collection("users");
    }

    async save() {
        const doc = { ...this, _id: this._id };
        await User.collection().updateOne(
            { _id: this._id },
            { $set: doc },
            { upsert: true }
        );
        return this;
    }

    static async findById(id) {
        const user = await User.collection().findOne({ _id: new ObjectId(id) });
        return user ? new User(user) : null;
    }

    static async findByEmail(email) {
        const user = await User.collection().findOne({ email: email });
        return user ? new User(user) : null;
    }

    static async updateOne(id, update) {
        const result = await User.collection().updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...update, lastSeen: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }

    static async addSocketConnection(userId, socketId) {
        const result = await User.collection().updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { socketConnections: socketId }, $set: { isOnline: true, lastSeen: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    }

    static async removeSocketConnection(userId, socketId) {
        const result = await User.collection().updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { socketConnections: socketId }, $set: { lastSeen: new Date().toISOString() } }
        );
        // Check if user has any remaining socket connections, if not, set isOnline to false
        const user = await User.findById(userId);
        if (user && user.socketConnections.length === 0) {
            await User.collection().updateOne(
                { _id: new ObjectId(userId) },
                { $set: { isOnline: false } }
            );
        }
        return result.modifiedCount > 0;
    }

    static async getAllUsers() {
        const users = await User.collection().find({}).toArray();
        return users.map(user => new User(user));
    }
}

module.exports = User;

