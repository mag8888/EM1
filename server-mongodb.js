// EM1 Game Board v2.0 - Main Server with MongoDB Atlas Integration
require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// MongoDB Atlas Database Integration
const { connectToMongoDB, getDb, setModels, dbWrapper } = require('./game-board/config/database-mongodb');
const UserModel = require('./game-board/models/UserModel');
const RoomModel = require('./game-board/models/RoomModel');

// Modules
const registerAuthModule = require('./modules/auth');
const registerRoomsModule = require('./modules/rooms');
const { ensureAuth: createEnsureAuth } = require('./modules/rooms');
const roomState = require('./services/room-state');
const { GAME_CELLS, SMALL_CIRCLE_CELLS } = require('./game-board/config/game-cells');

const app = express();
const PORT = process.env.PORT || 8080;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'em1-production-secret-key-2024-railway';

// --- Shared services -----------------------------------------------------
const { rooms, creditRooms, users, drawFromDeck, returnCardToDeck, createRoomInstance, addPlayerToRoom, loadUsersFromDatabase, getUserByEmailFromMemory, setDatabase, forceSaveRoom, forceSaveAllRooms } = roomState;

// Database connection status
let dbConnected = false;

// --- Helpers -------------------------------------------------------------
const resolvePath = (relativePath) => path.join(__dirname, relativePath);

const registerPage = (route, file) => {
    app.get(route, (req, res) => {
        res.sendFile(resolvePath(file));
    });
};

const connectToDatabase = async () => {
    if (dbConnected) {
        return;
    }

    try {
        // Connect to MongoDB Atlas
        await connectToMongoDB();
        
        // Set up models
        setModels(UserModel, RoomModel);
        
        dbConnected = true;
        console.log('✅ Connected to MongoDB Atlas');
        
        // Create test user if it doesn't exist
        const testUser = await dbWrapper.getUserByEmail('test@example.com');
        if (!testUser) {
            await dbWrapper.createUser({
                email: 'test@example.com',
                password: 'test123',
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User'
            });
            console.log('✅ Created test user: test@example.com / test123');
        }
        
        // Set database reference in room-state
        setDatabase(dbWrapper);
        
        // Load users from database into memory
        await loadUsersFromDatabase(dbWrapper);
        
        // Load existing rooms from MongoDB into memory
        await loadRoomsFromDatabase();
    } catch (error) {
        dbConnected = false;
        console.error('❌ Database connection error:', error.message);
        throw error;
    }
};

const loadRoomsFromDatabase = async () => {
    try {
        console.log('🔄 Loading rooms from MongoDB...');
        const dbRooms = await dbWrapper.getAllRooms();
        console.log(`📋 Found rooms in MongoDB: ${dbRooms.length}`);
        
        for (const roomData of dbRooms) {
            // Create room instance in memory
            const room = createRoomInstance({
                id: roomData._id.toString(),
                name: roomData.name,
                creator: {
                    id: roomData.creator_id,
                    name: roomData.creator_name || 'Creator'
                },
                maxPlayers: roomData.max_players || 4,
                turnTime: roomData.turn_time || 3,
                assignProfessions: roomData.assign_professions || false
            });
            
            // Set additional properties
            room.creatorId = roomData.creator_id;
            room.status = roomData.status || 'waiting';
            room.gameStarted = Boolean(roomData.game_started);
            room.createdAt = roomData.created_at;
            room.updatedAt = roomData.updated_at;
            
            console.log(`✅ Loaded room: ${room.name}`);
        }
        
        console.log(`✅ Loaded ${rooms.size} rooms into memory`);
        
        // Start periodic room saving
        setInterval(saveRoomsToDatabase, 30000); // every 30 seconds
    } catch (error) {
        console.error('❌ Error loading rooms from MongoDB:', error);
    }
};

const saveRoomsToDatabase = async () => {
    if (!dbConnected) return;
    
    try {
        for (const [roomId, room] of rooms) {
            // Update room data in MongoDB
            await dbWrapper.updateRoom(roomId, {
                name: room.name,
                status: room.gameStarted ? 'playing' : 'waiting',
                game_started: room.gameStarted,
                updated_at: new Date()
            });
        }
    } catch (error) {
        console.error('❌ Error saving rooms to MongoDB:', error);
    }
};

// --- Express Configuration -----------------------------------------------
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://em1-production.up.railway.app',
        /\.railway\.app$/,
        /\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Initialization ---------------------------------------------
connectToDatabase().catch(error => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});

// --- Authentication Module Registration ----------------------------------
setTimeout(() => {
    if (dbConnected) {
        try {
            const authModule = registerAuthModule({
                app,
                db: dbWrapper,
                jwtSecret: JWT_SECRET,
                roomState
            });
            console.log('✅ Auth module registered successfully');
        } catch (error) {
            console.error('❌ Failed to register auth module:', error);
        }
    } else {
        console.error('❌ Cannot register auth module: database not connected');
    }
}, 1000);

// --- Rooms Module Registration -------------------------------------------
setTimeout(() => {
    if (dbConnected) {
        try {
            registerRoomsModule(app, dbWrapper, roomState);
            console.log('✅ Rooms module registered successfully');
        } catch (error) {
            console.error('❌ Failed to register rooms module:', error);
        }
    }
}, 1500);

// --- Static Routes -------------------------------------------------------
registerPage('/', 'index.html');
registerPage('/game', 'game-board/index.html');
registerPage('/game/lobby', 'game-board/lobby.html');
registerPage('/game/room/:roomId', 'game-board/room.html');

// User profile route
app.get('/game/u/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!dbConnected) {
            return res.status(500).send('Database not connected');
        }
        
        // Try to find user by username
        const user = await dbWrapper.getUserByUsername(username);
        
        if (!user) {
            return res.status(404).send('User not found');
        }
        
        // Serve the profile page with user data
        res.sendFile(resolvePath('game-board/profile.html'));
    } catch (error) {
        console.error('Error loading user profile:', error);
        res.status(500).send('Internal server error');
    }
});

// API endpoint to get user profile data
app.get('/api/user/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!dbConnected) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const user = await dbWrapper.getUserByUsername(username);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return sanitized user data
        res.json({
            id: user._id || user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            level: user.level || 1,
            experience: user.experience || 0,
            games_played: user.games_played || 0,
            wins_count: user.wins_count || 0,
            created_at: user.created_at
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Health Check --------------------------------------------------------
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        rooms: rooms.size,
        users: users.size
    });
});

// --- Socket.IO Setup -----------------------------------------------------
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'http://localhost:8080',
            'https://em1-production.up.railway.app',
            /\.railway\.app$/,
            /\.vercel\.app$/
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
    
    // Room-related socket events
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });
    
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
    });
});

// --- Server Startup -----------------------------------------------------
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

module.exports = app;
