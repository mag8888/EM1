const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://xqrmedia_db_user:9URuHWBY9lUQPOsj@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0';

async function fixIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        
        // Удаляем старый уникальный индекс на telegram_id
        console.log('Dropping old telegram_id index...');
        try {
            await db.collection('users').dropIndex('telegram_id_1');
            console.log('✅ Old telegram_id index dropped');
        } catch (error) {
            console.log('ℹ️  Index telegram_id_1 not found or already dropped');
        }
        
        // Создаем новый sparse индекс на telegram_id
        console.log('Creating new sparse telegram_id index...');
        await db.collection('users').createIndex({ telegram_id: 1 }, { sparse: true });
        console.log('✅ New sparse telegram_id index created');
        
        // Удаляем дублирующиеся записи с null telegram_id (оставляем только первую)
        console.log('Cleaning up duplicate null telegram_id records...');
        const duplicates = await db.collection('users').aggregate([
            { $match: { telegram_id: null } },
            { $group: { _id: null, ids: { $push: '$_id' }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();
        
        if (duplicates.length > 0) {
            const duplicateIds = duplicates[0].ids;
            const keepId = duplicateIds[0];
            const deleteIds = duplicateIds.slice(1);
            
            console.log(`Found ${duplicateIds.length} duplicate records, keeping ${keepId}, deleting ${deleteIds.length} others`);
            
            await db.collection('users').deleteMany({ _id: { $in: deleteIds } });
            console.log('✅ Duplicate records cleaned up');
        } else {
            console.log('✅ No duplicate records found');
        }
        
        console.log('✅ Index fix completed successfully');
        
    } catch (error) {
        console.error('❌ Error fixing indexes:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Connection closed');
        process.exit(0);
    }
}

fixIndexes();
