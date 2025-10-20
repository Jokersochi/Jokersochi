/**
 * Модуль управления игроками
 * Управляет состоянием игроков, их деньгами, свойствами и действиями
 */
import { CONFIG } from './config.js';
import eventBus from './event-bus.js';

const passedStart = (oldPos, newPos) => newPos < oldPos;

class Player {
    constructor(id, name, token) {
        this.id = id;
        this.name = name;
        this.token = token;
        this.money = CONFIG.GAME.STARTING_MONEY;
        this.position = 0;
        this.properties = [];
        this.inJail = false;
        this.jailTurns = 0;
        this.bankrupt = false;
        this.isCurrentPlayer = false;
        this.doublesCount = 0;
        this.lastRoll = null;
        this.stats = {
            totalRentPaid: 0,
            totalRentReceived: 0,
            propertiesPurchased: 0,
            propertiesSold: 0,
            auctionsWon: 0,
            chanceCardsDrawn: 0,
            treasureCardsDrawn: 0,
            timesInJail: 0,
            timesPassedStart: 0,
            totalMoneyEarned: 0,
            totalMoneySpent: 0
        };
    }

    /**
     * Добавляет деньги игроку
     * @param {number} amount - сумма
     * @param {string} reason - причина (для статистики)
     */
    addMoney(amount, reason = '') {
        if (amount === 0) {
            return true;
        }

        if (amount < 0) {
            return this.removeMoney(-amount, reason);
        }

        this.money += amount;
        this.stats.totalMoneyEarned += amount;

        if (reason === 'rent') {
            this.stats.totalRentReceived += amount;
        }

        if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('moneyChanged', { player: this, amount: this.money, change: amount, reason });
        }

        return true;
    }

    /**
     * Снимает деньги с игрока
     * @param {number} amount - сумма
     * @param {string} reason - причина (для статистики)
     * @returns {boolean} true если достаточно денег
     */
    removeMoney(amount, reason = '') {
        if (amount <= 0) {
            return false;
        }

        if (this.money < amount) {
            return false;
        }
        
        this.money -= amount;
        this.stats.totalMoneySpent += amount;
        
        if (reason === 'rent') {
            this.stats.totalRentPaid += amount;
        }

        if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('moneyChanged', { player: this, amount: this.money, change: -amount, reason });
        }
        return true;
    }

    /**
     * Проверяет, достаточно ли денег у игрока
     * @param {number} amount - требуемая сумма
     * @returns {boolean} true если достаточно
     */
    hasMoney(amount) {
        return this.money >= amount;
    }

    /**
     * Перемещает игрока на новую позицию
     * @param {number} newPosition - новая позиция
     * @param {boolean} passStart - прошел ли через СТАРТ
     */
    moveTo(newPosition, passStart = false) {
        const oldPosition = this.position;
        this.position = newPosition % CONFIG.GAME.BOARD_SIZE;
        
        if (passStart) {
            this.addMoney(CONFIG.GAME.PASS_START_REWARD, 'start');
            this.stats.timesPassedStart++;
        }
    }

    /**
     * Перемещает игрока на определенное количество клеток
     * @param {number} steps - количество шагов
     * @returns {boolean} прошел ли через СТАРТ
     */
    move(steps) {
        const oldPosition = this.position;
        const newPosition = (this.position + steps) % CONFIG.GAME.BOARD_SIZE;
        const passedStartCheck = passedStart(oldPosition, newPosition);
        
        this.moveTo(newPosition, passedStartCheck);
        return passedStartCheck;
    }

    /**
     * Перемещает игрока на конкретную позицию
     * @param {number} position - позиция
     * @param {boolean} collectMoney - получать ли деньги за проход через СТАРТ
     */
    moveToPosition(position, collectMoney = true) {
        const oldPosition = this.position;
        const newPosition = position % CONFIG.GAME.BOARD_SIZE;
        const passedStartCheck = collectMoney && passedStart(oldPosition, newPosition);
        
        this.moveTo(newPosition, passedStartCheck);
    }

    /**
     * Отправляет игрока в тюрьму
     */
    goToJail() {
        this.position = CONFIG.GAME.JAIL_POSITION;
        this.inJail = true;
        this.jailTurns = 0;
        this.stats.timesInJail++;
    }

    /**
     * Освобождает игрока из тюрьмы
     */
    releaseFromJail() {
        this.inJail = false;
        this.jailTurns = 0;
    }

    /**
     * Увеличивает счетчик ходов в тюрьме
     */
    incrementJailTurns() {
        if (this.inJail) {
            this.jailTurns++;
            if (this.jailTurns >= 3) {
                this.releaseFromJail();
            }
        }
    }

    /**
     * Покупает свойство
     * @param {number} position - позиция свойства
     * @param {number} price - цена
     * @returns {boolean} true если покупка успешна
     */
    buyProperty(board, position, price) {
        if (!this.hasMoney(price)) {
            return false;
        }

        if (board.buyCell(position, this.id, price)) {
            this.removeMoney(price, 'property');
            this.properties.push(position);
            this.stats.propertiesPurchased++;
            return true;
        }
        
        return false;
    }

    /**
     * Продает свойство
     * @param {number} position - позиция свойства
     * @returns {number} полученная сумма
     */
    sellProperty(board, position) {
        const sellPrice = board.sellCell(position, this.id);
        if (sellPrice > 0) {
            this.addMoney(sellPrice, 'property_sale');
            this.properties = this.properties.filter(p => p !== position);
            this.stats.propertiesSold++;
        }
        return sellPrice;
    }

    /**
     * Закладывает свойство
     * @param {number} position - позиция свойства
     * @returns {number} полученная сумма
     */
    mortgageProperty(board, position) {
        const mortgageAmount = board.mortgageCell(position, this.id);
        if (mortgageAmount > 0) {
            this.addMoney(mortgageAmount, 'mortgage');
        }
        return mortgageAmount;
    }

    /**
     * Выкупает свойство из залога
     * @param {number} position - позиция свойства
     * @returns {boolean} true если выкуп успешен
     */
    unmortgageProperty(board, position) {
        const unmortgageCost = board.unmortgageCell(position, this.id);
        if (unmortgageCost > 0 && this.hasMoney(unmortgageCost)) {
            this.removeMoney(unmortgageCost, 'unmortgage');
            return true;
        }
        return false;
    }

    /**
     * Добавляет улучшение к свойству
     * @param {number} position - позиция свойства
     * @returns {boolean} true если улучшение добавлено
     */
    addImprovement(board, position) {
        const cost = CONFIG.IMPROVEMENT.COST_PER_LEVEL;
        if (!this.hasMoney(cost)) {
            return false;
        }

        if (board.addImprovement(position, this.id)) {
            this.removeMoney(cost, 'improvement');
            return true;
        }
        return false;
    }

    /**
     * Удаляет улучшение с свойства
     * @param {number} position - позиция свойства
     * @returns {number} полученная сумма
     */
    removeImprovement(board, position) {
        const sellPrice = CONFIG.IMPROVEMENT.COST_PER_LEVEL / 2;
        if (board.removeImprovement(position, this.id)) {
            this.addMoney(sellPrice, 'improvement_sale');
            return sellPrice;
        }
        return 0;
    }

    /**
     * Строит резиденцию
     * @param {number} position - позиция свойства
     * @returns {boolean} true если резиденция построена
     */
    buildResidence(board, position) {
        const cost = CONFIG.RESIDENCE.BUILD_COST;
        if (!this.hasMoney(cost)) {
            return false;
        }

        if (board.buildResidence(position, this.id)) {
            this.removeMoney(cost, 'residence');
            return true;
        }
        return false;
    }

    /**
     * Получает все свойства игрока
     * @returns {Array} массив позиций свойств
     */
    getProperties() {
        return this.properties;
    }

    /**
     * Получает все незаложенные свойства игрока
     * @returns {Array} массив позиций незаложенных свойств
     */
    getUnmortgagedProperties(board) {
        return this.properties.filter(position => {
            const cell = board.getCell(position);
            return cell && !cell.mortgaged;
        });
    }

    /**
     * Получает все заложенные свойства игрока
     * @returns {Array} массив позиций заложенных свойств
     */
    getMortgagedProperties(board) {
        return this.properties.filter(position => {
            const cell = board.getCell(position);
            return cell && cell.mortgaged;
        });
    }

    /**
     * Получает общую стоимость всех свойств игрока
     * @returns {number} общая стоимость
     */
    getTotalPropertyValue(board) {
        let total = 0;

        this.properties.forEach(position => {
            const cell = board.getCell(position);
            if (cell) {
                total += cell.price;

                // Добавляем стоимость улучшений
                total += cell.improvements * CONFIG.IMPROVEMENT.COST_PER_LEVEL;

                // Добавляем стоимость резиденции
                if (cell.residence) {
                    total += CONFIG.RESIDENCE.BUILD_COST;
                }
            }
        });

        return total;
    }

    /**
     * Получает общую стоимость активов игрока
     * @returns {number} общая стоимость активов
     */
    getTotalAssets(board) {
        return this.money + this.getTotalPropertyValue(board);
    }

    /**
     * Проверяет, может ли игрок платить аренду
     * @param {number} rentAmount - сумма аренды
     * @returns {boolean} true если может платить
     */
    canPayRent(board, rentAmount) {
        if (this.money >= rentAmount) {
            return true;
        }

        // Проверяем, может ли игрок продать что-то для оплаты
        const unmortgagedProperties = this.getUnmortgagedProperties(board);
        let totalSellableValue = 0;
        
        unmortgagedProperties.forEach(position => {
            const cell = board.getCell(position);
            if (cell) {
                totalSellableValue += cell.price / 2; // Продажа за половину цены
                totalSellableValue += cell.improvements * CONFIG.IMPROVEMENT.COST_PER_LEVEL / 2;
                if (cell.residence) {
                    totalSellableValue += CONFIG.RESIDENCE.BUILD_COST / 2;
                }
            }
        });

        return (this.money + totalSellableValue) >= rentAmount;
    }

    /**
     * Проверяет банкротство игрока
     * @returns {boolean} true если игрок банкрот
     */
    checkBankruptcy(board) {
        if (this.money < 0 && this.getTotalAssets(board) <= 0) {
            this.bankrupt = true;
            this.stats.totalMoneySpent += Math.abs(this.money);
            this.money = 0;
            return true;
        }
        return false;
    }

    /**
     * Объявляет банкротство
     */
    declareBankruptcy() {
        this.bankrupt = true;
        this.money = 0;
        this.properties = [];
    }

    /**
     * Получает статистику игрока
     * @returns {Object} статистика
     */
    getStats(board) {
        return {
            ...this.stats,
            totalAssets: this.getTotalAssets(board),
            totalProperties: this.properties.length,
            unmortgagedProperties: this.getUnmortgagedProperties(board).length,
            mortgagedProperties: this.getMortgagedProperties(board).length,
            netWorth: this.getTotalAssets(board) - CONFIG.GAME.STARTING_MONEY
        };
    }

    /**
     * Сохраняет состояние игрока
     * @returns {Object} состояние игрока
     */
    saveState() {
        return {
            id: this.id,
            name: this.name,
            token: this.token,
            money: this.money,
            position: this.position,
            properties: [...this.properties],
            inJail: this.inJail,
            jailTurns: this.jailTurns,
            bankrupt: this.bankrupt,
            isCurrentPlayer: this.isCurrentPlayer,
            doublesCount: this.doublesCount,
            lastRoll: this.lastRoll,
            stats: { ...this.stats }
        };
    }

    /**
     * Восстанавливает состояние игрока
     * @param {Object} state - состояние игрока
     */
    loadState(state) {
        this.id = state.id;
        this.name = state.name;
        this.token = state.token;
        this.money = state.money;
        this.position = state.position;
        this.properties = [...state.properties];
        this.inJail = state.inJail;
        this.jailTurns = state.jailTurns;
        this.bankrupt = state.bankrupt;
        this.isCurrentPlayer = state.isCurrentPlayer;
        this.doublesCount = state.doublesCount;
        this.lastRoll = state.lastRoll;
        this.stats = { ...state.stats };
    }
}

// Экспорт для использования в других модулей
export { Player };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
} 