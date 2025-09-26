const { connectToMongoDB, setModels, dbWrapper } = require('./config/database-mongodb');
const UserModel = require('./models/UserModel');
const TransactionModel = require('./models/TransactionModel');
const ReferralModel = require('./models/ReferralModel');

class Database {
    constructor() {
        this.isConnected = false;
        this.db = null;
    }

    async init() {
        try {
            console.log('🔄 Initializing MongoDB for Telegram Bot...');
            
            // Подключаемся к MongoDB
            await connectToMongoDB();
            
            // Устанавливаем модели
            setModels(UserModel, TransactionModel, ReferralModel);
            
            this.db = dbWrapper;
            this.isConnected = true;
            
            console.log('✅ MongoDB initialized for Telegram Bot');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize MongoDB for bot:', error);
            this.isConnected = false;
            return false;
        }
    }

    // User operations
    async getUser(telegramId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.getUserByTelegramId(telegramId);
    }

    async createUser(userData) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.createUser(userData);
    }

    async updateUserBalance(telegramId, amount) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.updateUserBalance(telegramId, amount);
    }

    async updateUserGameId(telegramId, gameUserId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.updateUserGameId(telegramId, gameUserId);
    }

    // Transaction operations
    async createTransaction(userId, type, amount, description) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.createTransaction({
            userId,
            telegramId: userId,
            type,
            amount,
            description
        });
    }

    async getTransactionsByUser(telegramId, limit = 50) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.getTransactionsByUser(telegramId, limit);
    }

    async getTotalEarnings(telegramId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.getTotalEarnings(telegramId);
    }

    // Referral operations
    async createReferral(referrerId, referredId, bonusAmount) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.createReferral({
            referrerId,
            referredId,
            bonusAmount
        });
    }

    async getReferralStats(telegramId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.getReferralStats(telegramId);
    }

    async getReferralList(telegramId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.getReferralList(telegramId);
    }

    async getReferralByReferredId(referredId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.getReferralByReferredId(referredId);
    }

    // Master operations
    async createMasterApplication(telegramId) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        
        // Обновляем пользователя как мастера
        const user = await this.getUser(telegramId);
        if (user) {
            user.isMaster = true;
            user.masterStatus = 'pending';
            await user.save();
            return true;
        }
        return false;
    }

    // Генерация реферального кода
    generateReferralCode(telegramId) {
        return `EM${telegramId}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    // Проверка подключения
    isConnected() {
        return this.isConnected;
    }

    close() {
        // MongoDB connection will be closed by the main app
        this.isConnected = false;
    }
}

module.exports = Database;
