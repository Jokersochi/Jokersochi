/**
 * Модуль управления игроками
 * Управляет состоянием игроков, их деньгами, свойствами и действиями
 */

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
        this.turnOrder = 0;
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
        this.money += amount;
        this.stats.totalMoneyEarned += amount;
        
        if (reason === 'rent') {
            this.stats.totalRentReceived += amount;
        }
        
        // Обновляем UI
        this.updateMoneyDisplay();
    }

    /**
     * Снимает деньги с игрока
     * @param {number} amount - сумма
     * @param {string} reason - причина (для статистики)
     * @returns {boolean} true если достаточно денег
     */
    removeMoney(amount, reason = '') {
        if (this.money < amount) {
            return false;
        }
        
        this.money -= amount;
        this.stats.totalMoneySpent += amount;
        
        if (reason === 'rent') {
            this.stats.totalRentPaid += amount;
        }
        
        // Обновляем UI
        this.updateMoneyDisplay();
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
            this.addMoney(2000, 'start');
            this.stats.timesPassedStart++;
        }
        
        // Обновляем позицию фишки на поле
        this.updateTokenPosition();
    }

    /**
     * Перемещает игрока на определенное количество клеток
     * @param {number} steps - количество шагов
     * @returns {boolean} прошел ли через СТАРТ
     */
    move(steps) {
        const oldPosition = this.position;
        const newPosition = (this.position + steps) % CONFIG.GAME.BOARD_SIZE;
        const passedStart = utils.passedStart(oldPosition, newPosition);
        
        this.moveTo(newPosition, passedStart);
        return passedStart;
    }

    /**
     * Перемещает игрока на конкретную позицию
     * @param {number} position - позиция
     * @param {boolean} collectMoney - получать ли деньги за проход через СТАРТ
     */
    moveToPosition(position, collectMoney = true) {
        const oldPosition = this.position;
        const newPosition = position % CONFIG.GAME.BOARD_SIZE;
        const passedStart = collectMoney && utils.passedStart(oldPosition, newPosition);
        
        this.moveTo(newPosition, passedStart);
    }

    /**
     * Отправляет игрока в тюрьму
     */
    goToJail() {
        this.position = CONFIG.GAME.JAIL_POSITION;
        this.inJail = true;
        this.jailTurns = 0;
        this.stats.timesInJail++;
        this.updateTokenPosition();
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
    buyProperty(position, price) {
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
    sellProperty(position) {
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
    mortgageProperty(position) {
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
    unmortgageProperty(position) {
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
    addImprovement(position) {
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
    removeImprovement(position) {
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
    buildResidence(position) {
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
    getUnmortgagedProperties() {
        return this.properties.filter(position => {
            const cell = board.getCell(position);
            return cell && !cell.mortgaged;
        });
    }

    /**
     * Получает все заложенные свойства игрока
     * @returns {Array} массив позиций заложенных свойств
     */
    getMortgagedProperties() {
        return this.properties.filter(position => {
            const cell = board.getCell(position);
            return cell && cell.mortgaged;
        });
    }

    /**
     * Получает общую стоимость всех свойств игрока
     * @returns {number} общая стоимость
     */
    getTotalPropertyValue() {
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
    getTotalAssets() {
        return this.money + this.getTotalPropertyValue();
    }

    /**
     * Проверяет, может ли игрок платить аренду
     * @param {number} rentAmount - сумма аренды
     * @returns {boolean} true если может платить
     */
    canPayRent(rentAmount) {
        if (this.money >= rentAmount) {
            return true;
        }
        
        // Проверяем, может ли игрок продать что-то для оплаты
        const unmortgagedProperties = this.getUnmortgagedProperties();
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
     * Платит аренду другому игроку
     * @param {number} rentAmount - сумма аренды
     * @param {Player} owner - владелец собственности
     * @returns {boolean} true если оплата успешна
     */
    payRent(rentAmount, owner) {
        if (!this.canPayRent(rentAmount)) {
            return false;
        }
        
        if (this.removeMoney(rentAmount, 'rent')) {
            owner.addMoney(rentAmount, 'rent');
            return true;
        }
        
        return false;
    }

    /**
     * Проверяет банкротство игрока
     * @returns {boolean} true если игрок банкрот
     */
    checkBankruptcy() {
        if (this.money < 0 && this.getTotalAssets() <= 0) {
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
    getStats() {
        return {
            ...this.stats,
            totalAssets: this.getTotalAssets(),
            totalProperties: this.properties.length,
            unmortgagedProperties: this.getUnmortgagedProperties().length,
            mortgagedProperties: this.getMortgagedProperties().length,
            netWorth: this.getTotalAssets() - CONFIG.GAME.STARTING_MONEY
        };
    }

    /**
     * Обновляет отображение денег игрока в UI
     */
    updateMoneyDisplay() {
        const playerElement = document.querySelector(`[data-player="${this.id}"]`);
        if (playerElement) {
            const moneyElement = playerElement.querySelector('.player-money');
            if (moneyElement) {
                moneyElement.textContent = utils.formatMoney(this.money);
                moneyElement.classList.add('changing');
                setTimeout(() => {
                    moneyElement.classList.remove('changing');
                }, 600);
            }
        }
    }

    /**
     * Обновляет позицию фишки игрока на поле
     */
    updateTokenPosition(animated = false) {
        const tokenElement = document.querySelector(`[data-player="${this.id}"]`);
        if (tokenElement) {
            // Вычисляем позицию на игровом поле
            const boardSize = CONFIG.GAME.BOARD_SIZE;
            const cellSize = 60; // Размер клетки в пикселях
            
            let x, y;
            
            if (this.position <= 10) {
                // Верхний ряд
                x = (10 - this.position) * cellSize;
                y = 0;
            } else if (this.position <= 20) {
                // Правый ряд
                x = 0;
                y = (this.position - 10) * cellSize;
            } else if (this.position <= 30) {
                // Нижний ряд
                x = (this.position - 20) * cellSize;
                y = 10 * cellSize;
            } else {
                // Левый ряд
                x = 10 * cellSize;
                y = (40 - this.position) * cellSize;
            }
            
            // Добавляем небольшое смещение для разных игроков
            const offset = (this.id - 1) * 20;
            x += offset;
            y += offset;
            
            tokenElement.style.transition = animated ? 'left 0.18s, top 0.18s' : '';
            tokenElement.style.left = `${x}px`;
            tokenElement.style.top = `${y}px`;
            if (animated) {
                tokenElement.classList.add('moving');
                setTimeout(() => {
                    tokenElement.classList.remove('moving');
                    tokenElement.style.transition = '';
                }, 200);
            }
        }
    }

    /**
     * Устанавливает игрока как текущего
     * @param {boolean} isCurrent - является ли текущим
     */
    setCurrentPlayer(isCurrent) {
        this.isCurrentPlayer = isCurrent;
        
        const playerElement = document.querySelector(`[data-player="${this.id}"]`);
        if (playerElement) {
            if (isCurrent) {
                playerElement.classList.add('active');
            } else {
                playerElement.classList.remove('active');
            }
        }
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
            turnOrder: this.turnOrder,
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
        this.turnOrder = state.turnOrder;
        this.isCurrentPlayer = state.isCurrentPlayer;
        this.doublesCount = state.doublesCount;
        this.lastRoll = state.lastRoll;
        this.stats = { ...state.stats };
        
        // Обновляем UI
        this.updateMoneyDisplay();
        this.updateTokenPosition();
        this.setCurrentPlayer(this.isCurrentPlayer);
    }

    /**
     * Анимирует перемещение фишки игрока по маршруту (от from до to)
     * @param {number} from - начальная позиция
     * @param {number} to - конечная позиция
     * @param {function} onStep - вызывается после каждого шага
     * @returns {Promise}
     */
    animateTokenMove = async function(from, to, onStep) {
        const steps = (to >= from) ? (to - from) : (40 - from + to);
        let pos = from;
        for (let i = 0; i < steps; i++) {
            pos = (pos + 1) % 40;
            this.position = pos;
            this.updateTokenPosition(true); // true = анимировать
            if (typeof onStep === 'function') onStep(pos);
            await new Promise(res => setTimeout(res, 220));
        }
        // Визуальный эффект на конечной клетке
        const cellDiv = document.querySelector(`.board-cell[data-cell-idx='${pos}']`);
        if (cellDiv) {
            cellDiv.classList.add('cell-active');
            setTimeout(() => cellDiv.classList.remove('cell-active'), 700);
        }
        // Bounce-анимация для токена
        const tokenElement = document.querySelector(`[data-player='${this.id}']`);
        if (tokenElement) {
            tokenElement.classList.add('token-bounce');
            setTimeout(() => tokenElement.classList.remove('token-bounce'), 500);
        }
    };
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
} 