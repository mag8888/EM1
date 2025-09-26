const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database-mongodb");

class Transaction {
    constructor({ 
        _id, 
        userId, 
        telegramId,
        type, 
        amount, 
        description, 
        status = 'completed',
        gameRoomId = null,
        createdAt 
    }) {
        this._id = _id ? new ObjectId(_id) : new ObjectId();
        this.userId = userId;
        this.telegramId = telegramId;
        this.type = type; // 'referral_bonus', 'game_earnings', 'withdrawal', 'deposit', etc.
        this.amount = amount;
        this.description = description;
        this.status = status;
        this.gameRoomId = gameRoomId;
        this.createdAt = createdAt || new Date().toISOString();
    }

    static collection() {
        try {
            return getDb().collection("transactions");
        } catch (error) {
            console.error('Database connection error in TransactionModel:', error);
            throw error;
        }
    }

    async save() {
        try {
            const doc = { 
                ...this, 
                _id: this._id
            };
            await Transaction.collection().updateOne(
                { _id: this._id },
                { $set: doc },
                { upsert: true }
            );
            return this;
        } catch (error) {
            console.error('Error saving transaction:', error);
            throw error;
        }
    }

    static async createTransaction(transactionData) {
        try {
            const transaction = new Transaction({
                ...transactionData,
                createdAt: new Date()
            });
            await transaction.save();
            return transaction;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    static async getTransactionsByUser(telegramId, limit = 50) {
        try {
            const transactions = await Transaction.collection()
                .find({ telegramId: parseInt(telegramId) })
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
            return transactions.map(transaction => new Transaction(transaction));
        } catch (error) {
            console.error('Error getting transactions by user:', error);
            return [];
        }
    }

    static async getTransactionsByType(type, limit = 100) {
        try {
            const transactions = await Transaction.collection()
                .find({ type })
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
            return transactions.map(transaction => new Transaction(transaction));
        } catch (error) {
            console.error('Error getting transactions by type:', error);
            return [];
        }
    }

    static async getTotalEarnings(telegramId) {
        try {
            const result = await Transaction.collection().aggregate([
                { $match: { 
                    telegramId: parseInt(telegramId),
                    type: { $in: ['referral_bonus', 'game_earnings', 'deposit'] },
                    status: 'completed'
                }},
                { $group: { 
                    _id: null, 
                    total: { $sum: '$amount' }
                }}
            ]).toArray();
            
            return result.length > 0 ? result[0].total : 0;
        } catch (error) {
            console.error('Error getting total earnings:', error);
            return 0;
        }
    }
}

module.exports = Transaction;
