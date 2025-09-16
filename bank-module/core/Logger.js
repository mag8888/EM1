/**
 * СИСТЕМА ЛОГИРОВАНИЯ
 * Централизованное логирование с уровнями важности
 */

export class Logger {
    constructor(prefix = 'BankModule') {
        this.prefix = prefix;
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.levels.INFO;
    }

    /**
     * Установить уровень логирования
     * @param {string} level - Уровень логирования (ERROR, WARN, INFO, DEBUG)
     */
    setLevel(level) {
        this.currentLevel = this.levels[level] || this.levels.INFO;
    }

    /**
     * Логировать ошибку
     * @param {string} message - Сообщение
     * @param {*} data - Дополнительные данные
     */
    error(message, data = null) {
        if (this.currentLevel >= this.levels.ERROR) {
            console.error(`❌ [${this.prefix}] ${message}`, data || '');
        }
    }

    /**
     * Логировать предупреждение
     * @param {string} message - Сообщение
     * @param {*} data - Дополнительные данные
     */
    warn(message, data = null) {
        if (this.currentLevel >= this.levels.WARN) {
            console.warn(`⚠️ [${this.prefix}] ${message}`, data || '');
        }
    }

    /**
     * Логировать информацию
     * @param {string} message - Сообщение
     * @param {*} data - Дополнительные данные
     */
    info(message, data = null) {
        if (this.currentLevel >= this.levels.INFO) {
            console.log(`ℹ️ [${this.prefix}] ${message}`, data || '');
        }
    }

    /**
     * Логировать отладочную информацию
     * @param {string} message - Сообщение
     * @param {*} data - Дополнительные данные
     */
    debug(message, data = null) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.log(`🐛 [${this.prefix}] ${message}`, data || '');
        }
    }

    /**
     * Логировать группу операций
     * @param {string} groupName - Название группы
     * @param {Function} callback - Функция для выполнения
     */
    group(groupName, callback) {
        console.group(`📁 [${this.prefix}] ${groupName}`);
        try {
            callback();
        } finally {
            console.groupEnd();
        }
    }
}
