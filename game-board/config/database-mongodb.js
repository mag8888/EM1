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
        db = client.db(process.env.MONGODB_DB_NAME || 'em2_game');
        isConnected = true;
        console.log('✅ Connected to MongoDB Atlas');
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

module.exports = {
    connectToMongoDB,
    getDb,
    closeMongoDBConnection,
    getConnectionStatus
};

