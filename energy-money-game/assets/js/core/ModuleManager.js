/**
 * Менеджер модулей для игры "Энергия денег"
 * Управляет регистрацией, инициализацией и жизненным циклом модулей
 */

export class ModuleManager {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.initialized = new Set();
        this.isDestroyed = false;
    }

    /**
     * Регистрация модуля
     * @param {string} name - Имя модуля
     * @param {Object} module - Экземпляр модуля
     * @param {Array} dependencies - Зависимости модуля
     */
    register(name, module, dependencies = []) {
        if (this.isDestroyed) {
            console.warn('ModuleManager уничтожен, регистрация невозможна');
            return false;
        }

        if (this.modules.has(name)) {
            console.warn(`Модуль ${name} уже зарегистрирован`);
            return false;
        }

        // Проверка зависимостей
        const missingDependencies = dependencies.filter(dep => !this.modules.has(dep));
        if (missingDependencies.length > 0) {
            console.error(`Модуль ${name} не может быть зарегистрирован. Отсутствуют зависимости: ${missingDependencies.join(', ')}`);
            return false;
        }

        this.modules.set(name, module);
        this.dependencies.set(name, dependencies);
        
        console.log(`✅ Модуль ${name} зарегистрирован`);
        return true;
    }

    /**
     * Получение модуля по имени
     * @param {string} name - Имя модуля
     */
    get(name) {
        return this.modules.get(name);
    }

    /**
     * Проверка существования модуля
     * @param {string} name - Имя модуля
     */
    has(name) {
        return this.modules.has(name);
    }

    /**
     * Получение списка всех модулей
     */
    getAll() {
        return Array.from(this.modules.entries());
    }

    /**
     * Получение имен всех модулей
     */
    getModuleNames() {
        return Array.from(this.modules.keys());
    }

    /**
     * Инициализация модуля
     * @param {string} name - Имя модуля
     */
    async initModule(name) {
        if (this.initialized.has(name)) {
            console.log(`Модуль ${name} уже инициализирован`);
            return true;
        }

        const module = this.modules.get(name);
        if (!module) {
            console.error(`Модуль ${name} не найден`);
            return false;
        }

        try {
            // Инициализация зависимостей
            const dependencies = this.dependencies.get(name) || [];
            for (const depName of dependencies) {
                await this.initModule(depName);
            }

            // Инициализация модуля
            if (typeof module.init === 'function') {
                console.log(`🔧 Инициализация модуля: ${name}`);
                await module.init();
            }

            this.initialized.add(name);
            console.log(`✅ Модуль ${name} инициализирован`);
            return true;

        } catch (error) {
            console.error(`❌ Ошибка инициализации модуля ${name}:`, error);
            return false;
        }
    }

    /**
     * Инициализация всех модулей
     * @param {Array} order - Порядок инициализации (опционально)
     */
    async initAll(order = null) {
        const moduleNames = order || this.getModuleNames();
        const results = [];

        for (const name of moduleNames) {
            const result = await this.initModule(name);
            results.push({ name, success: result });
        }

        return results;
    }

    /**
     * Уничтожение модуля
     * @param {string} name - Имя модуля
     */
    async destroyModule(name) {
        const module = this.modules.get(name);
        if (!module) {
            return false;
        }

        try {
            // Уничтожение модуля
            if (typeof module.destroy === 'function') {
                console.log(`🗑️ Уничтожение модуля: ${name}`);
                await module.destroy();
            }

            this.initialized.delete(name);
            console.log(`✅ Модуль ${name} уничтожен`);
            return true;

        } catch (error) {
            console.error(`❌ Ошибка уничтожения модуля ${name}:`, error);
            return false;
        }
    }

    /**
     * Получение зависимостей модуля
     * @param {string} name - Имя модуля
     */
    getDependencies(name) {
        return this.dependencies.get(name) || [];
    }

    /**
     * Получение модулей, зависящих от данного
     * @param {string} name - Имя модуля
     */
    getDependents(name) {
        const dependents = [];
        
        for (const [moduleName, dependencies] of this.dependencies.entries()) {
            if (dependencies.includes(name)) {
                dependents.push(moduleName);
            }
        }
        
        return dependents;
    }

    /**
     * Получение топологического порядка модулей
     */
    getTopologicalOrder() {
        const visited = new Set();
        const temp = new Set();
        const order = [];

        const visit = (name) => {
            if (temp.has(name)) {
                throw new Error(`Циклическая зависимость обнаружена: ${name}`);
            }
            
            if (visited.has(name)) {
                return;
            }

            temp.add(name);
            
            const dependencies = this.getDependencies(name);
            for (const dep of dependencies) {
                visit(dep);
            }
            
            temp.delete(name);
            visited.add(name);
            order.push(name);
        };

        for (const name of this.getModuleNames()) {
            if (!visited.has(name)) {
                visit(name);
            }
        }

        return order;
    }

    /**
     * Проверка циклических зависимостей
     */
    checkCircularDependencies() {
        try {
            this.getTopologicalOrder();
            return false; // Нет циклических зависимостей
        } catch (error) {
            console.error('Обнаружены циклические зависимости:', error.message);
            return true; // Есть циклические зависимости
        }
    }

    /**
     * Получение статистики модулей
     */
    getStats() {
        return {
            totalModules: this.modules.size,
            initializedModules: this.initialized.size,
            uninitializedModules: this.modules.size - this.initialized.size,
            hasCircularDependencies: this.checkCircularDependencies(),
            modules: Array.from(this.modules.keys()).map(name => ({
                name,
                initialized: this.initialized.has(name),
                dependencies: this.getDependencies(name),
                dependents: this.getDependents(name)
            }))
        };
    }

    /**
     * Получение информации о модуле
     * @param {string} name - Имя модуля
     */
    getModuleInfo(name) {
        const module = this.modules.get(name);
        if (!module) {
            return null;
        }

        return {
            name,
            module,
            dependencies: this.getDependencies(name),
            dependents: this.getDependents(name),
            initialized: this.initialized.has(name),
            hasInit: typeof module.init === 'function',
            hasDestroy: typeof module.destroy === 'function'
        };
    }

    /**
     * Переинициализация модуля
     * @param {string} name - Имя модуля
     */
    async reinitModule(name) {
        await this.destroyModule(name);
        return await this.initModule(name);
    }

    /**
     * Уничтожение всех модулей
     */
    async destroyAll() {
        const results = [];
        const moduleNames = this.getModuleNames();

        // Уничтожение в обратном порядке инициализации
        const reverseOrder = this.getTopologicalOrder().reverse();

        for (const name of reverseOrder) {
            const result = await this.destroyModule(name);
            results.push({ name, success: result });
        }

        return results;
    }

    /**
     * Уничтожение ModuleManager
     */
    async destroy() {
        await this.destroyAll();
        
        this.modules.clear();
        this.dependencies.clear();
        this.initialized.clear();
        this.isDestroyed = true;
        
        console.log('🗑️ ModuleManager уничтожен');
    }
}

export default ModuleManager;
