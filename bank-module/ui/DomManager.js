/**
 * МЕНЕДЖЕР DOM
 * Централизованная работа с DOM элементами
 */

import { ErrorHandler } from '../core/ErrorHandler.js';

export class DomManager {
    constructor(config, logger, errorHandler) {
        this.config = config;
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.elementCache = new Map();
    }

    /**
     * Получить элемент по селектору с кэшированием
     * @param {string} selector - CSS селектор
     * @param {boolean} useCache - Использовать кэш
     * @returns {Element|null} DOM элемент
     */
    getElement(selector, useCache = true) {
        if (useCache && this.elementCache.has(selector)) {
            const cached = this.elementCache.get(selector);
            // Проверяем, что элемент все еще в DOM
            if (document.contains(cached)) {
                return cached;
            } else {
                this.elementCache.delete(selector);
            }
        }

        const element = document.querySelector(selector);
        if (element && useCache) {
            this.elementCache.set(selector, element);
        }

        return element;
    }

    /**
     * Получить несколько элементов по селектору
     * @param {string} selector - CSS селектор
     * @returns {NodeList} Список элементов
     */
    getElements(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * Обновить текст элемента
     * @param {string} selector - CSS селектор
     * @param {string} text - Новый текст
     * @param {boolean} animate - Показать анимацию
     */
    updateText(selector, text, animate = true) {
        const element = this.getElement(selector);
        if (!element) {
            this.logger.warn(`Element not found: ${selector}`);
            return;
        }

        element.textContent = text;
        
        if (animate) {
            this.addAnimationClass(element, 'text-updated');
        }
    }

    /**
     * Обновить HTML содержимое элемента
     * @param {string} selector - CSS селектор
     * @param {string} html - Новый HTML
     * @param {boolean} animate - Показать анимацию
     */
    updateHTML(selector, html, animate = true) {
        const element = this.getElement(selector);
        if (!element) {
            this.logger.warn(`Element not found: ${selector}`);
            return;
        }

        element.innerHTML = html;
        
        if (animate) {
            this.addAnimationClass(element, 'content-updated');
        }
    }

    /**
     * Показать/скрыть элемент
     * @param {string} selector - CSS селектор
     * @param {boolean} show - Показать элемент
     * @param {string} display - CSS display значение
     */
    toggleVisibility(selector, show, display = 'block') {
        const element = this.getElement(selector);
        if (!element) {
            this.logger.warn(`Element not found: ${selector}`);
            return;
        }

        element.style.display = show ? display : 'none';
    }

    /**
     * Добавить класс анимации
     * @param {Element} element - DOM элемент
     * @param {string} className - Класс анимации
     * @param {number} duration - Длительность анимации
     */
    addAnimationClass(element, className, duration = 500) {
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    /**
     * Создать элемент
     * @param {string} tag - HTML тег
     * @param {Object} attributes - Атрибуты элемента
     * @param {string} content - Содержимое элемента
     * @returns {Element} Созданный элемент
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        // Устанавливаем атрибуты
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        if (content) {
            element.textContent = content;
        }

        return element;
    }

    /**
     * Добавить элемент в контейнер
     * @param {string} containerSelector - Селектор контейнера
     * @param {Element} element - Элемент для добавления
     * @param {boolean} prepend - Добавить в начало
     */
    appendElement(containerSelector, element, prepend = false) {
        const container = this.getElement(containerSelector);
        if (!container) {
            this.logger.warn(`Container not found: ${containerSelector}`);
            return;
        }

        if (prepend) {
            container.insertBefore(element, container.firstChild);
        } else {
            container.appendChild(element);
        }
    }

    /**
     * Очистить контейнер
     * @param {string} selector - CSS селектор контейнера
     */
    clearContainer(selector) {
        const container = this.getElement(selector);
        if (!container) {
            this.logger.warn(`Container not found: ${selector}`);
            return;
        }

        container.innerHTML = '';
    }

    /**
     * Установить значение формы
     * @param {string} selector - CSS селектор поля
     * @param {*} value - Значение
     */
    setFormValue(selector, value) {
        const element = this.getElement(selector);
        if (!element) {
            this.logger.warn(`Form element not found: ${selector}`);
            return;
        }

        if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = Boolean(value);
        } else {
            element.value = value;
        }
    }

    /**
     * Получить значение формы
     * @param {string} selector - CSS селектор поля
     * @returns {*} Значение поля
     */
    getFormValue(selector) {
        const element = this.getElement(selector);
        if (!element) {
            this.logger.warn(`Form element not found: ${selector}`);
            return null;
        }

        if (element.type === 'checkbox' || element.type === 'radio') {
            return element.checked;
        } else {
            return element.value;
        }
    }

    /**
     * Добавить обработчик события
     * @param {string} selector - CSS селектор элемента
     * @param {string} event - Тип события
     * @param {Function} handler - Обработчик события
     * @param {Object} options - Опции обработчика
     */
    addEventListener(selector, event, handler, options = {}) {
        const element = this.getElement(selector);
        if (!element) {
            this.logger.warn(`Element not found for event listener: ${selector}`);
            return;
        }

        element.addEventListener(event, handler, options);
    }

    /**
     * Удалить обработчик события
     * @param {string} selector - CSS селектор элемента
     * @param {string} event - Тип события
     * @param {Function} handler - Обработчик события
     */
    removeEventListener(selector, event, handler) {
        const element = this.getElement(selector);
        if (!element) {
            return;
        }

        element.removeEventListener(event, handler);
    }

    /**
     * Очистить кэш элементов
     */
    clearElementCache() {
        this.elementCache.clear();
        this.logger.debug('Element cache cleared');
    }

    /**
     * Проверить существование элемента
     * @param {string} selector - CSS селектор
     * @returns {boolean} Существует ли элемент
     */
    exists(selector) {
        return this.getElement(selector, false) !== null;
    }

    /**
     * Получить все селекторы из конфигурации
     * @returns {Object} Объект с селекторами
     */
    getSelectors() {
        return this.config.get('selectors', {});
    }
}
