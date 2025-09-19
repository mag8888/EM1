const axios = require('axios');
const config = require('./config');

class ServerIntegration {
    constructor() {
        this.gameServerUrl = config.GAME_SERVER_URL;
    }

    // Получение баланса пользователя из игры
    async getGameBalance(userId) {
        try {
            const response = await axios.get(`${this.gameServerUrl}/api/user/${userId}/balance`);
            return response.data.balance || 0;
        } catch (error) {
            console.error('Error getting game balance:', error);
            return 0;
        }
    }

    // Обновление баланса пользователя в игре
    async updateGameBalance(userId, amount, description = '') {
        try {
            const response = await axios.post(`${this.gameServerUrl}/api/user/${userId}/balance`, {
                amount,
                description,
                type: 'telegram_bonus'
            });
            return response.data.success;
        } catch (error) {
            console.error('Error updating game balance:', error);
            return false;
        }
    }

    // Получение информации о пользователе
    async getUserInfo(userId) {
        try {
            const response = await axios.get(`${this.gameServerUrl}/api/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting user info:', error);
            return null;
        }
    }

    // Создание пользователя в игре
    async createGameUser(telegramId, userData) {
        try {
            const response = await axios.post(`${this.gameServerUrl}/api/user/create`, {
                telegramId,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                referralCode: userData.referralCode
            });
            return response.data.success;
        } catch (error) {
            console.error('Error creating game user:', error);
            return false;
        }
    }

    // Отправка уведомления в игру
    async sendGameNotification(userId, message, type = 'info') {
        try {
            const response = await axios.post(`${this.gameServerUrl}/api/notification`, {
                userId,
                message,
                type
            });
            return response.data.success;
        } catch (error) {
            console.error('Error sending game notification:', error);
            return false;
        }
    }

    // Получение статистики пользователя
    async getUserStats(userId) {
        try {
            const response = await axios.get(`${this.gameServerUrl}/api/user/${userId}/stats`);
            return response.data;
        } catch (error) {
            console.error('Error getting user stats:', error);
            return null;
        }
    }

    // Проверка статуса сервера
    async checkServerHealth() {
        try {
            const response = await axios.get(`${this.gameServerUrl}/health`);
            return response.status === 200;
        } catch (error) {
            console.error('Game server is not available:', error);
            return false;
        }
    }

    // Синхронизация данных между ботом и игрой
    async syncUserData(userId, botUserData) {
        try {
            const response = await axios.post(`${this.gameServerUrl}/api/sync`, {
                userId,
                botData: botUserData
            });
            return response.data.success;
        } catch (error) {
            console.error('Error syncing user data:', error);
            return false;
        }
    }

    // Получение реферальной статистики из игры
    async getGameReferralStats(userId) {
        try {
            const response = await axios.get(`${this.gameServerUrl}/api/user/${userId}/referrals`);
            return response.data;
        } catch (error) {
            console.error('Error getting game referral stats:', error);
            return null;
        }
    }

    // Обновление реферальной статистики в игре
    async updateGameReferralStats(userId, referralData) {
        try {
            const response = await axios.post(`${this.gameServerUrl}/api/user/${userId}/referrals`, {
                referralData
            });
            return response.data.success;
        } catch (error) {
            console.error('Error updating game referral stats:', error);
            return false;
        }
    }

    // Получение списка активных игроков
    async getActivePlayers() {
        try {
            const response = await axios.get(`${this.gameServerUrl}/api/players/active`);
            return response.data.players || [];
        } catch (error) {
            console.error('Error getting active players:', error);
            return [];
        }
    }

    // Отправка массового уведомления
    async sendMassNotification(message, userIds = []) {
        try {
            const response = await axios.post(`${this.gameServerUrl}/api/notifications/mass`, {
                message,
                userIds
            });
            return response.data.success;
        } catch (error) {
            console.error('Error sending mass notification:', error);
            return false;
        }
    }
}

module.exports = ServerIntegration;

