/**
 * Глобальная шина событий для слабой связи между модулями.
 */
class EventBus {
    constructor() {
        this.events = {};
        console.log("EventBus initialized");
    }

    /**
     * Подписаться на событие.
     * @param {string} eventName - Название события.
     * @param {Function} callback - Функция-обработчик.
     * @returns {Function} Функция для отписки.
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
        
        // Возвращаем функцию для отписки
        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Отписаться от события.
     * @param {string} eventName - Название события.
     * @param {Function} callback - Функция-обработчик.
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(
            (eventCallback) => callback !== eventCallback
        );
    }

    /**
     * Опубликовать событие.
     * @param {string} eventName - Название события.
     * @param {*} data - Данные, передаваемые с событием.
     */
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => callback(data));
    }
}

const eventBus = new EventBus();
export default eventBus;