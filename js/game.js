/**
 * Улучшенный основной модуль игры
 * Управляет игровым процессом, ходами игроков и общей логикой игры
 */

import { getText } from './localization.js';
import { formatMoney, generateId } from './utils.js';
import { saveToStorage, loadFromStorage } from './storage.js';
import { randomChoice, rollDice } from './random.js';
import { showToast, showNotification, escapeHTML, passedStart } from './ui-utils.js';
// TODO: escapeHTML, showToast, randomInt, passedStart — реализовать/импортировать отдельно

// Временные заглушки для отсутствующих функций
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const showToast = (msg) => alert(msg); // Временно alert
const passedStart = (oldPos, newPos) => newPos < oldPos;

class Game {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting'; // waiting, playing, paused, finished
        this.turnNumber = 0;
        this.dice = { dice1: 0, dice2: 0, total: 0, isDouble: false };
        this.auction = null;
        this.chat = [];
        this.settings = { ...CONFIG.DEFAULT_SETTINGS };
        this.gameHistory = [];
        
        // Новые улучшения
        this.weather = { type: 'sunny', duration: 0, effects: {} };
        this.economicEvent = null;
        this.culturalEvent = null;
        this.tradeOffers = [];
        this.alliances = [];
        this.tournament = null;
        this.achievements = [];
        this.statistics = {
            totalGames: 0,
            totalTurns: 0,
            totalMoney: 0,
            totalProperties: 0,
            totalAuctions: 0,
            totalTrades: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            diceRolls: 0
        };
        
        this.initializeGame();
    }

    /**
     * Инициализирует игру
     */
    initializeGame() {
        // Инициализируем игровое поле
        this.board = board;
        
        // Загружаем настройки
        this.loadSettings();
        
        // Инициализируем чат
        this.initializeChat();
        
        // Инициализируем аукционы
        this.initializeAuctions();
        
        // Инициализируем погоду
        this.initializeWeather();
        
        // Инициализируем события
        this.initializeEvents();
        
        // Инициализируем торговлю
        this.initializeTrading();
        
        // Инициализируем альянсы
        this.initializeAlliances();
        
        // Инициализируем турниры
        this.initializeTournaments();
        
        // Инициализируем достижения
        this.initializeAchievements();

        // В самом начале инициализации игры (например, в конструкторе или initializeGame)
        if (window.localStorage) {
            const saved = localStorage.getItem('monopoly-autosave');
            if (saved) {
                setTimeout(() => {
                    if (confirm('Обнаружена сохранённая игра. Продолжить?')) {
                        try {
                            this.loadGame(JSON.parse(saved));
                        } catch (e) { alert('Ошибка восстановления игры!'); }
                    } else {
                        localStorage.removeItem('monopoly-autosave');
                    }
                }, 200);
            }
        }
    }

    /**
     * Создает новую игру
     * @param {Array} playerData - данные игроков
     */
    startNewGame(playerData) {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.turnNumber = 0;
        this.gameState = 'playing';
        this.gameHistory = [];
        
        // Создаем игроков
        playerData.forEach((data, index) => {
            const player = new Player(data.id, data.name, data.token);
            player.turnOrder = index;
            this.players.push(player);
        });
        
        // Устанавливаем первого игрока как текущего
        this.setCurrentPlayer(0);
        
        // Инициализируем игровое поле
        this.board.initializeBoard();
        
        // Инициализируем погоду
        this.updateWeather();
        
        // Инициализируем события
        this.updateEvents();
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.GAME_START', { 
            player: this.players[0].name 
        }));
        
        // Обновляем UI
        this.updateGameUI();
        
        // Автосохранение
        if (this.settings.autoSave) {
            this.saveGame();
        }
        
        // Запускаем игровой цикл
        this.startGameLoop();
        this.statistics.gamesPlayed++;
    }

    /**
     * Запускает игровой цикл
     */
    startGameLoop() {
        this.gameLoop = setInterval(() => {
            if (this.gameState === 'playing') {
                this.updateGameLoop();
            }
        }, 1000); // Обновление каждую секунду
    }

    /**
     * Обновляет игровой цикл
     */
    updateGameLoop() {
        // Обновляем погоду
        this.updateWeather();
        
        // Обновляем события
        this.updateEvents();
        
        // Обновляем аукционы
        this.updateAuctions();
        
        // Обновляем торговлю
        this.updateTrading();
        
        // Обновляем альянсы
        this.updateAlliances();
        
        // Обновляем турниры
        this.updateTournaments();
        
        // Обновляем достижения
        this.updateAchievements();
        
        // Обновляем статистику
        this.updateStatistics();
    }

    /**
     * Инициализирует погодную систему
     */
    initializeWeather() {
        this.weather = {
            type: 'sunny',
            duration: 0,
            effects: {},
            intensity: 1
        };
    }

    /**
     * Обновляет погоду
     */
    updateWeather() {
        // Каждые 5 ходов меняем погоду
        if (this.turnNumber % 5 === 0 && this.turnNumber > 0) {
            this.changeWeather();
        }
        
        // Применяем эффекты погоды
        this.applyWeatherEffects();
    }

    /**
     * Меняет погоду
     */
    changeWeather() {
        const weatherTypes = CONFIG.WEATHER;
        const newWeather = weatherTypes[randomInt(0, weatherTypes.length - 1)];
        
        this.weather = {
            type: newWeather.type,
            duration: newWeather.duration || 3,
            effects: newWeather.effects || {},
            intensity: newWeather.intensity || 1
        };
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.WEATHER_CHANGE', {
            weather: getText(`WEATHER.${newWeather.type.toUpperCase()}`)
        }));
        
        // Обновляем отображение погоды
        this.updateWeatherDisplay();
    }

    /**
     * Применяет эффекты погоды
     */
    applyWeatherEffects() {
        if (!this.weather.effects) return;
        
        this.players.forEach(player => {
            if (player.bankrupt) return;
            
            // Эффекты на арендную плату
            if (this.weather.effects.rent) {
                player.properties.forEach(property => {
                    if (property.rent) {
                        property.rent *= this.weather.effects.rent;
                    }
                });
            }
            
            // Эффекты на движение
            if (this.weather.effects.movement) {
                player.movementModifier = this.weather.effects.movement;
            }
            
            // Эффекты на строительство
            if (this.weather.effects.building) {
                player.buildingModifier = this.weather.effects.building;
            }
        });
    }

    /**
     * Инициализирует систему событий
     */
    initializeEvents() {
        this.economicEvent = null;
        this.culturalEvent = null;
        this.eventHistory = [];
    }

    /**
     * Обновляет события
     */
    updateEvents() {
        // Экономические события каждые 10 ходов
        if (this.turnNumber % 10 === 0 && this.turnNumber > 0) {
            this.triggerEconomicEvent();
        }
        
        // Культурные события каждые 15 ходов
        if (this.turnNumber % 15 === 0 && this.turnNumber > 0) {
            this.triggerCulturalEvent();
        }
    }

    /**
     * Запускает экономическое событие
     */
    triggerEconomicEvent() {
        const events = CONFIG.ECONOMIC_EVENTS;
        const event = events[randomInt(0, events.length - 1)];
        
        this.economicEvent = {
            ...event,
            active: true,
            duration: event.duration || 5
        };
        
        // Применяем эффекты события
        this.applyEconomicEvent();
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.ECONOMIC_EVENT', {
            event: getText(`ECONOMIC_EVENTS.${event.type.toUpperCase()}`)
        }));
        
        // Обновляем отображение событий
        this.updateEventsDisplay();
    }

    /**
     * Применяет экономическое событие
     */
    applyEconomicEvent() {
        if (!this.economicEvent || !this.economicEvent.active) return;
        
        this.players.forEach(player => {
            if (player.bankrupt) return;
            
            // Эффекты на стоимость недвижимости
            if (this.economicEvent.propertyValue) {
                player.properties.forEach(property => {
                    property.value *= this.economicEvent.propertyValue;
                });
            }
            
            // Эффекты на доходы
            if (this.economicEvent.income) {
                player.incomeModifier = this.economicEvent.income;
            }
            
            // Эффекты на налоги
            if (this.economicEvent.taxes) {
                player.taxModifier = this.economicEvent.taxes;
            }
        });
    }

    /**
     * Запускает культурное событие
     */
    triggerCulturalEvent() {
        const events = CONFIG.CULTURAL_EVENTS;
        const event = events[randomInt(0, events.length - 1)];
        
        this.culturalEvent = {
            ...event,
            active: true,
            duration: event.duration || 3
        };
        
        // Применяем эффекты события
        this.applyCulturalEvent();
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.CULTURAL_EVENT', {
            event: getText(`CULTURAL_EVENTS.${event.type.toUpperCase()}`)
        }));
        
        // Обновляем отображение событий
        this.updateEventsDisplay();
    }

    /**
     * Применяет культурное событие
     */
    applyCulturalEvent() {
        if (!this.culturalEvent || !this.culturalEvent.active) return;
        
        this.players.forEach(player => {
            if (player.bankrupt) return;
            
            // Эффекты на туристические объекты
            if (this.culturalEvent.tourism) {
                player.properties.forEach(property => {
                    if (property.type === 'tourism') {
                        property.rent *= this.culturalEvent.tourism;
                    }
                });
            }
            
            // Эффекты на культурные объекты
            if (this.culturalEvent.culture) {
                player.properties.forEach(property => {
                    if (property.type === 'culture') {
                        property.rent *= this.culturalEvent.culture;
                    }
                });
            }
        });
    }

    /**
     * Инициализирует систему торговли
     */
    initializeTrading() {
        this.tradeOffers = [];
        this.tradeHistory = [];
    }

    /**
     * Обновляет торговлю
     */
    updateTrading() {
        // Проверяем истечение предложений торговли
        this.tradeOffers = this.tradeOffers.filter(offer => {
            if (offer.expiresAt && Date.now() > offer.expiresAt) {
                this.addChatMessage('system', getText('MESSAGES.TRADE_EXPIRED', {
                    from: offer.from.name,
                    to: offer.to.name
                }));
                return false;
            }
            return true;
        });
    }

    /**
     * Создает предложение торговли
     * @param {Player} from - игрок, предлагающий торговлю
     * @param {Player} to - игрок, получающий предложение
     * @param {Object} offer - что предлагается
     * @param {Object} request - что запрашивается
     */
    createTradeOffer(from, to, offer, request) {
        const tradeOffer = {
            id: generateId(),
            from: from,
            to: to,
            offer: offer,
            request: request,
            createdAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 минут
            status: 'pending'
        };
        
        this.tradeOffers.push(tradeOffer);
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.TRADE_OFFER', {
            from: from.name,
            to: to.name
        }));
        
        // Обновляем отображение торговли
        this.updateTradingDisplay();
        
        return tradeOffer;
    }

    /**
     * Принимает предложение торговли
     * @param {string} tradeId - ID предложения
     */
    acceptTradeOffer(tradeId) {
        const offer = this.tradeOffers.find(o => o.id === tradeId);
        if (!offer || offer.status !== 'pending') return false;
        
        // Выполняем обмен
        this.executeTrade(offer);
        
        // Удаляем предложение
        this.tradeOffers = this.tradeOffers.filter(o => o.id !== tradeId);
        
        // Добавляем в историю
        this.tradeHistory.push({
            ...offer,
            status: 'accepted',
            completedAt: Date.now()
        });
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.TRADE_ACCEPTED', {
            from: offer.from.name,
            to: offer.to.name
        }));
        
        // Обновляем отображение торговли
        this.updateTradingDisplay();
        
        return true;
    }

    /**
     * Отклоняет предложение торговли
     * @param {string} tradeId - ID предложения
     */
    rejectTradeOffer(tradeId) {
        const offer = this.tradeOffers.find(o => o.id === tradeId);
        if (!offer || offer.status !== 'pending') return false;
        
        // Удаляем предложение
        this.tradeOffers = this.tradeOffers.filter(o => o.id !== tradeId);
        
        // Добавляем в историю
        this.tradeHistory.push({
            ...offer,
            status: 'rejected',
            completedAt: Date.now()
        });
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.TRADE_REJECTED', {
            from: offer.from.name,
            to: offer.to.name
        }));
        
        // Обновляем отображение торговли
        this.updateTradingDisplay();
        
        return true;
    }

    /**
     * Выполняет торговую сделку
     * @param {Object} offer - предложение торговли
     */
    executeTrade(offer) {
        const { from, to, offer: offerItems, request: requestItems } = offer;
        
        // Обмениваем деньги
        if (offerItems.money) {
            from.payMoney(offerItems.money);
            to.receiveMoney(offerItems.money);
        }
        
        if (requestItems.money) {
            to.payMoney(requestItems.money);
            from.receiveMoney(requestItems.money);
        }
        
        // Обмениваем недвижимость
        if (offerItems.properties) {
            offerItems.properties.forEach(propertyId => {
                const property = from.properties.find(p => p.id === propertyId);
                if (property) {
                    from.sellProperty(property, to);
                }
            });
        }
        
        if (requestItems.properties) {
            requestItems.properties.forEach(propertyId => {
                const property = to.properties.find(p => p.id === propertyId);
                if (property) {
                    to.sellProperty(property, from);
                }
            });
        }
        
        // Обновляем статистику
        this.statistics.totalTrades++;
    }

    /**
     * Инициализирует систему альянсов
     */
    initializeAlliances() {
        this.alliances = [];
    }

    /**
     * Обновляет альянсы
     */
    updateAlliances() {
        // Проверяем условия альянсов
        this.alliances.forEach(alliance => {
            // Проверяем, не нарушены ли условия альянса
            if (alliance.conditions && !this.checkAllianceConditions(alliance)) {
                this.breakAlliance(alliance);
            }
        });
    }

    /**
     * Создает альянс
     * @param {Array} players - игроки в альянсе
     * @param {Object} conditions - условия альянса
     */
    createAlliance(players, conditions = {}) {
        const alliance = {
            id: generateId(),
            players: players,
            conditions: conditions,
            createdAt: Date.now(),
            benefits: {
                rentSharing: 0.1, // 10% от аренды делится между участниками
                tradeDiscount: 0.05, // 5% скидка на торговлю
                mutualSupport: true
            }
        };
        
        this.alliances.push(alliance);
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.ALLIANCE_FORMED', {
            players: players.map(p => p.name).join(', ')
        }));
        
        return alliance;
    }

    /**
     * Проверяет условия альянса
     * @param {Object} alliance - альянс
     */
    checkAllianceConditions(alliance) {
        // Проверяем, что все игроки все еще в игре
        return alliance.players.every(player => !player.bankrupt);
    }

    /**
     * Расторгает альянс
     * @param {Object} alliance - альянс
     */
    breakAlliance(alliance) {
        this.alliances = this.alliances.filter(a => a.id !== alliance.id);
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.ALLIANCE_BROKEN', {
            players: alliance.players.map(p => p.name).join(', ')
        }));
    }

    /**
     * Инициализирует систему турниров
     */
    initializeTournaments() {
        this.tournament = null;
        this.tournamentHistory = [];
    }

    /**
     * Обновляет турниры
     */
    updateTournaments() {
        if (this.tournament) {
            // Проверяем условия окончания турнира
            if (this.checkTournamentEnd()) {
                this.endTournament();
            }
        }
    }

    /**
     * Начинает турнир
     * @param {Object} config - конфигурация турнира
     */
    startTournament(config) {
        this.tournament = {
            id: generateId(),
            type: config.type || 'elimination',
            players: [...this.players],
            rounds: [],
            currentRound: 0,
            startedAt: Date.now(),
            config: config
        };
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.TOURNAMENT_START', {
            type: getText(`TOURNAMENT.${config.type.toUpperCase()}`)
        }));
        
        return this.tournament;
    }

    /**
     * Проверяет окончание турнира
     */
    checkTournamentEnd() {
        if (!this.tournament) return false;
        
        // Проверяем условия окончания в зависимости от типа турнира
        switch (this.tournament.type) {
            case 'elimination':
                return this.tournament.players.length <= 1;
            case 'points':
                return this.tournament.currentRound >= this.tournament.config.maxRounds;
            default:
                return false;
        }
    }

    /**
     * Завершает турнир
     */
    endTournament() {
        if (!this.tournament) return;
        
        const winner = this.tournament.players[0];
        
        // Добавляем в историю
        this.tournamentHistory.push({
            ...this.tournament,
            endedAt: Date.now(),
            winner: winner
        });
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.TOURNAMENT_END', {
            winner: winner.name
        }));
        
        this.tournament = null;
    }

    /**
     * Инициализирует систему достижений
     */
    initializeAchievements() {
        this.achievements = [];
        this.achievementHistory = [];
    }

    /**
     * Обновляет достижения
     */
    updateAchievements() {
        this.players.forEach(player => {
            if (player.bankrupt) return;
            
            // Проверяем различные достижения
            this.checkAchievements(player);
        });
    }

    /**
     * Проверяет достижения игрока
     * @param {Player} player - игрок
     */
    checkAchievements(player) {
        const achievements = CONFIG.ACHIEVEMENTS;
        
        achievements.forEach(achievement => {
            if (this.hasAchievement(player, achievement.id)) return;
            
            if (this.checkAchievementCondition(player, achievement)) {
                this.unlockAchievement(player, achievement);
            }
        });
    }

    /**
     * Проверяет, есть ли у игрока достижение
     * @param {Player} player - игрок
     * @param {string} achievementId - ID достижения
     */
    hasAchievement(player, achievementId) {
        return player.achievements.some(a => a.id === achievementId);
    }

    /**
     * Проверяет условие достижения
     * @param {Player} player - игрок
     * @param {Object} achievement - достижение
     */
    checkAchievementCondition(player, achievement) {
        switch (achievement.type) {
            case 'money':
                return player.money >= achievement.condition;
            case 'properties':
                return player.properties.length >= achievement.condition;
            case 'trades':
                return this.tradeHistory.filter(t => 
                    t.from.id === player.id || t.to.id === player.id
                ).length >= achievement.condition;
            case 'wins':
                return player.wins >= achievement.condition;
            default:
                return false;
        }
    }

    /**
     * Разблокирует достижение
     * @param {Player} player - игрок
     * @param {Object} achievement - достижение
     */
    unlockAchievement(player, achievement) {
        player.achievements.push({
            ...achievement,
            unlockedAt: Date.now()
        });
        
        // Добавляем в историю
        this.achievementHistory.push({
            player: player,
            achievement: achievement,
            unlockedAt: Date.now()
        });
        
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.ACHIEVEMENT_UNLOCKED', {
            player: player.name,
            achievement: getText(`ACHIEVEMENTS.${achievement.id.toUpperCase()}`)
        }));
        
        // Обновляем отображение достижений
        this.updateAchievementsDisplay();
        // Анимация и уведомление
        const panel = document.getElementById('achievements-panel');
        if (panel) {
            const els = panel.querySelectorAll('.achievement');
            if (els.length) {
                const el = els[els.length - 1];
                el.classList.add('unlocked');
                setTimeout(() => el.classList.remove('unlocked'), 1000);
            }
        }
        if (typeof showToast === 'function') {
            showToast(`Достижение: ${achievement.name}`);
        } else if (typeof utils.showToast === 'function') {
            utils.showToast(`Достижение: ${achievement.name}`);
        }
    }

    /**
     * Обновляет статистику
     */
    updateStatistics() {
        this.statistics.totalTurns = this.turnNumber;
        this.statistics.totalMoney = this.players.reduce((sum, p) => sum + p.money, 0);
        this.statistics.totalProperties = this.players.reduce((sum, p) => sum + p.properties.length, 0);
    }

    /**
     * Устанавливает текущего игрока
     * @param {number} index - индекс игрока
     */
    setCurrentPlayer(index) {
        // Убираем активность с предыдущего игрока
        if (this.players[this.currentPlayerIndex]) {
            this.players[this.currentPlayerIndex].setCurrentPlayer(false);
        }
        
        this.currentPlayerIndex = index;
        
        // Устанавливаем активность новому игроку
        if (this.players[this.currentPlayerIndex]) {
            this.players[this.currentPlayerIndex].setCurrentPlayer(true);
        }
        
        // Обновляем отображение текущего игрока
        this.updateCurrentPlayerDisplay();
    }

    /**
     * Переходит к следующему игроку
     */
    nextPlayer() {
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // Пропускаем банкротов
        while (this.players[nextIndex] && this.players[nextIndex].bankrupt) {
            nextIndex = (nextIndex + 1) % this.players.length;
            
            // Если все игроки банкроты, кроме текущего
            if (nextIndex === this.currentPlayerIndex) {
                this.endGame();
                return;
            }
        }
        
        this.setCurrentPlayer(nextIndex);
        this.turnNumber++;
        
        // Обновляем игровое поле
        this.board.update();
        
        // Проверяем условия окончания игры
        this.checkGameEndConditions();
        
        // --- Автосохранение ---
        if (window.localStorage) {
            try {
                const saveData = this.saveGame();
                localStorage.setItem('monopoly-autosave', JSON.stringify(saveData));
            } catch (e) { console.warn('Auto-save failed:', e); }
        }
    }

    /**
     * Бросает кости
     * @returns {Object} результат броска
     */
    async rollDice() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.bankrupt) {
            return null;
        }
        // Бросаем кости
        this.dice = rollDice();
        currentPlayer.lastRoll = this.dice;
        // Проверяем на дубль
        if (this.dice.isDouble) {
            currentPlayer.doublesCount++;
        } else {
            currentPlayer.doublesCount = 0;
        }
        // Проверяем на тюрьму (3 дубля подряд)
        if (currentPlayer.doublesCount >= 3) {
            currentPlayer.goToJail();
            currentPlayer.doublesCount = 0;
            this.addChatMessage('system', getText('MESSAGES.JAIL_VISIT', { 
                player: currentPlayer.name 
            }));
            this.nextPlayer();
            return this.dice;
        }
        // Добавляем сообщение в чат
        this.addChatMessage('system', getText('MESSAGES.DICE_ROLL', {
            player: currentPlayer.name,
            dice1: this.dice.dice1,
            dice2: this.dice.dice2
        }));
        // АНИМИРОВАННОЕ перемещение игрока
        const oldPos = currentPlayer.position;
        const steps = this.dice.total;
        const newPos = (oldPos + steps) % 40;
        await currentPlayer.animateTokenMove(oldPos, newPos);
        // Обновляем позицию игрока
        currentPlayer.position = newPos;
        // Обрабатываем клетку, на которую попал игрок
        this.handleCellLanding(currentPlayer, currentPlayer.position);
        // Если не дубль, переходим к следующему игроку
        if (!this.dice.isDouble) {
            this.nextPlayer();
        }
        this.statistics.diceRolls++;
        return this.dice;
    }

    /**
     * Обрабатывает попадание на клетку
     * @param {Player} player - игрок
     * @param {number} position - позиция
     */
    handleCellLanding(player, position) {
        const cell = this.board.getCell(position);
        if (!cell) return;
        
        switch (cell.type) {
            case 'property':
                this.handlePropertyLanding(player, cell);
                break;
            case 'chance':
                this.handleChanceCard(player);
                break;
            case 'treasure':
                this.handleTreasureCard(player);
                break;
            case 'tax':
                this.handleTaxLanding(player, cell);
                break;
            case 'go_to_jail':
                player.goToJail();
                this.addChatMessage('system', getText('MESSAGES.JAIL_VISIT', { 
                    player: player.name 
                }));
                break;
            case 'free_parking':
                // Ничего не происходит
                break;
        }
    }

    /**
     * Обрабатывает попадание на собственность
     * @param {Player} player - игрок
     * @param {Object} cell - клетка
     */
    handlePropertyLanding(player, cell) {
        if (!cell.owner) {
            // Собственность свободна - предлагаем купить
            this.offerPropertyPurchase(player, cell);
        } else if (cell.owner !== player.id) {
            // Собственность принадлежит другому игроку - платим аренду
            this.handleRentPayment(player, cell);
        }
    }

    /**
     * Предлагает купить собственность
     * @param {Player} player - игрок
     * @param {Object} cell - клетка
     */
    offerPropertyPurchase(player, cell) {
        if (player.hasMoney(cell.price)) {
            // Показываем диалог покупки
            this.showPurchaseDialog(player, cell);
        } else {
            // Запускаем аукцион
            this.startAuction(cell);
        }
    }

    /**
     * Обрабатывает оплату аренды
     * @param {Player} player - игрок
     * @param {Object} cell - клетка
     */
    handleRentPayment(player, cell) {
        const owner = this.players.find(p => p.id === cell.owner);
        if (!owner) return;
        
        const rentAmount = this.board.calculateRent(cell.position, owner.id);
        
        if (player.canPayRent(rentAmount)) {
            if (player.payRent(rentAmount, owner)) {
                this.addChatMessage('system', getText('MESSAGES.RENT_PAID', {
                    player: player.name,
                    amount: rentAmount,
                    owner: owner.name
                }));
            }
        } else {
            // Игрок не может заплатить - банкротство
            this.handleBankruptcy(player, owner, rentAmount);
        }
    }

    /**
     * Обрабатывает банкротство игрока
     * @param {Player} player - банкрот
     * @param {Player} creditor - кредитор
     * @param {number} debt - долг
     */
    handleBankruptcy(player, creditor, debt) {
        // Передаем все активы кредитору
        player.properties.forEach(position => {
            const cell = this.board.getCell(position);
            if (cell) {
                cell.owner = creditor.id;
                creditor.properties.push(position);
            }
        });
        
        // Передаем оставшиеся деньги
        if (player.money > 0) {
            creditor.addMoney(player.money);
            player.removeMoney(player.money);
        }
        
        player.declareBankruptcy();
        
        this.addChatMessage('system', getText('MESSAGES.BANKRUPTCY', { 
            player: player.name 
        }));
        
        // Проверяем условия окончания игры
        this.checkGameEndConditions();
    }

    /**
     * Обрабатывает карточку Шанс
     * @param {Player} player - игрок
     */
    handleChanceCard(player) {
        const card = randomChoice(CONFIG.CHANCE_CARDS);
        this.showChanceCard(card);
        
        this.applyChanceCard(player, card);
        this.stats.chanceCardsDrawn++;
    }

    /**
     * Применяет карточку Шанс
     * @param {Player} player - игрок
     * @param {Object} card - карточка
     */
    applyChanceCard(player, card) {
        switch (card.type) {
            case 'money':
                if (card.amount > 0) {
                    player.addMoney(card.amount);
                } else {
                    player.removeMoney(Math.abs(card.amount));
                }
                break;
            case 'move':
                player.moveToPosition(card.target, true);
                this.handleCellLanding(player, player.position);
                break;
        }
        
        this.addChatMessage('system', getText('MESSAGES.CHANCE_CARD', { 
            text: card.text 
        }));
    }

    /**
     * Обрабатывает карточку Казна
     * @param {Player} player - игрок
     */
    handleTreasureCard(player) {
        const card = randomChoice(CONFIG.TREASURE_CARDS);
        this.showTreasureCard(card);
        
        this.applyTreasureCard(player, card);
        this.stats.treasureCardsDrawn++;
    }

    /**
     * Применяет карточку Казна
     * @param {Player} player - игрок
     * @param {Object} card - карточка
     */
    applyTreasureCard(player, card) {
        switch (card.type) {
            case 'money':
                if (card.amount > 0) {
                    player.addMoney(card.amount);
                } else {
                    player.removeMoney(Math.abs(card.amount));
                }
                break;
        }
        
        this.addChatMessage('system', getText('MESSAGES.TREASURE_CARD', { 
            text: card.text 
        }));
    }

    /**
     * Обрабатывает попадание на налоговую клетку
     * @param {Player} player - игрок
     * @param {Object} cell - клетка
     */
    handleTaxLanding(player, cell) {
        const taxAmount = cell.price;
        
        if (player.hasMoney(taxAmount)) {
            player.removeMoney(taxAmount, 'tax');
            this.addChatMessage('system', `${player.name} заплатил налог ${taxAmount}₽`);
        } else {
            this.handleBankruptcy(player, null, taxAmount);
        }
    }

    /**
     * Запускает аукцион
     * @param {Object} cell - клетка для аукциона
     */
    startAuction(cell) {
        this.auction = {
            cell: cell,
            currentBid: 0,
            currentBidder: null,
            participants: this.players.filter(p => !p.bankrupt),
            timeLeft: CONFIG.AUCTION.TIME_LIMIT,
            active: true
        };
        
        this.addChatMessage('system', getText('MESSAGES.AUCTION_START', { 
            property: cell.name 
        }));
        
        this.showAuctionDialog();
    }

    /**
     * Делает ставку на аукционе
     * @param {number} playerId - ID игрока
     * @param {number} amount - сумма ставки
     * @returns {boolean} true если ставка принята
     */
    makeBid(playerId, amount) {
        if (!this.auction || !this.auction.active) {
            return false;
        }
        
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.bankrupt || !player.hasMoney(amount)) {
            return false;
        }
        
        if (amount <= this.auction.currentBid) {
            return false;
        }
        
        this.auction.currentBid = amount;
        this.auction.currentBidder = playerId;
        this.auction.timeLeft = CONFIG.AUCTION.TIME_LIMIT;
        
        this.updateAuctionDisplay();
        return true;
    }

    /**
     * Завершает аукцион
     */
    endAuction() {
        if (!this.auction || !this.auction.active) {
            return;
        }
        
        if (this.auction.currentBidder) {
            const winner = this.players.find(p => p.id === this.auction.currentBidder);
            if (winner && winner.hasMoney(this.auction.currentBid)) {
                winner.removeMoney(this.auction.currentBid, 'auction');
                this.board.buyCell(this.auction.cell.position, winner.id, this.auction.currentBid);
                winner.properties.push(this.auction.cell.position);
                winner.stats.auctionsWon++;
                
                this.addChatMessage('system', getText('MESSAGES.AUCTION_WIN', {
                    player: winner.name,
                    amount: this.auction.currentBid
                }));
            }
        }
        
        this.auction = null;
        this.hideAuctionDialog();
    }

    /**
     * Проверяет условия окончания игры
     */
    checkGameEndConditions() {
        const activePlayers = this.players.filter(p => !p.bankrupt);
        
        if (activePlayers.length <= 1) {
            this.endGame();
        }
    }

    /**
     * Завершает игру
     */
    endGame() {
        this.gameState = 'finished';
        
        const winner = this.players.find(p => !p.bankrupt);
        if (winner) {
            this.addChatMessage('system', getText('MESSAGES.GAME_OVER', { 
                winner: winner.name 
            }));
            
            // Показываем экран победителя
            this.showVictoryScreen(winner);
            this.statistics.gamesWon++;
        }
        
        // Сохраняем статистику
        this.saveGameStats();
    }

    /**
     * Добавляет сообщение в чат
     * @param {string} sender - отправитель
     * @param {string} message - сообщение
     */
    addChatMessage(sender, message) {
        const chatMessage = {
            id: generateId(),
            sender: sender,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.chat.push(chatMessage);
        
        // Ограничиваем количество сообщений
        if (this.chat.length > 100) {
            this.chat.shift();
        }
        
        // Обновляем UI чата
        this.updateChatDisplay();
    }

    /**
     * Обновляет отображение игры
     */
    updateGameUI() {
        // Обновляем отображение игроков
        this.players.forEach(player => {
            player.updateMoneyDisplay();
            player.updateTokenPosition();
        });
        
        // Обновляем отображение текущего игрока
        this.updateCurrentPlayerDisplay();
        
        // Обновляем отображение погоды
        this.updateWeatherDisplay();
        
        // Обновляем отображение событий
        this.updateEventsDisplay();
    }

    /**
     * Обновляет отображение текущего игрока
     */
    updateCurrentPlayerDisplay() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const playerInfo = document.querySelector('.current-player .player-info');
        if (playerInfo) {
            const tokenImg = playerInfo.querySelector('.player-token');
            const playerName = playerInfo.querySelector('.player-name');
            
            if (tokenImg) tokenImg.src = currentPlayer.token;
            if (playerName) playerName.textContent = currentPlayer.name;
        }
    }

    /**
     * Обновляет отображение погоды
     */
    updateWeatherDisplay() {
        const weatherElement = document.getElementById('current-weather');
        if (weatherElement) {
            const weatherType = CONFIG.WEATHER_TYPES.find(w => w.id === this.board.weather);
            weatherElement.textContent = weatherType ? weatherType.name : 'Неизвестно';
        }
    }

    /**
     * Обновляет отображение событий
     */
    updateEventsDisplay() {
        // Здесь можно добавить отображение экономических и культурных событий
    }

    /**
     * Обновляет отображение чата
     */
    updateChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        
        this.chat.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.innerHTML = `
                <span class="message-sender">${escapeHTML(msg.sender)}:</span>
                <span class="message-text">${escapeHTML(msg.message)}</span>
            `;
            chatMessages.appendChild(messageElement);
        });
        
        // Прокручиваем к последнему сообщению
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Обновляет отображение аукциона
     */
    updateAuctionDisplay() {
        if (!this.auction) return;
        
        const bidAmount = document.getElementById('current-bid-amount');
        const bidder = document.getElementById('current-bidder');
        const timer = document.getElementById('auction-time');
        
        if (bidAmount) bidAmount.textContent = formatMoney(this.auction.currentBid);
        if (bidder) {
            const currentBidderPlayer = this.players.find(p => p.id === this.auction.currentBidder);
            bidder.textContent = currentBidderPlayer ? currentBidderPlayer.name : 'Нет';
        }
        if (timer) timer.textContent = this.auction.timeLeft;
    }

    /**
     * Показывает диалог покупки
     * @param {Player} player - игрок
     * @param {Object} cell - клетка
     */
    showPurchaseDialog(player, cell) {
        // Реализация диалога покупки
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');
        
        modalTitle.textContent = 'Покупка собственности';
        modalContent.innerHTML = `
            <p>Вы хотите купить ${cell.name} за ${formatMoney(cell.price)}?</p>
            <div class="property-info">
                <p><strong>Арендная плата:</strong></p>
                <ul>
                    ${cell.rent.map((rent, index) => 
                        `<li>${index === 0 ? 'Без улучшений' : `${index} улучшений`}: ${formatMoney(rent)}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        // Обработчики кнопок
        document.getElementById('modal-confirm').onclick = () => {
            if (player.buyProperty(cell.position, cell.price)) {
                this.addChatMessage('system', getText('MESSAGES.PROPERTY_PURCHASED', {
                    player: player.name,
                    property: cell.name,
                    price: cell.price
                }));
            }
            modal.classList.add('hidden');
        };
        
        document.getElementById('modal-cancel').onclick = () => {
            this.startAuction(cell);
            modal.classList.add('hidden');
        };
    }

    /**
     * Показывает карточку Шанс
     * @param {Object} card - карточка
     */
    showChanceCard(card) {
        const cardModal = document.getElementById('card-modal');
        const cardTitle = document.getElementById('card-title');
        const cardText = document.getElementById('card-text');
        
        cardTitle.textContent = 'ШАНС';
        cardText.textContent = card.text;
        
        cardModal.classList.remove('hidden');
    }

    /**
     * Показывает карточку Казна
     * @param {Object} card - карточка
     */
    showTreasureCard(card) {
        const cardModal = document.getElementById('card-modal');
        const cardTitle = document.getElementById('card-title');
        const cardText = document.getElementById('card-text');
        
        cardTitle.textContent = 'КАЗНА';
        cardText.textContent = card.text;
        
        cardModal.classList.remove('hidden');
    }

    /**
     * Показывает диалог аукциона
     */
    showAuctionDialog() {
        const auctionModal = document.getElementById('auction-modal');
        const propertyName = document.getElementById('auction-property');
        
        if (propertyName) {
            propertyName.textContent = this.auction.cell.name;
        }
        
        auctionModal.classList.remove('hidden');
        this.updateAuctionDisplay();
    }

    /**
     * Скрывает диалог аукциона
     */
    hideAuctionDialog() {
        const auctionModal = document.getElementById('auction-modal');
        auctionModal.classList.add('hidden');
    }

    /**
     * Показывает экран победителя
     * @param {Player} winner - победитель
     */
    showVictoryScreen(winner) {
        // Реализация экрана победителя
        console.log(`Победитель: ${winner.name}`);
        // Анимация салюта
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                for (let j = 0; j < 18; j++) {
                    const particle = document.createElement('div');
                    particle.className = 'firework__particle';
                    const angle = (j / 18) * 2 * Math.PI;
                    const radius = 120 + Math.random() * 40;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    particle.style.setProperty('--x', `${x}px`);
                    particle.style.setProperty('--y', `${y}px`);
                    particle.style.background = `hsl(${Math.floor(Math.random()*360)},90%,60%)`;
                    firework.appendChild(particle);
                }
                document.body.appendChild(firework);
                setTimeout(() => firework.remove(), 1500);
            }, i * 400);
        }
        const victoryModal = document.getElementById('victory-modal');
        if (victoryModal) {
          victoryModal.classList.add('fadeInDown');
          setTimeout(() => victoryModal.classList.remove('fadeInDown'), 1000);
        }
    }

    /**
     * Сохраняет игру
     */
    saveGame() {
        const gameData = {
            players: this.players.map(p => p.saveState()),
            board: this.board.getState(),
            currentPlayerIndex: this.currentPlayerIndex,
            turnNumber: this.turnNumber,
            gameState: this.gameState,
            settings: this.settings,
            timestamp: new Date().toISOString()
        };
        
        saveToStorage('russian_monopoly_save', gameData);
    }

    /**
     * Загружает игру
     * @returns {boolean} true если загрузка успешна
     */
    loadGame() {
        const gameData = loadFromStorage('russian_monopoly_save');
        if (!gameData) return false;
        
        // Восстанавливаем игроков
        this.players = gameData.players.map(playerState => {
            const player = new Player();
            player.loadState(playerState);
            return player;
        });
        
        // Восстанавливаем игровое поле
        this.board.setState(gameData.board);
        
        // Восстанавливаем состояние игры
        this.currentPlayerIndex = gameData.currentPlayerIndex;
        this.turnNumber = gameData.turnNumber;
        this.gameState = gameData.gameState;
        this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...gameData.settings };
        
        // Обновляем UI
        this.updateGameUI();
        
        return true;
    }

    /**
     * Сохраняет статистику игры
     */
    saveGameStats() {
        const stats = {
            players: this.players.map(p => p.getStats()),
            board: this.board.getStats(),
            gameDuration: this.turnNumber,
            winner: this.players.find(p => !p.bankrupt)?.name,
            timestamp: new Date().toISOString()
        };
        
        saveToStorage('russian_monopoly_stats', stats);
    }

    /**
     * Загружает настройки
     */
    loadSettings() {
        const savedSettings = loadFromStorage('russian_monopoly_settings');
        if (savedSettings) {
            this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...savedSettings };
        }
    }

    /**
     * Сохраняет настройки
     */
    saveSettings() {
        saveToStorage('russian_monopoly_settings', this.settings);
    }

    /**
     * Инициализирует чат
     */
    initializeChat() {
        // Обработчик отправки сообщений
        const sendButton = document.getElementById('send-message-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendButton && chatInput) {
            sendButton.onclick = () => {
                const message = chatInput.value.trim();
                if (message) {
                    this.addChatMessage('Вы', message);
                    chatInput.value = '';
                }
            };
            
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    sendButton.click();
                }
            };
        }
    }

    /**
     * Инициализирует аукционы
     */
    initializeAuctions() {
        // Обработчики для аукциона
        const placeBidBtn = document.getElementById('place-bid-btn');
        const passBidBtn = document.getElementById('pass-bid-btn');
        const bidAmount = document.getElementById('bid-amount');
        
        if (placeBidBtn && bidAmount) {
            placeBidBtn.onclick = () => {
                const amount = parseInt(bidAmount.value);
                if (amount > 0) {
                    const currentPlayer = this.players[this.currentPlayerIndex];
                    if (this.makeBid(currentPlayer.id, amount)) {
                        bidAmount.value = '';
                    }
                }
            };
        }
        
        if (passBidBtn) {
            passBidBtn.onclick = () => {
                this.endAuction();
            };
        }
    }

    /**
     * Обновляет отображение достижений
     */
    updateAchievementsDisplay() {
        const panel = document.getElementById('achievements-panel');
        if (!panel) return;
        panel.innerHTML = '';
        this.players.forEach(player => {
            player.achievements.forEach(a => {
                const el = document.createElement('div');
                el.className = 'achievement';
                el.textContent = a.name;
                panel.appendChild(el);
            });
        });
    }

    /**
     * Показывает статистику сессии
     */
    showSessionStats() {
        showToast(`Бросков: ${this.statistics.diceRolls}, Побед: ${this.statistics.gamesWon}, Игр: ${this.statistics.gamesPlayed}`, 'info', 4000);
    }

    // Сохранение игры в файл
    saveGameToFile() {
      const data = JSON.stringify(this, (key, value) => {
        // Исключаем циклические ссылки и лишние свойства
        if (key === 'board' || key === 'gameLoop') return undefined;
        return value;
      }, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'monopoly-save.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    // Загрузка игры из файла
    loadGameFromFile(file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          Object.assign(this, data);
          showToast('Игра успешно загружена!', 'success');
          this.updateGameUI();
        } catch (err) {
          showToast('Ошибка загрузки файла', 'error');
        }
      };
      reader.readAsText(file);
    }
}

// Создаем глобальный экземпляр игры
const game = new Game();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} 