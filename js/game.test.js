import { Game } from './game.js';
import { Player } from './player.js';
import { board } from './board.js';
import eventBus from './event-bus.js';
import auctionManager from './auction-manager.js';
import * as random from './random.js';

// --- Mocking Dependencies ---

// Mock the Player class
jest.mock('./player.js', () => ({
    Player: jest.fn().mockImplementation((id, name) => ({
        id,
        name,
        position: 0,
        money: 2000,
        bankrupt: false,
        properties: [],
        lastRoll: null,
        doublesCount: 0,
        hasMoney: jest.fn().mockReturnValue(true),
        canPayRent: jest.fn().mockReturnValue(true),
        buyProperty: jest.fn().mockReturnValue(true),
        removeMoney: jest.fn(),
        addMoney: jest.fn(),
        goToJail: jest.fn(),
        declareBankruptcy: jest.fn(function() { this.bankrupt = true; }),
        saveState: jest.fn(function() { return { id: this.id, name: this.name, money: this.money, bankrupt: this.bankrupt }; }),
    })),
}));

// Mock singletons and modules
jest.mock('./board.js', () => ({
    board: {
        initializeBoard: jest.fn(),
        getCell: jest.fn(),
        calculateRent: jest.fn().mockReturnValue(50),
    },
}));

jest.mock('./event-bus.js', () => ({
    emit: jest.fn(),
    on: jest.fn(),
}));

jest.mock('./auction-manager.js', () => ({
    startAuction: jest.fn(),
}));

jest.mock('./random.js', () => ({
    rollDice: jest.fn(),
    randomChoice: jest.fn(),
}));

jest.mock('./localization.js', () => ({
    getText: jest.fn(key => key), // Return the key itself for simplicity
}));


describe('Game Class', () => {
    let game;
    const playerData = [
        { id: 'p1', name: 'Joker', token: 'matryoshka' },
        { id: 'p2', name: 'Harley', token: 'balalaika' },
    ];

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
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