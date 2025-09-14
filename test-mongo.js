const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://xqrmedia_db_user:9URuHWBY9lUQPOsj@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0';

console.log('Testing MongoDB connection...');
console.log('URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({
        name: String,
        created: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ name: 'test connection' });
    
    return testDoc.save();
})
.then((doc) => {
    console.log('✅ Test document created:', doc._id);
    return mongoose.connection.close();
})
.then(() => {
    console.log('✅ Connection closed successfully');
    process.exit(0);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code
    });
    process.exit(1);
});
