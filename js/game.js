/**
 * Улучшенный основной модуль игры
 * Управляет игровым процессом, ходами игроков и общей логикой игры
 */

import { getText } from './localization.js';
import { generateId } from './utils.js';
import { saveToStorage, loadFromStorage } from './storage.js';
import { randomChoice, rollDice } from './random.js';
import eventBus from './event-bus.js';
import { CONFIG } from './config.js';
import { Player } from './player.js';
import { board } from './board.js';
import auctionManager from './auction-manager.js';

class Game {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting'; // waiting, playing, paused, finished
        this.turnNumber = 0;
        this.chat = [];
        this.settings = { ...CONFIG.DEFAULT_SETTINGS };
        this.isTournamentGame = false;
        this.tournamentContext = null;
        this.sessionStats = {
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
        this.board = board;

        // Подписываемся на события от других модулей
        eventBus.on('chatMessage', (data) => this.addChatMessage(data.sender, data.message));
        eventBus.on('rollDiceRequest', () => this.rollDice());
        eventBus.on('endTurnRequest', () => this.nextPlayer());
        eventBus.on('buyPropertyRequest', (data) => this.buyProperty(data.player, data.cell));
        eventBus.on('auctionPropertyRequest', data => auctionManager.startAuction({ cell: data.cell, players: this.players.filter(p => !p.bankrupt) }));
        eventBus.on('tradeCompleted', (data) => this.executeTrade(data));
        eventBus.on('startTournamentGameRequest', (config) => this.startTournamentGame(config));
        eventBus.on('playerMoneyUpdateRequest', (data) => this.updatePlayerMoney(data));
        eventBus.on('mortgagePropertyRequest', data => this.mortgageProperty(data));
        eventBus.on('unmortgagePropertyRequest', data => this.unmortgageProperty(data));
        eventBus.on('addImprovementRequest', data => this.addImprovement(data));
        eventBus.on('sellImprovementRequest', data => this.sellImprovement(data));



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
        
        // Создаем игроков
        playerData.forEach((data, index) => {
            const player = new Player(data.id, data.name, data.token);
            player.turnOrder = index;
            this.players.push(player);
        });

        // Инициализируем игровое поле
        this.board.initializeBoard();
        
        // Устанавливаем первого игрока и запускаем первый ход
        this.setCurrentPlayer(0, true);

        eventBus.emit('gameStarted', { players: this.players, settings: this.settings });
        eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.GAME_START', {
            player: this.players[0].name
        })});
        
        // Обновляем UI
        this.updateGameUI();
        
        // Автосохранение
        if (this.settings.autoSave) {
            this.saveGame();
        }
        
        eventBus.emit('sessionGamePlayed');
    }

    /**
     * Starts a game within a tournament context.
     * @param {object} config - The tournament game configuration.
     */
    startTournamentGame(config) {
        this.isTournamentGame = true;
        this.tournamentContext = { tournamentId: config.tournamentId, gameId: config.gameId };
        // Start a new game with players and settings from the tournament
        this.startNewGame(config.players, config.settings);
    }

    /**
     * Выполняет торговую сделку
     * @param {Object} offer - предложение торговли
     */
    executeTrade(offer) {
        const { from, to, offer: offerItems, request: requestItems } = offer;
        
        const fromPlayer = this.players.find(p => p.id === from.id);
        const toPlayer = this.players.find(p => p.id === to.id);

        if (!fromPlayer || !toPlayer) return;

        // Обмениваем деньги
        if (offerItems.money) {
            fromPlayer.removeMoney(offerItems.money);
            toPlayer.addMoney(offerItems.money);
        }
        
        if (requestItems.money) {
            toPlayer.removeMoney(requestItems.money);
            fromPlayer.addMoney(requestItems.money);
        }
        
        // Обмениваем недвижимость
        if (offerItems.properties) {
            offerItems.properties.forEach(position => {
                this.board.transferProperty(position, fromPlayer.id, toPlayer.id);
            });
        }
        
        if (requestItems.properties) {
            requestItems.properties.forEach(position => {
                this.board.transferProperty(position, toPlayer.id, fromPlayer.id);
            });
        }
        
        eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.TRADE_ACCEPTED', { from: from.name, to: to.name }) });
        eventBus.emit('gameStateUpdated');
        
        // Обновляем статистику
        eventBus.emit('tradeCompletedEvent', { offer });
    }

    /**
     * Устанавливает текущего игрока
     * @param {number} index - индекс игрока
     * @param {boolean} isNewGame - флаг начала новой игры
     */
    setCurrentPlayer(index, isNewGame = false) {
        if (this.players[this.currentPlayerIndex]) {
            this.players[this.currentPlayerIndex].isCurrentPlayer = false;
        }
        this.currentPlayerIndex = index;
        this.players[this.currentPlayerIndex].isCurrentPlayer = true;

        eventBus.emit('turnStarted', { player: this.players[this.currentPlayerIndex], turnNumber: this.turnNumber, isNewGame });
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
        
        eventBus.emit('turnEnded', { player: this.players[this.currentPlayerIndex], turnNumber: this.turnNumber });
        this.turnNumber++;

        this.setCurrentPlayer(nextIndex);
        
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
            eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.JAIL_VISIT', {
                player: currentPlayer.name 
            })});
            this.nextPlayer();
            return this.dice;
        }
        eventBus.emit('diceRolled', {
            player: currentPlayer.name,
            dice1: this.dice.dice1,
            dice2: this.dice.dice2
        });
        // АНИМИРОВАННОЕ перемещение игрока
        const oldPos = currentPlayer.position;
        const steps = this.dice.total;
        const newPos = (oldPos + steps) % 40;
        eventBus.emit('playerMoving', { player: currentPlayer, from: oldPos, to: newPos });
        
        // Обновляем позицию игрока
        currentPlayer.position = newPos;
        // Обрабатываем клетку, на которую попал игрок
        this.handleCellLanding(currentPlayer, currentPlayer.position);
        // Если не дубль, переходим к следующему игроку
        if (!this.dice.isDouble) {
            this.nextPlayer();
        }
        eventBus.emit('diceRolledEvent', { player: currentPlayer, roll: this.dice });
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
                eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.JAIL_VISIT', {
                    player: player.name 
                })});
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
        if (!player.hasMoney(cell.price)) {
            // Not enough money, property goes to auction
            auctionManager.startAuction({ cell, players: this.players.filter(p => !p.bankrupt) });
        } else {
            // Player can afford it, UI should show a purchase dialog
            eventBus.emit('showPurchaseDialogRequest', { player, cell });
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
        
        if (player.canPayRent(this.board, rentAmount)) {
            player.removeMoney(rentAmount, 'rent');
            owner.addMoney(rentAmount, 'rent');
            eventBus.emit('moneyChanged', { player, amount: player.money });
            eventBus.emit('moneyChanged', { owner, amount: owner.money });
            eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.RENT_PAID', { player: player.name, amount: rentAmount, owner: owner.name }) });

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
        
        eventBus.emit('playerBankrupt', { player, creditor, debt });

        eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.BANKRUPTCY', {
            player: player.name 
        })});
        
        // Проверяем условия окончания игры
        this.checkGameEndConditions();
    }

    /**
     * Обрабатывает карточку Шанс
     * @param {Player} player - игрок
     */
    handleChanceCard(player) {
        const card = randomChoice(CONFIG.CHANCE_CARDS);
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
        
        eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.CHANCE_CARD', {
            text: card.text 
        })});
    }

    /**
     * Обрабатывает карточку Казна
     * @param {Player} player - игрок
     */
    handleTreasureCard(player) {
        const card = randomChoice(CONFIG.TREASURE_CARDS);
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
        
        eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.TREASURE_CARD', {
            text: card.text 
        })});
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
            eventBus.emit('chatMessage', { sender: 'system', message: `${player.name} заплатил налог ${taxAmount}₽` });
        } else {
            this.handleBankruptcy(player, null, taxAmount);
        }
    }

    /**
     * Покупает собственность
     * @param {Player} player - игрок
     * @param {Object} cell - клетка
     */
    buyProperty(player, cell) {
        if (player.buyProperty(this.board, cell.position, cell.price)) {
            eventBus.emit('propertyPurchased', { player, cell });
            eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.PROPERTY_PURCHASED', {
                player: player.name,
                property: cell.name,
                price: cell.price
            })});
            eventBus.emit('gameStateUpdated');
        }
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

        const gameEndData = {
            winner,
            players: this.players.map(p => p.saveState()), // Final state of all players
            duration: this.turnNumber,
        };

        if (this.isTournamentGame) {
            eventBus.emit('tournamentGameEnded', { ...gameEndData, ...this.tournamentContext });
            this.isTournamentGame = false;
            this.tournamentContext = null;
        } else {
            eventBus.emit('gameEnded', gameEndData);
        }

        if (winner) {
            eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.GAME_OVER', {
                winner: winner.name 
            })});
        }
        
        // Сохраняем статистику
        this.saveGameStats();
    }

    updatePlayerMoney({ playerId, amount, reason }) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.addMoney(amount, reason);
            eventBus.emit('moneyChanged', { player, amount: player.money, reason });
        }
    }

    mortgageProperty({ playerId, position }) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.mortgageProperty(this.board, position);
            eventBus.emit('gameStateUpdated', { reason: 'property_update' });
        }
    }

    unmortgageProperty({ playerId, position }) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.unmortgageProperty(this.board, position);
            eventBus.emit('gameStateUpdated', { reason: 'property_update' });
        }
    }

    addImprovement({ playerId, position }) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.addImprovement(this.board, position);
            eventBus.emit('gameStateUpdated', { reason: 'property_update' });
        }
    }

    sellImprovement({ playerId, position }) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.removeImprovement(this.board, position);
            eventBus.emit('gameStateUpdated', { reason: 'property_update' });
        }
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
        eventBus.emit('chatUpdated', this.chat);
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
    loadGame(gameData) {
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
     * Сохраняет игру в файл
     */
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

    /**
     * Загружает игру из файла
     * @param {File} file - файл для загрузки
     */
    loadGameFromFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                this.loadGame(data);
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
export { Game, game };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} 