/**
 * Модуль игрового поля
 * Управляет клетками, свойствами и их состояниями
 */

import { showNotification } from './ui-utils.js';
import { getText } from './localization.js';
import { randomChoice } from './random.js';
import { CONFIG } from './config.js';

class Board {
    constructor() {
        this.cells = [];
        this.properties = new Map();
        this.weather = 'sunny';
        this.economicEvent = null;
        this.culturalEvent = null;
        this.weatherTimer = 0;
        this.eventTimer = 0;
        
        this.initializeBoard();
    }

    /**
     * Инициализирует игровое поле
     */
    initializeBoard() {
        // Создаем все клетки
        for (let i = 0; i < CONFIG.GAME.BOARD_SIZE; i++) {
            this.cells[i] = this.createCell(i);
        }

        // Инициализируем свойства
        CONFIG.PROPERTIES.forEach(propertyData => {
            this.properties.set(propertyData.position, {
                ...propertyData,
                owner: null,
                mortgaged: false,
                improvements: 0,
                residence: false
            });
        });
    }

    /**
     * Создает клетку по позиции
     * @param {number} position - позиция клетки
     * @returns {Object} объект клетки
     */
    createCell(position) {
        const cell = {
            position,
            type: this.getCellType(position),
            name: this.getCellName(position),
            price: this.getCellPrice(position),
            color: this.getCellColor(position),
            rent: this.getCellRent(position),
            owner: null,
            mortgaged: false,
            improvements: 0,
            residence: false
        };

        return cell;
    }

    /**
     * Определяет тип клетки по позиции
     * @param {number} position - позиция
     * @returns {string} тип клетки
     */
    getCellType(position) {
        // Угловые клетки
        if (position === 0) return 'start';
        if (position === 9) return 'jail';
        if (position === 20) return 'free_parking';
        if (position === 30) return 'go_to_jail';

        // Клетки Шанс (примерные позиции)
        if ([7, 22, 36].includes(position)) return 'chance';

        // Клетки Казна (примерные позиции)
        if ([2, 17, 33].includes(position)) return 'treasure';

        // Налоговые клетки
        if ([4, 38].includes(position)) return 'tax';

        // Свойства
        return 'property';
    }

    /**
     * Получает название клетки
     * @param {number} position - позиция
     * @returns {string} название
     */
    getCellName(position) {
        const property = CONFIG.PROPERTIES.find(p => p.position === position);
        if (property) return property.name;

        // Специальные клетки
        switch (position) {
            case 0: return getText('COMMON.START');
            case 9: return getText('COMMON.JAIL');
            case 20: return getText('COMMON.FREE_PARKING');
            case 30: return getText('COMMON.GO_TO_JAIL');
            case 7:
            case 22:
            case 36: return getText('COMMON.CHANCE');
            case 2:
            case 17:
            case 33: return getText('COMMON.TREASURE');
            case 4:
            case 38: return getText('COMMON.TAX');
            default: return `Клетка ${position}`;
        }
    }

    /**
     * Получает цену клетки
     * @param {number} position - позиция
     * @returns {number} цена
     */
    getCellPrice(position) {
        const property = CONFIG.PROPERTIES.find(p => p.position === position);
        if (property) return property.price;

        // Налоговые клетки
        if (position === 4) return 200;
        if (position === 38) return 1000;

        return 0;
    }

    /**
     * Получает цвет клетки
     * @param {number} position - позиция
     * @returns {string} цвет
     */
    getCellColor(position) {
        const property = CONFIG.PROPERTIES.find(p => p.position === position);
        return property ? property.color : null;
    }

    /**
     * Получает арендную плату клетки
     * @param {number} position - позиция
     * @returns {Array} массив арендных плат
     */
    getCellRent(position) {
        const property = CONFIG.PROPERTIES.find(p => p.position === position);
        return property ? property.rent : [];
    }

    /**
     * Получает клетку по позиции
     * @param {number} position - позиция
     * @returns {Object} клетка
     */
    getCell(position) {
        return this.cells[position] || null;
    }

    /**
     * Получает все клетки определенного цвета
     * @param {string} color - цвет
     * @returns {Array} массив клеток
     */
    getCellsByColor(color) {
        return this.cells.filter(cell => cell.color === color);
    }

    /**
     * Проверяет, принадлежат ли все клетки одного цвета одному игроку
     * @param {string} color - цвет
     * @param {number} playerId - ID игрока
     * @returns {boolean} true если все клетки принадлежат игроку
     */
    hasColorMonopoly(color, playerId) {
        const colorCells = this.getCellsByColor(color);
        return colorCells.length > 0 && colorCells.every(cell => cell.owner === playerId);
    }

    /**
     * Получает количество клеток определенного цвета у игрока
     * @param {string} color - цвет
     * @param {number} playerId - ID игрока
     * @returns {number} количество клеток
     */
    getPlayerColorCount(color, playerId) {
        const colorCells = this.getCellsByColor(color);
        return colorCells.filter(cell => cell.owner === playerId).length;
    }

    /**
     * Покупает клетку
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @param {number} price - цена покупки
     * @returns {boolean} true если покупка успешна
     */
    buyCell(position, playerId, price) {
        const cell = this.getCell(position);
        if (!cell || cell.type !== 'property' || cell.owner !== null) {
            return false;
        }

        cell.owner = playerId;
        cell.mortgaged = false;
        cell.improvements = 0;
        cell.residence = false;

        return true;
    }

    /**
     * Продает клетку
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @returns {number} стоимость продажи
     */
    sellCell(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId) {
            return 0;
        }

        let sellPrice = cell.price / 2; // Продажа за половину цены

        // Возврат стоимости улучшений
        if (cell.improvements > 0) {
            sellPrice += cell.improvements * CONFIG.IMPROVEMENT.COST_PER_LEVEL / 2;
        }

        // Возврат стоимости резиденции
        if (cell.residence) {
            sellPrice += CONFIG.RESIDENCE.BUILD_COST / 2;
        }

        cell.owner = null;
        cell.mortgaged = false;
        cell.improvements = 0;
        cell.residence = false;

        return Math.floor(sellPrice);
    }

    /**
     * Передает собственность от одного игрока другому.
     * @param {number} position - позиция клетки.
     * @param {string} fromPlayerId - ID игрока, передающего собственность.
     * @param {string} toPlayerId - ID игрока, получающего собственность.
     * @returns {boolean} true если передача успешна.
     */
    transferProperty(position, fromPlayerId, toPlayerId) {
        const cell = this.getCell(position);
        if (!cell || cell.type !== 'property' || cell.owner !== fromPlayerId) {
            return false;
        }

        cell.owner = toPlayerId;
        return true;
    }

    /**
     * Закладывает клетку
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @returns {number} сумма залога
     */
    mortgageCell(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId || cell.mortgaged) {
            return 0;
        }

        // Нельзя закладывать клетки с улучшениями или резиденциями
        if (cell.improvements > 0 || cell.residence) {
            return 0;
        }

        cell.mortgaged = true;
        return Math.floor(cell.price / 2);
    }

    /**
     * Выкупает клетку из залога
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @returns {number} стоимость выкупа
     */
    unmortgageCell(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId || !cell.mortgaged) {
            return 0;
        }

        const unmortgageCost = Math.floor(cell.price / 2 * 1.1); // 10% надбавка
        cell.mortgaged = false;
        return unmortgageCost;
    }

    /**
     * Добавляет улучшение к клетке
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @returns {boolean} true если улучшение добавлено
     */
    addImprovement(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId || cell.mortgaged) {
            return false;
        }

        // Проверяем, что у игрока есть монополия на этот цвет
        if (!this.hasColorMonopoly(cell.color, playerId)) {
            return false;
        }

        // Проверяем лимит улучшений
        if (cell.improvements >= CONFIG.IMPROVEMENT.MAX_LEVEL) {
            return false;
        }

        // Проверяем равномерность улучшений
        const colorCells = this.getCellsByColor(cell.color);
        const maxImprovements = Math.min(...colorCells.map(c => c.improvements));
        if (cell.improvements > maxImprovements) {
            return false;
        }

        cell.improvements++;
        return true;
    }

    /**
     * Удаляет улучшение с клетки
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @returns {boolean} true если улучшение удалено
     */
    removeImprovement(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId || cell.improvements <= 0) {
            return false;
        }

        cell.improvements--;
        return true;
    }

    /**
     * Строит резиденцию
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока
     * @returns {boolean} true если резиденция построена
     */
    buildResidence(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId || cell.mortgaged) {
            return false;
        }

        // Проверяем, что у игрока есть монополия на этот цвет
        if (!this.hasColorMonopoly(cell.color, playerId)) {
            return false;
        }

        // Проверяем, что все клетки этого цвета имеют максимальные улучшения
        const colorCells = this.getCellsByColor(cell.color);
        const allMaxImprovements = colorCells.every(c => c.improvements >= CONFIG.IMPROVEMENT.MAX_LEVEL);
        if (!allMaxImprovements) {
            return false;
        }

        // Проверяем, что резиденция еще не построена
        if (cell.residence) {
            return false;
        }

        cell.residence = true;
        return true;
    }

    /**
     * Вычисляет арендную плату
     * @param {number} position - позиция
     * @param {number} playerId - ID игрока (владелец)
     * @returns {number} арендная плата
     */
    calculateRent(position, playerId) {
        const cell = this.getCell(position);
        if (!cell || cell.owner !== playerId || cell.mortgaged) {
            return 0;
        }

        let rent = cell.rent[cell.improvements] || 0;

        // Множитель резиденции
        if (cell.residence) {
            rent *= CONFIG.RESIDENCE.RENT_MULTIPLIER;
        }

        // Множитель монополии (если есть все клетки одного цвета)
        if (this.hasColorMonopoly(cell.color, playerId)) {
            rent *= 1.5;
        }

        // Влияние погоды (используем массив WEATHER)
        const weather = CONFIG.WEATHER.find(w => w.type === this.weather);
        if (weather && weather.effects && typeof weather.effects.rent === 'number') {
            rent *= weather.effects.rent;
        }

        // Влияние экономических событий (по данным из CONFIG)
        if (this.economicEvent) {
            const econ = CONFIG.ECONOMIC_EVENTS.find(e => e.type === this.economicEvent.type || e.id === this.economicEvent.id);
            const multiplier = econ?.income ?? this.economicEvent.income ?? this.economicEvent.multiplier;
            if (typeof multiplier === 'number') {
                rent *= multiplier;
            }
        }

        // Влияние культурных событий (flat bonus если указан bonus)
        if (this.culturalEvent) {
            const cult = CONFIG.CULTURAL_EVENTS.find(c => c.type === this.culturalEvent.type || c.id === this.culturalEvent.id);
            const bonus = cult?.bonus ?? this.culturalEvent.bonus;
            if (typeof bonus === 'number') {
                rent += bonus;
            }
        }

        return Math.floor(rent);
    }

    /**
     * Обновляет погоду
     */
    updateWeather() {
        this.weatherTimer++;
        const changeInterval = CONFIG.WEATHER_CHANGE_INTERVAL || 10;
        if (this.weatherTimer >= changeInterval) {
            this.weatherTimer = 0;
            const newWeather = randomChoice(CONFIG.WEATHER);
            if (newWeather) {
                this.weather = newWeather.type;
            }
            const weatherName = newWeather ? newWeather.name : this.weather;
            showNotification(
                getText('MESSAGES.WEATHER_CHANGE', { weather: weatherName }),
                'info'
            );
        }
    }

    /**
     * Обновляет экономические события
     */
    updateEconomicEvents() {
        this.eventTimer++;
        
        // Проверяем вероятность экономического события
        if (Math.random() < (CONFIG.ECONOMIC_EVENT_FREQUENCY || 0.1) && !this.economicEvent) {
            const event = randomChoice(CONFIG.ECONOMIC_EVENTS);
            if (event) {
                this.economicEvent = {
                    ...event,
                    duration: event.duration ?? CONFIG.ECONOMIC_EVENT_DURATION
                };
            }
            
            showNotification(
                getText('MESSAGES.' + (event?.type || event?.id || 'event').toString().toUpperCase()),
                (event?.type || event?.id) === 'boom' ? 'success' : 'warning'
            );
        }

        // Уменьшаем длительность события
        if (this.economicEvent) {
            this.economicEvent.duration--;
            if (this.economicEvent.duration <= 0) {
                this.economicEvent = null;
            }
        }
    }

    /**
     * Обновляет культурные события
     */
    updateCulturalEvents() {
        // Проверяем вероятность культурного события
        if (Math.random() < (CONFIG.CULTURAL_EVENT_FREQUENCY || 0.05) && !this.culturalEvent) {
            const event = randomChoice(CONFIG.CULTURAL_EVENTS);
            if (event) {
                this.culturalEvent = {
                    ...event,
                    duration: event.duration ?? CONFIG.CULTURAL_EVENT_DURATION
                };
            }
            
            showNotification(
                getText('MESSAGES.CULTURAL_FESTIVAL'),
                'info'
            );
        }

        // Уменьшаем длительность события
        if (this.culturalEvent) {
            this.culturalEvent.duration--;
            if (this.culturalEvent.duration <= 0) {
                this.culturalEvent = null;
            }
        }
    }

    /**
     * Обновляет состояние игрового поля
     */
    update() {
        this.updateWeather();
        this.updateEconomicEvents();
        this.updateCulturalEvents();
    }

    /**
     * Получает состояние игрового поля для сохранения
     * @returns {Object} состояние поля
     */
    getState() {
        return {
            cells: this.cells,
            weather: this.weather,
            economicEvent: this.economicEvent,
            culturalEvent: this.culturalEvent,
            weatherTimer: this.weatherTimer,
            eventTimer: this.eventTimer
        };
    }

    /**
     * Восстанавливает состояние игрового поля
     * @param {Object} state - состояние поля
     */
    setState(state) {
        this.cells = state.cells || [];
        this.weather = state.weather || 'sunny';
        this.economicEvent = state.economicEvent || null;
        this.culturalEvent = state.culturalEvent || null;
        this.weatherTimer = state.weatherTimer || 0;
        this.eventTimer = state.eventTimer || 0;
    }

    /**
     * Получает статистику игрового поля
     * @returns {Object} статистика
     */
    getStats() {
        const stats = {
            totalProperties: CONFIG.PROPERTIES.length,
            ownedProperties: 0,
            mortgagedProperties: 0,
            totalImprovements: 0,
            totalResidences: 0,
            colorMonopolies: 0
        };

        this.cells.forEach(cell => {
            if (cell.owner !== null) {
                stats.ownedProperties++;
                if (cell.mortgaged) stats.mortgagedProperties++;
                stats.totalImprovements += cell.improvements;
                if (cell.residence) stats.totalResidences++;
            }
        });

        // Подсчет монополий
        const colors = [...new Set(CONFIG.PROPERTIES.map(p => p.color))];
        colors.forEach(color => {
            const colorCells = this.getCellsByColor(color);
            if (colorCells.length > 0) {
                const owners = [...new Set(colorCells.map(c => c.owner).filter(o => o !== null))];
                if (owners.length === 1) {
                    stats.colorMonopolies++;
                }
            }
        });

        return stats;
    }
}

// Создаем глобальный экземпляр игрового поля
const board = new Board();

// Экспорт для использования в других модулях
export { Board, board };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Board;
}
