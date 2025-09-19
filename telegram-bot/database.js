const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

class Database {
    constructor() {
        this.db = new sqlite3.Database(config.DATABASE_URL);
        this.initTables();
    }

    initTables() {
        // Таблица пользователей
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                balance REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица рефералов
        this.db.run(`
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER,
                referred_id INTEGER,
                bonus_amount REAL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_id) REFERENCES users (telegram_id),
                FOREIGN KEY (referred_id) REFERENCES users (telegram_id)
            )
        `);

        // Таблица транзакций
        this.db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                amount REAL,
                description TEXT,
                status TEXT DEFAULT 'completed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )
        `);

        // Таблица мастеров
        this.db.run(`
            CREATE TABLE IF NOT EXISTS masters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )
        `);
    }

    // Пользователи
    async getUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { telegramId, username, firstName, lastName, referralCode, referredBy } = userData;
            this.db.run(
                'INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)',
                [telegramId, username, firstName, lastName, referralCode, referredBy],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserBalance(telegramId, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [amount, telegramId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Рефералы
    async createReferral(referrerId, referredId, bonusAmount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO referrals (referrer_id, referred_id, bonus_amount) VALUES (?, ?, ?)',
                [referrerId, referredId, bonusAmount],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getReferralStats(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT 
                    COUNT(*) as total_referrals,
                    SUM(bonus_amount) as total_bonus,
                    SUM(CASE WHEN status = 'completed' THEN bonus_amount ELSE 0 END) as completed_bonus
                FROM referrals 
                WHERE referrer_id = ?`,
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows[0] || { total_referrals: 0, total_bonus: 0, completed_bonus: 0 });
                }
            );
        });
    }

    async getReferralList(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT u.telegram_id, u.username, u.first_name, u.last_name, r.bonus_amount, r.status, r.created_at
                FROM referrals r
                JOIN users u ON r.referred_id = u.telegram_id
                WHERE r.referrer_id = ?
                ORDER BY r.created_at DESC`,
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // Транзакции
    async createTransaction(userId, type, amount, description) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [userId, type, amount, description],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // Мастера
    async createMasterApplication(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO masters (user_id, status) VALUES (?, ?)',
                [telegramId, 'pending'],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // Генерация реферального кода
    generateReferralCode(telegramId) {
        return `EM${telegramId}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;

