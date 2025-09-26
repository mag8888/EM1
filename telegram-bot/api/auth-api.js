const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('../database-mongodb');
const config = require('../config');

const router = express.Router();
const db = new Database();

// Инициализация базы данных
db.init().catch(console.error);

// JWT Secret (должен совпадать с основным приложением)
const JWT_SECRET = process.env.JWT_SECRET || 'em1-production-secret-key-2024-railway';

/**
 * Авторизация через Telegram ID
 * POST /api/auth/telegram
 */
router.post('/telegram', async (req, res) => {
    try {
        const { telegramId, username, firstName, lastName } = req.body;

        if (!telegramId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Telegram ID is required' 
            });
        }

        // Ищем пользователя в базе данных
        let user = await db.getUser(telegramId);
        
        if (!user) {
            // Создаем нового пользователя
            user = await db.createUser({
                telegramId: parseInt(telegramId),
                username,
                firstName,
                lastName,
                balance: 0
            });
            console.log(`✅ New user created via Telegram: ${telegramId}`);
        } else {
            // Обновляем информацию о пользователе
            user.username = username || user.username;
            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;
            await user.save();
        }

        // Создаем JWT токен
        const token = jwt.sign(
            { 
                userId: user._id.toString(),
                telegramId: user.telegramId,
                username: user.username,
                type: 'telegram'
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                balance: user.balance,
                referralCode: user.referralCode,
                isMaster: user.isMaster,
                gameUserId: user.gameUserId
            }
        });

    } catch (error) {
        console.error('❌ Telegram auth error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

/**
 * Получение информации о пользователе по токену
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token required' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.getUser(decoded.telegramId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id.toString(),
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                balance: user.balance,
                referralCode: user.referralCode,
                isMaster: user.isMaster,
                gameUserId: user.gameUserId
            }
        });

    } catch (error) {
        console.error('❌ Get user info error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
});

/**
 * Связывание Telegram аккаунта с игровым аккаунтом
 * POST /api/auth/link-game
 */
router.post('/link-game', async (req, res) => {
    try {
        const { telegramId, gameUserId } = req.body;

        if (!telegramId || !gameUserId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Telegram ID and Game User ID are required' 
            });
        }

        const success = await db.updateUserGameId(telegramId, gameUserId);
        
        if (success) {
            res.json({ 
                success: true, 
                message: 'Game account linked successfully' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Failed to link game account' 
            });
        }

    } catch (error) {
        console.error('❌ Link game account error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

/**
 * Получение статистики пользователя
 * GET /api/auth/stats/:telegramId
 */
router.get('/stats/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const user = await db.getUser(telegramId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const referralStats = await db.getReferralStats(telegramId);
        const totalEarnings = await db.getTotalEarnings(telegramId);

        res.json({
            success: true,
            stats: {
                user: {
                    telegramId: user.telegramId,
                    username: user.username,
                    balance: user.balance,
                    isMaster: user.isMaster
                },
                referrals: referralStats,
                earnings: {
                    total: totalEarnings
                }
            }
        });

    } catch (error) {
        console.error('❌ Get user stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
