const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const _jest = require('@jest/globals').jest;
// Module requires are intentionally delayed until after mocks are declared

// --- Mocking Dependencies ---

// Mock the Player class
_jest.mock('./player.js', () => ({
    Player: _jest.fn().mockImplementation((id, name) => ({
        id,
        name,
        position: 0,
        money: 2000,
        bankrupt: false,
        properties: [],
        lastRoll: null,
        doublesCount: 0,
        hasMoney: _jest.fn().mockReturnValue(true),
        canPayRent: _jest.fn().mockReturnValue(true),
        buyProperty: _jest.fn().mockReturnValue(true),
        removeMoney: _jest.fn(),
        addMoney: _jest.fn(),
        goToJail: _jest.fn(),
        declareBankruptcy: _jest.fn(function() { this.bankrupt = true; }),
        saveState: _jest.fn(function() { return { id: this.id, name: this.name, money: this.money, bankrupt: this.bankrupt }; }),
        getStats: _jest.fn(function() { return { ...this.stats }; }),
        move: _jest.fn(function(steps) { const oldPos = this.position; this.position = (this.position + steps) % 40; return this.position < oldPos; }),
        moveToPosition: _jest.fn(function(position, collectMoney = true) { const oldPos = this.position; this.position = position % 40; return collectMoney && (this.position < oldPos); }),
    })),
}));

// Mock singletons and modules
_jest.mock('./board.js', () => ({
    board: {
        initializeBoard: _jest.fn(),
        getCell: _jest.fn(),
        calculateRent: _jest.fn().mockReturnValue(50),
        transferProperty: _jest.fn(),
        getState: _jest.fn(() => ({})),
        getStats: _jest.fn(() => ({})),
    },
}));

_jest.mock('./event-bus.js', () => ({
    emit: _jest.fn(),
    on: _jest.fn(),
}));

_jest.mock('./auction-manager.js', () => ({
    startAuction: _jest.fn(),
}));

_jest.mock('./random.js', () => ({
    rollDice: _jest.fn(),
    randomChoice: _jest.fn(),
}));

_jest.mock('./localization.js', () => ({
    getText: _jest.fn(key => key), // Return the key itself for simplicity
}));


describe('Game Class', () => {
    // Require modules after mocks are in place so that the module system
    // returns the mocked versions to modules that require them (e.g. game.js)
    const { Game } = require('./game.js');
    const { Player } = require('./player.js');
    const { board } = require('./board.js');
    const eventBus = require('./event-bus.js');
    const auctionManager = require('./auction-manager.js');
    const random = require('./random.js');
    let game;
    const playerData = [
        { id: 'p1', name: 'Joker', token: 'matryoshka' },
        { id: 'p2', name: 'Harley', token: 'balalaika' },
    ];

    beforeEach(() => {
        // Clear all mocks before each test
        _jest.clearAllMocks();
        game = new Game();
    });

    describe('Initialization and Game Start', () => {
        test('should initialize with default values', () => {
            expect(game.gameState).toBe('waiting');
            expect(game.players).toEqual([]);
        });

        test('startNewGame should create players and start the game', () => {
            game.startNewGame(playerData);

            expect(game.players.length).toBe(2);
            expect(Player).toHaveBeenCalledTimes(2);
            expect(game.gameState).toBe('playing');
            expect(game.currentPlayerIndex).toBe(0);
            expect(game.players[0].isCurrentPlayer).toBe(true);
            expect(eventBus.emit).toHaveBeenCalledWith('gameStarted', expect.any(Object));
        });
    });

    describe('Turn Management', () => {
        beforeEach(() => {
            game.startNewGame(playerData);
        });

        test('nextPlayer should advance to the next player', () => {
            game.nextPlayer();
            expect(game.currentPlayerIndex).toBe(1);
            expect(game.players[1].isCurrentPlayer).toBe(true);
            expect(game.players[0].isCurrentPlayer).toBe(false);
        });

        test('nextPlayer should loop back to the first player', () => {
            game.currentPlayerIndex = 1;
            game.nextPlayer();
            expect(game.currentPlayerIndex).toBe(0);
        });

        test('nextPlayer should skip bankrupt players', () => {
            game.startNewGame([...playerData, { id: 'p3', name: 'Penguin' }]);
            game.players[1].bankrupt = true; // Harley is bankrupt

            game.nextPlayer(); // From Joker (0) to Penguin (2), skipping Harley (1)
            expect(game.currentPlayerIndex).toBe(2);
            expect(game.players[2].name).toBe('Penguin');
        });
    });

    describe('Player Actions and Game Logic', () => {
        beforeEach(() => {
            game.startNewGame(playerData);
        });

        test('rollDice should move the player and handle cell landing', async () => {
            const currentPlayer = game.players[0];
            random.rollDice.mockReturnValue({ dice1: 3, dice2: 4, total: 7, isDouble: false });
            board.getCell.mockReturnValue({ type: 'property', owner: null, price: 200 });

            await game.rollDice();

            expect(currentPlayer.position).toBe(7);
            // Since the property is unowned and player can afford it, an offer should be made
            expect(eventBus.emit).toHaveBeenCalledWith('showPurchaseDialogRequest', { player: currentPlayer, cell: expect.any(Object) });
        });

        test('landing on an owned property should trigger rent payment', () => {
            const player1 = game.players[0];
            const player2 = game.players[1];
            const property = { type: 'property', position: 5, owner: player2.id, mortgaged: false };
            board.getCell.mockReturnValue(property);

            game.handlePropertyLanding(player1, property);

            expect(board.calculateRent).toHaveBeenCalledWith(property.position, player2.id);
            expect(player1.removeMoney).toHaveBeenCalledWith(50, 'rent');
            expect(player2.addMoney).toHaveBeenCalledWith(50, 'rent');
            expect(eventBus.emit).toHaveBeenCalledWith('chatMessage', expect.any(Object));
        });

        test('landing on an unowned property without enough money should start an auction', () => {
            const currentPlayer = game.players[0];
            currentPlayer.hasMoney.mockReturnValue(false); // Player can't afford it
            const property = { type: 'property', position: 5, owner: null, price: 2200 };
            board.getCell.mockReturnValue(property);

            game.offerPropertyPurchase(currentPlayer, property);

            expect(auctionManager.startAuction).toHaveBeenCalledWith({
                cell: property,
                players: game.players,
            });
        });

        test('handleBankruptcy should transfer assets and declare bankruptcy', () => {
            const bankruptPlayer = game.players[0];
            const creditor = game.players[1];
            bankruptPlayer.properties = [1, 3]; // Has two properties
            bankruptPlayer.money = 100;

            game.handleBankruptcy(bankruptPlayer, creditor, 500);

            expect(bankruptPlayer.declareBankruptcy).toHaveBeenCalled();
            expect(creditor.addMoney).toHaveBeenCalledWith(100);
            expect(board.transferProperty).toHaveBeenCalledTimes(2);
            expect(eventBus.emit).toHaveBeenCalledWith('playerBankrupt', expect.any(Object));
        });

        test('checkGameEndConditions should end the game when one player remains', () => {
            game.players[1].bankrupt = true;
            game.checkGameEndConditions();

            expect(game.gameState).toBe('finished');
            expect(eventBus.emit).toHaveBeenCalledWith('gameEnded', {
                winner: game.players[0],
                players: expect.any(Array),
                duration: game.turnNumber,
            });
        });
    });
});