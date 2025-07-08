/**
 * Утилиты для игры Русская Монополия
 * Содержит вспомогательные функции для работы с локализацией, генерации случайных чисел и других операций
 */

class Utils {
    constructor() {
        this.currentLocale = 'ru';
        this.locales = CONFIG.LOCALES;
    }

    /**
     * Устанавливает текущую локаль
     * @param {string} locale - код локали (ru, en)
     */
    setLocale(locale) {
        if (this.locales[locale]) {
            this.currentLocale = locale;
            return true;
        }
        return false;
    }

    /**
     * Получает текст из локализации
     * @param {string} key - ключ текста
     * @param {Object} params - параметры для подстановки
     * @returns {string} локализованный текст
     */
    getText(key, params = {}) {
        const keys = key.split('.');
        let text = this.locales[this.currentLocale];
        
        for (const k of keys) {
            if (text && text[k]) {
                text = text[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        // Подстановка параметров
        if (typeof text === 'string' && Object.keys(params).length > 0) {
            return text.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }

        return text;
    }

    /**
     * Генерирует случайное число в заданном диапазоне
     * @param {number} min - минимальное значение
     * @param {number} max - максимальное значение
     * @returns {number} случайное число
     */
    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Бросает кости (2 кубика)
     * @returns {Object} результат броска {dice1, dice2, total}
     */
    rollDice() {
        const dice1 = this.random(1, 6);
        const dice2 = this.random(1, 6);
        return {
            dice1,
            dice2,
            total: dice1 + dice2,
            isDouble: dice1 === dice2
        };
    }

    /**
     * Форматирует денежную сумму
     * @param {number} amount - сумма
     * @returns {string} отформатированная сумма
     */
    formatMoney(amount) {
        const currency = this.getText('COMMON.MONEY');
        return `${amount.toLocaleString()}${currency}`;
    }

    /**
     * Перемешивает массив
     * @param {Array} array - массив для перемешивания
     * @returns {Array} перемешанный массив
     */
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Выбирает случайный элемент из массива
     * @param {Array} array - массив
     * @returns {*} случайный элемент
     */
    randomChoice(array) {
        if (!array || array.length === 0) return null;
        return array[this.random(0, array.length - 1)];
    }

    /**
     * Проверяет, является ли число четным
     * @param {number} num - число
     * @returns {boolean} true если четное
     */
    isEven(num) {
        return num % 2 === 0;
    }

    /**
     * Проверяет, является ли число нечетным
     * @param {number} num - число
     * @returns {boolean} true если нечетное
     */
    isOdd(num) {
        return num % 2 === 1;
    }

    /**
     * Ограничивает число в заданном диапазоне
     * @param {number} value - значение
     * @param {number} min - минимальное значение
     * @param {number} max - максимальное значение
     * @returns {number} ограниченное значение
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Вычисляет расстояние между двумя точками на игровом поле
     * @param {number} pos1 - позиция 1
     * @param {number} pos2 - позиция 2
     * @returns {number} расстояние
     */
    getDistance(pos1, pos2) {
        const boardSize = CONFIG.GAME.BOARD_SIZE;
        const direct = Math.abs(pos2 - pos1);
        const throughStart = Math.min(pos1, pos2) + (boardSize - Math.max(pos1, pos2));
        return Math.min(direct, throughStart);
    }

    /**
     * Проверяет, прошел ли игрок через СТАРТ
     * @param {number} oldPos - старая позиция
     * @param {number} newPos - новая позиция
     * @returns {boolean} true если прошел через СТАРТ
     */
    passedStart(oldPos, newPos) {
        const startPos = CONFIG.GAME.START_POSITION;
        const boardSize = CONFIG.GAME.BOARD_SIZE;
        
        // Если новая позиция меньше старой и новая позиция меньше СТАРТ
        if (newPos < oldPos && newPos < startPos) {
            return true;
        }
        
        // Если старая позиция больше СТАРТ, а новая меньше
        if (oldPos > startPos && newPos < startPos) {
            return true;
        }
        
        return false;
    }

    /**
     * Создает глубокую копию объекта
     * @param {*} obj - объект для копирования
     * @returns {*} копия объекта
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * Сохраняет данные в localStorage
     * @param {string} key - ключ
     * @param {*} data - данные
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    /**
     * Загружает данные из localStorage
     * @param {string} key - ключ
     * @returns {*} данные или null
     */
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    /**
     * Удаляет данные из localStorage
     * @param {string} key - ключ
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    }

    /**
     * Проверяет поддержку localStorage
     * @returns {boolean} true если поддерживается
     */
    isStorageSupported() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Создает уникальный ID
     * @returns {string} уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Форматирует время в секундах в формат MM:SS
     * @param {number} seconds - секунды
     * @returns {string} отформатированное время
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Дебаунс функция
     * @param {Function} func - функция для выполнения
     * @param {number} wait - время ожидания в мс
     * @returns {Function} дебаунсированная функция
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Троттлинг функция
     * @param {Function} func - функция для выполнения
     * @param {number} limit - лимит времени в мс
     * @returns {Function} троттлированная функция
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Проверяет, находится ли элемент в видимой области
     * @param {Element} element - элемент
     * @returns {boolean} true если видим
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Плавно прокручивает к элементу
     * @param {Element} element - элемент
     * @param {Object} options - опции прокрутки
     */
    scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    /**
     * Создает уведомление
     * @param {string} message - сообщение
     * @param {string} type - тип (success, error, warning, info)
     * @param {number} duration - длительность в мс
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            inset-block-start: 20px;
            right: 20px;
            inset-inline-end: 20px;
            padding: 15px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            max-inline-size: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через указанное время
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    /**
     * Воспроизводит звук
     * @param {string} soundPath - путь к звуковому файлу
     * @param {number} volume - громкость (0-1)
     */
    playSound(soundPath, volume = 0.5) {
        try {
            const audio = new Audio(soundPath);
            audio.volume = volume;
            audio.play().catch(error => {
                console.warn('Error playing sound:', error);
            });
        } catch (error) {
            console.warn('Error creating audio:', error);
        }
    }

    /**
     * Проверяет поддержку WebSocket
     * @returns {boolean} true если поддерживается
     */
    isWebSocketSupported() {
        return typeof WebSocket !== 'undefined';
    }

    /**
     * Проверяет поддержку WebRTC
     * @returns {boolean} true если поддерживается
     */
    isWebRTCSupported() {
        return typeof RTCPeerConnection !== 'undefined';
    }

    /**
     * Получает размер экрана
     * @returns {Object} размеры экрана
     */
    getScreenSize() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth,
            inlineSize: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight,
            blockSize: window.innerHeight || document.documentElement.clientHeight
        };
    }

    /**
     * Проверяет, является ли устройство мобильным
     * @returns {boolean} true если мобильное
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Проверяет, является ли устройство планшетом
     * @returns {boolean} true если планшет
     */
    isTablet() {
        const screenSize = this.getScreenSize();
        return screenSize.width >= 768 && screenSize.width <= 1024;
    }

    /**
     * Получает информацию о браузере
     * @returns {Object} информация о браузере
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (userAgent.includes('Chrome')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Safari')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Edge')) {
            browser = 'Edge';
            version = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
        }
        
        return { browser, version, userAgent };
    }

    /**
     * Экспортирует данные игры
     * @param {Object} gameData - данные игры
     * @param {string} filename - имя файла
     */
    exportGameData(gameData, filename = 'game-save.json') {
        const dataStr = JSON.stringify(gameData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    /**
     * Импортирует данные игры
     * @param {File} file - файл для импорта
     * @returns {Promise<Object>} данные игры
     */
    importGameData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid file format'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Создает статистику игры
     * @param {Object} gameState - состояние игры
     * @returns {Object} статистика
     */
    generateGameStats(gameState) {
        const stats = {
            totalTurns: 0,
            totalMoney: 0,
            propertiesPurchased: 0,
            auctionsWon: 0,
            chanceCardsDrawn: 0,
            treasureCardsDrawn: 0,
            timesInJail: 0,
            timesPassedStart: 0,
            weatherChanges: 0,
            economicEvents: 0,
            culturalEvents: 0,
            gameDuration: 0
        };
        
        // Здесь можно добавить логику подсчета статистики
        // на основе gameState
        
        return stats;
    }
}

// Создаем глобальный экземпляр утилит
const utils = new Utils();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} 