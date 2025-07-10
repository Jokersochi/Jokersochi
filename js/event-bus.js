/**
 * Event Bus для управления событиями в игре
 * Обеспечивает слабую связанность между модулями
 */

class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Подписывается на событие
     * @param {string} event - название события
     * @param {Function} callback - функция обратного вызова
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Отписывается от события
     * @param {string} event - название события
     * @param {Function} callback - функция обратного вызова
     */
    off(event, callback) {
        if (!this.events[event]) return;
        
        const index = this.events[event].indexOf(callback);
        if (index > -1) {
            this.events[event].splice(index, 1);
        }
    }

    /**
     * Генерирует событие
     * @param {string} event - название события
     * @param {*} data - данные события
     */
    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    /**
     * Очищает все события
     */
    clear() {
        this.events = {};
    }

    /**
     * Получает количество подписчиков на событие
     * @param {string} event - название события
     * @returns {number} количество подписчиков
     */
    getListenerCount(event) {
        return this.events[event] ? this.events[event].length : 0;
    }
}

// Создаем глобальный экземпляр EventBus
const eventBus = new EventBus();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = eventBus;
}

export default eventBus; 