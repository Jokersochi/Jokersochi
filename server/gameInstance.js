/**
 * Server-side instance of a single game.
 * Manages the game state for a specific room, enforces rules,
 * and communicates updates back to the clients.
 */

// Assuming server-side versions of these modules will be created.
// They can be adapted from your client-side 'js/player.js' and 'js/board.js'.
import { Player } from './player.js';
import { Board } from './board.js';

// These modules can likely be reused from the client-side 'js/' directory.
import { CONFIG } from '../js/config.js';
import { rollDice, randomChoice } from '../js/random.js';
import { generateId } from '../js/utils.js';

export class GameInstance {
    /**
     * @param {Array} playersData - Initial data for players in the room.
     * @param {object} gameSettings - Game settings for this instance.
     * @param {function} broadcast - Function to send a message to all clients in the room.
     * @param {function} sendToPlayer - Function to send a message to a specific client.
     */
    constructor(playersData, gameSettings, broadcast, sendToPlayer) {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting'; // waiting, playing, finished
        this.turnNumber = 0;
        this.chat = [];
        this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...gameSettings };
        this.board = new Board(); // Server-side board instance

        this.auctionState = null; // { isActive, cell, participants, currentBid, currentBidderId, timer, timeLeft }

        // Callbacks for communication with the main server
        this.broadcast = broadcast;
        this.sendToPlayer = sendToPlayer;

        this.startNewGame(playersData);
    }

    /**
     * Initializes the game and creates players.
     * @param {Array} playersData - Array of player data objects.
     */
    startNewGame(playersData) {
        this.players = playersData.map((data, index) => {
            const player = new Player(data.id, data.name, data.token);
            player.turnOrder = index;
            return player;
        });

        this.board.initializeBoard();
        this.gameState = 'playing';

        // Set the first player and start the first turn
        this.setCurrentPlayer(0);

        // Announce that the game has started to all clients
        this.broadcast('game_started', {
            players: this.players.map(p => p.saveState()),
            settings: this.settings,
            board: this.board.getState(),
            currentPlayerId: this.getCurrentPlayer().id,
        });

        this.addChatMessage('system', `Game started. It's ${this.getCurrentPlayer().name}'s turn.`);
    }

    /**
     * Handles an action sent by a player. This is the main entry point for player commands.
     * @param {string} playerId - The ID of the player performing the action.
     * @param {string} actionType - The type of action (e.g., 'roll_dice').
     * @param {object} data - The data associated with the action.
     */
    handlePlayerAction(playerId, actionType, data) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.bankrupt) return;

        // Auction actions can be performed by any participant, not just the current player.
        if (this.auctionState && this.auctionState.isActive) {
            if (actionType === 'make_bid') {
                return this.handleBid(playerId, data.amount);
            }
            if (actionType === 'pass_auction') {
                return this.handlePass(playerId);
            }
        }

        // Ensure it's the current player's turn for most actions
        if (this.getCurrentPlayer().id !== playerId) {
            this.sendToPlayer(playerId, 'error', { message: "It's not your turn." });
            return;
        }
        
        switch (actionType) {
            case 'roll_dice':
                this.rollDice();
                break;
            case 'buy_property':
                this.buyProperty(player, data.position);
                break;
            case 'pass_on_purchase':
                // The player chose not to buy, so the property goes to auction.
                this.startAuction(this.board.getCell(data.position));
                break;
            // ... other actions like mortgage, trade, build houses, etc. would be handled here.
        }
    }

    setCurrentPlayer(index) {
        if (this.players[this.currentPlayerIndex]) {
            this.players[this.currentPlayerIndex].isCurrentPlayer = false;
        }
        this.currentPlayerIndex = index;
        const newCurrentPlayer = this.players[this.currentPlayerIndex];
        newCurrentPlayer.isCurrentPlayer = true;

        this.broadcast('turn_started', {
            player: newCurrentPlayer.saveState(),
            turnNumber: this.turnNumber
        });
    }

    nextPlayer() {
        const oldPlayer = this.getCurrentPlayer();
        this.broadcast('turn_ended', { player: oldPlayer.saveState(), turnNumber: this.turnNumber });

        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;

        // Skip bankrupt players
        while (this.players[nextIndex] && this.players[nextIndex].bankrupt) {
            nextIndex = (nextIndex + 1) % this.players.length;
            if (nextIndex === this.currentPlayerIndex) {
                this.endGame();
                return;
            }
        }

        this.turnNumber++;
        this.setCurrentPlayer(nextIndex);
        this.checkGameEndConditions();
    }

    rollDice() {
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.bankrupt) return;

        const dice = rollDice();
        currentPlayer.lastRoll = dice;

        if (dice.isDouble) currentPlayer.doublesCount++;
        else currentPlayer.doublesCount = 0;

        if (currentPlayer.doublesCount >= 3) {
            currentPlayer.goToJail();
            currentPlayer.doublesCount = 0;
            this.addChatMessage('system', `${currentPlayer.name} was sent to jail for rolling 3 doubles.`);
            this.broadcast('player_jailed', { playerId: currentPlayer.id, position: currentPlayer.position });
            this.nextPlayer();
            return;
        }

        this.broadcast('dice_rolled', {
            playerId: currentPlayer.id,
            dice1: dice.dice1,
            dice2: dice.dice2,
        });

        const oldPos = currentPlayer.position;
        const passedGo = currentPlayer.move(dice.total);
        if (passedGo) {
            this.addChatMessage('system', `${currentPlayer.name} passed GO and collected ${CONFIG.GAME.STARTING_MONEY / 10}.`);
        }

        this.broadcast('player_moved', {
            playerId: currentPlayer.id,
            from: oldPos,
            to: currentPlayer.position,
            money: currentPlayer.money,
            passedGo: passedGo
        });

        this.handleCellLanding(currentPlayer, currentPlayer.position);

        if (!dice.isDouble) {
            // In a real implementation, you might wait for an 'end_turn' action from the client
            // to allow them to build houses, mortgage, etc.
            // For simplicity here, we'll auto-end the turn.
            this.nextPlayer();
        } else {
            this.addChatMessage('system', `${currentPlayer.name} rolled a double and gets to roll again!`);
        }
    }

    handleCellLanding(player, position) {
        const cell = this.board.getCell(position);
        if (!cell) return;

        switch (cell.type) {
            case 'property':
                this.handlePropertyLanding(player, cell);
                break;
            case 'tax':
                this.handleTaxLanding(player, cell);
                break;
            case 'go_to_jail':
                player.goToJail();
                this.addChatMessage('system', `${player.name} landed on Go to Jail!`);
                this.broadcast('player_jailed', { playerId: player.id, position: player.position });
                this.nextPlayer();
                break;
            case 'chance':
                this.handleCardDraw(player, 'chance');
                break;
            case 'treasure':
                this.handleCardDraw(player, 'treasure');
                break;
        }
    }

    /**
     * Обрабатывает вытягивание карточки "Шанс" или "Казна".
     * @param {Player} player - Игрок, вытянувший карту.
     * @param {string} cardType - 'chance' или 'treasure'.
     */
    handleCardDraw(player, cardType) {
        const cardDeck = cardType === 'chance' ? CONFIG.CHANCE_CARDS : CONFIG.TREASURE_CARDS;
        if (!cardDeck || cardDeck.length === 0) {
            console.error(`Колода карт "${cardType}" не найдена или пуста в конфигурации.`);
            return;
        }

        const card = randomChoice(cardDeck);

        if (cardType === 'chance') {
            player.stats.chanceCardsDrawn++;
        } else {
            player.stats.treasureCardsDrawn++;
        }

        this.addChatMessage('system', `${player.name} вытянул карту "${cardType}": ${card.text}`);

        // Отправляем информацию о карте всем клиентам для отображения
        this.broadcast('card_drawn', {
            playerId: player.id,
            cardType: cardType,
            card: card
        });

        // Применяем эффект карты
        this.applyCardEffect(player, card);
    }

    /**
     * Применяет эффект от вытянутой карты к игроку.
     * @param {Player} player - Игрок.
     * @param {object} card - Объект карты из конфигурации.
     */
    applyCardEffect(player, card) {
        switch (card.type) {
            case 'money':
                if (card.amount > 0) {
                    player.addMoney(card.amount, 'card');
                } else {
                    // Проверяем, может ли игрок заплатить
                    if (!player.hasMoney(Math.abs(card.amount))) {
                        this.handleBankruptcy(player, null); // Банкротство в пользу банка
                    } else {
                        player.removeMoney(Math.abs(card.amount), 'card');
                    }
                }
                this.broadcast('player_updated', { player: player.saveState() });
                break;

            case 'move':
                const oldPos = player.position;
                const passedGo = player.moveToPosition(card.target, true);

                if (passedGo) {
                    this.addChatMessage('system', `${player.name} прошел СТАРТ и получил ${CONFIG.GAME.STARTING_MONEY / 10}.`);
                }

                this.broadcast('player_moved', {
                    playerId: player.id,
                    from: oldPos,
                    to: player.position,
                    money: player.money,
                    passedGo: passedGo
                });

                // Обрабатываем новую клетку
                this.handleCellLanding(player, player.position);
                break;

            case 'go_to_jail':
                player.goToJail();
                this.broadcast('player_jailed', { playerId: player.id, position: player.position });
                this.nextPlayer(); // Отправка в тюрьму завершает ход
                break;
        }
    }

    handlePropertyLanding(player, cell) {
        if (!cell.owner) {
            // Property is unowned. Offer to buy if they can afford it.
            if (player.hasMoney(cell.price)) {
                this.sendToPlayer(player.id, 'purchase_offer', {
                    position: cell.position,
                    name: cell.name,
                    price: cell.price
                });
            } else {
                // Not enough money, automatically goes to auction
                this.addChatMessage('system', `${player.name} can't afford ${cell.name}. It will be auctioned.`);
                this.broadcast('start_auction', { cell, players: this.players.filter(p => !p.bankrupt) });
            }
        } else if (cell.owner !== player.id && !cell.mortgaged) {
            // Property is owned by someone else, pay rent.
            this.handleRentPayment(player, cell);
        }
    }

    handleRentPayment(player, cell) {
        const owner = this.players.find(p => p.id === cell.owner);
        if (!owner) return;

        const rentAmount = this.board.calculateRent(cell.position, owner.id);

        if (player.money >= rentAmount) {
            player.removeMoney(rentAmount, 'rent');
            owner.addMoney(rentAmount, 'rent');

            this.broadcast('rent_paid', {
                fromPlayer: player.saveState(),
                toPlayer: owner.saveState(),
                amount: rentAmount,
            });
            this.addChatMessage('system', `${player.name} paid ${rentAmount} rent to ${owner.name}.`);
        } else {
            this.handleBankruptcy(player, owner, rentAmount);
        }
    }

    /**
     * Обрабатывает попадание на налоговую клетку.
     * @param {Player} player - Игрок.
     * @param {object} cell - Клетка налога.
     */
    handleTaxLanding(player, cell) {
        const taxAmount = cell.price;
        this.addChatMessage('system', `${player.name} должен заплатить налог в размере ${taxAmount}.`);
        if (player.hasMoney(taxAmount)) {
            player.removeMoney(taxAmount, 'tax');
            this.broadcast('player_updated', { player: player.saveState() });
        } else {
            this.handleBankruptcy(player, null); // Банкротство в пользу банка
        }
    }

    buyProperty(player, position) {
        const cell = this.board.getCell(position);
        if (!cell || cell.owner) {
            return this.sendToPlayer(player.id, 'error', { message: "Property not available for purchase." });
        }

        if (player.buyProperty(this.board, cell.position, cell.price)) {
            this.broadcast('property_purchased', {
                player: player.saveState(),
                cell: this.board.getCell(position) // send updated cell state
            });
            this.addChatMessage('system', `${player.name} purchased ${cell.name}.`);
        } else {
            this.sendToPlayer(player.id, 'error', { message: "Could not buy property (not enough money)." });
        }
    }

    /**
     * Starts an auction for a property.
     * @param {object} cell - The property cell to be auctioned.
     */
    startAuction(cell) {
        if (this.auctionState && this.auctionState.isActive) return;

        const participants = this.players.filter(p => !p.bankrupt && p.hasMoney(CONFIG.AUCTION.MIN_BID));

        this.auctionState = {
            isActive: true,
            cell: cell,
            participants: participants.map(p => p.id),
            currentBid: 0,
            currentBidderId: null,
            timeLeft: CONFIG.AUCTION.TIME_LIMIT,
            timer: setInterval(() => this.updateAuctionTimer(), 1000)
        };

        this.broadcast('auction_started', {
            cell: this.auctionState.cell,
            players: participants.map(p => p.saveState())
        });
        this.addChatMessage('system', `Auction started for ${cell.name}!`);
    }

    /**
     * Handles a bid from a player during an auction.
     * @param {string} playerId - The ID of the bidding player.
     * @param {number} amount - The bid amount.
     */
    handleBid(playerId, amount) {
        if (!this.auctionState || !this.auctionState.isActive) return;
        if (!this.auctionState.participants.includes(playerId)) return;

        const player = this.players.find(p => p.id === playerId);
        const minBid = this.auctionState.currentBid + CONFIG.AUCTION.BID_INCREMENT;

        if (!player || !player.hasMoney(amount) || amount < minBid) {
            return this.sendToPlayer(playerId, 'auction_error', { message: 'Invalid bid amount.' });
        }

        this.auctionState.currentBid = amount;
        this.auctionState.currentBidderId = playerId;
        this.auctionState.timeLeft = CONFIG.AUCTION.EXTENSION_TIME; // Reset timer

        this.broadcast('auction_bid_placed', {
            player: player.saveState(),
            amount: amount
        });
        this.addChatMessage('system', `${player.name} bids ${amount} for ${this.auctionState.cell.name}.`);
    }

    /**
     * Handles a player passing their turn in an auction.
     * @param {string} playerId - The ID of the player passing.
     */
    handlePass(playerId) {
        if (!this.auctionState || !this.auctionState.isActive) return;

        this.auctionState.participants = this.auctionState.participants.filter(id => id !== playerId);
        const player = this.players.find(p => p.id === playerId);
        this.broadcast('auction_player_passed', { playerId });
        this.addChatMessage('system', `${player.name} has passed on the auction.`);

        if (this.auctionState.participants.length <= 1) {
            this.endAuction();
        }
    }

    /**
     * Updates the auction timer and ends the auction if time runs out.
     */
    updateAuctionTimer() {
        if (!this.auctionState || !this.auctionState.isActive) return;

        this.auctionState.timeLeft--;
        this.broadcast('auction_time_update', { timeLeft: this.auctionState.timeLeft });

        if (this.auctionState.timeLeft <= 0) {
            this.endAuction();
        }
    }

    /**
     * Ends the current auction and assigns the property to the winner.
     */
    endAuction() {
        if (!this.auctionState) return;

        clearInterval(this.auctionState.timer);
        const { currentBidderId, currentBid, cell } = this.auctionState;
        const winner = this.players.find(p => p.id === currentBidderId);

        if (winner && currentBid > 0) {
            winner.removeMoney(currentBid, 'auction');
            this.board.buyCell(cell.position, winner.id, currentBid);
            winner.properties.push(cell.position);
            winner.stats.auctionsWon++;
            this.addChatMessage('system', `${winner.name} wins the auction for ${cell.name} with a bid of ${currentBid}!`);
        } else {
            this.addChatMessage('system', `Auction for ${cell.name} ended with no winner.`);
        }

        this.broadcast('auction_ended', {
            winner: winner ? winner.saveState() : null,
            cell: cell,
            price: currentBid
        });

        this.auctionState = null;
    }

    handleBankruptcy(player, creditor) {
        if (creditor) {
            // Передаем всю собственность кредитору
            player.properties.forEach(pos => {
                if (this.board.transferProperty(pos, player.id, creditor.id)) {
                    creditor.properties.push(pos);
                }
            });
            // Деньги игрока также переходят кредитору
            creditor.addMoney(player.money, 'bankruptcy');
        } else {
            // Если кредитора нет (банкротство в пользу банка), собственность просто освобождается
            player.properties.forEach(pos => this.board.sellCell(pos, player.id));
        }
        player.declareBankruptcy();

        this.broadcast('player_bankrupt', {
            player: player.saveState(),
            creditor: creditor ? creditor.saveState() : null,
        });
        this.addChatMessage('system', `${player.name} has gone bankrupt!`);
        this.checkGameEndConditions();
    }

    checkGameEndConditions() {
        const activePlayers = this.players.filter(p => !p.bankrupt);
        if (activePlayers.length <= 1) {
            this.endGame();
        }
    }

    endGame() {
        this.gameState = 'finished';
        const winner = this.players.find(p => !p.bankrupt);
        this.broadcast('game_ended', { winner: winner ? winner.saveState() : null });
        this.addChatMessage('system', `Game over! The winner is ${winner.name}!`);
    }

    addChatMessage(sender, message) {
        const chatMessage = { id: generateId(), sender, message, timestamp: new Date().toISOString() };
        this.chat.push(chatMessage);
        if (this.chat.length > 100) this.chat.shift();
        this.broadcast('chat_updated', this.chat);
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
}