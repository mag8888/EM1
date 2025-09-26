const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let db;
let isConnected = false;

const connectToMongoDB = async () => {
    if (isConnected) {
        return;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not defined in environment variables.');
        throw new Error('MONGODB_URI is not defined.');
    }

    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    try {
        await client.connect();
        db = client.db(process.env.MONGODB_DB_NAME || 'em_bot');
        isConnected = true;
        console.log('✅ Bot connected to MongoDB Atlas');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB Atlas:', error);
        isConnected = false;
        throw error;
    }
};

const getDb = () => {
    if (!isConnected) {
        throw new Error('Database not connected. Call connectToMongoDB first.');
    }
    return db;
};

const closeMongoDBConnection = async () => {
    if (client) {
        await client.close();
        isConnected = false;
        console.log('🔌 MongoDB connection closed.');
    }
};

const getConnectionStatus = () => ({
    isConnected: isConnected,
    name: 'MongoDB'
});

let UserModel;
let TransactionModel;
let ReferralModel;

const setModels = (userModel, transactionModel, referralModel) => {
    UserModel = userModel;
    TransactionModel = transactionModel;
    ReferralModel = referralModel;
};

const dbWrapper = {
    // User operations
    async createUser(userData) {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.createUser(userData);
    },
    
    async getUserByTelegramId(telegramId) {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.findByTelegramId(telegramId);
    },
    
    async getUserByUsername(username) {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.findByUsername(username);
    },
    
    async getUserByReferralCode(referralCode) {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.findByReferralCode(referralCode);
    },
    
    async updateUserBalance(telegramId, amount) {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.updateBalance(telegramId, amount);
    },
    
    async updateUserGameId(telegramId, gameUserId) {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.updateGameUserId(telegramId, gameUserId);
    },
    
    async getAllUsers() {
        if (!UserModel) throw new Error("UserModel not set");
        return await UserModel.getAllUsers();
    },

    // Transaction operations
    async createTransaction(transactionData) {
        if (!TransactionModel) throw new Error("TransactionModel not set");
        return await TransactionModel.createTransaction(transactionData);
    },
    
    async getTransactionsByUser(telegramId, limit = 50) {
        if (!TransactionModel) throw new Error("TransactionModel not set");
        return await TransactionModel.getTransactionsByUser(telegramId, limit);
    },
    
    async getTotalEarnings(telegramId) {
        if (!TransactionModel) throw new Error("TransactionModel not set");
        return await TransactionModel.getTotalEarnings(telegramId);
    },

    // Referral operations
    async createReferral(referralData) {
        if (!ReferralModel) throw new Error("ReferralModel not set");
        return await ReferralModel.createReferral(referralData);
    },
    
    async getReferralStats(telegramId) {
        if (!ReferralModel) throw new Error("ReferralModel not set");
        return await ReferralModel.getReferralStats(telegramId);
    },
    
    async getReferralList(telegramId, limit = 50) {
        if (!ReferralModel) throw new Error("ReferralModel not set");
        return await ReferralModel.getReferralList(telegramId, limit);
    },
    
    async getReferralByReferredId(referredId) {
        if (!ReferralModel) throw new Error("ReferralModel not set");
        return await ReferralModel.getReferralByReferredId(referredId);
    }
};

module.exports = {
    connectToMongoDB,
    getDb,
    closeMongoDBConnection,
    getConnectionStatus,
    setModels,
    dbWrapper
};
