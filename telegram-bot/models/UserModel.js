const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database-mongodb");

class User {
    constructor({ 
        _id, 
        telegramId, 
        username, 
        firstName, 
        lastName, 
        referralCode, 
        referredBy, 
        balance = 0, 
        gameUserId = null,
        isMaster = false,
        masterStatus = 'pending',
        createdAt, 
        updatedAt 
    }) {
        this._id = _id ? new ObjectId(_id) : new ObjectId();
        this.telegramId = telegramId;
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.referralCode = referralCode || this.generateReferralCode();
        this.referredBy = referredBy;
        this.balance = balance;
        this.gameUserId = gameUserId; // Связь с игровым пользователем
        this.isMaster = isMaster;
        this.masterStatus = masterStatus;
        this.createdAt = createdAt || new Date().toISOString();
        this.updatedAt = updatedAt || new Date().toISOString();
    }

    static collection() {
        try {
            return getDb().collection("users");
        } catch (error) {
            console.error('Database connection error in UserModel:', error);
            throw error;
        }
    }

    async save() {
        try {
            const doc = { 
                ...this, 
                _id: this._id,
                updatedAt: new Date().toISOString()
            };
            await User.collection().updateOne(
                { _id: this._id },
                { $set: doc },
                { upsert: true }
            );
            return this;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    static async findByTelegramId(telegramId) {
        try {
            const user = await User.collection().findOne({ telegramId: parseInt(telegramId) });
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Error finding user by telegram ID:', error);
            return null;
        }
    }

    static async findByUsername(username) {
        try {
            const user = await User.collection().findOne({ username });
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Error finding user by username:', error);
            return null;
        }
    }

    static async findByReferralCode(referralCode) {
        try {
            const user = await User.collection().findOne({ referralCode });
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Error finding user by referral code:', error);
            return null;
        }
    }

    static async findByGameUserId(gameUserId) {
        try {
            const user = await User.collection().findOne({ gameUserId });
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Error finding user by game user ID:', error);
            return null;
        }
    }

    static async createUser(userData) {
        try {
            const user = new User({
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await user.save();
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async updateBalance(telegramId, amount) {
        try {
            const result = await User.collection().updateOne(
                { telegramId: parseInt(telegramId) },
                { 
                    $inc: { balance: amount },
                    $set: { updatedAt: new Date().toISOString() }
                }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error updating user balance:', error);
            return false;
        }
    }

    static async updateGameUserId(telegramId, gameUserId) {
        try {
            const result = await User.collection().updateOne(
                { telegramId: parseInt(telegramId) },
                { 
                    $set: { 
                        gameUserId,
                        updatedAt: new Date().toISOString()
                    }
                }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error updating game user ID:', error);
            return false;
        }
    }

    static async getAllUsers() {
        try {
            const users = await User.collection().find({}).toArray();
            return users.map(user => new User(user));
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    generateReferralCode() {
        return `EM${this.telegramId}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    getFullName() {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.username || 'Пользователь';
    }

    getDisplayName() {
        return this.username ? `@${this.username}` : this.getFullName();
    }
}

module.exports = User;
