const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the eventBus to spy on its emit method.
// This isolates the Player class for testing.
jest.mock('./event-bus.js', () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
}));

const eventBus = require('./event-bus.js');
const { Player } = require('./player.js');
const CONFIG = require('./config.js').CONFIG || require('./config.js').default || require('./config.js');

describe('Player Class', () => {
  let player;
  const startingMoney = CONFIG.GAME.STARTING_MONEY;

  beforeEach(() => {
    // Reset mocks and create a new player before each test
    eventBus.emit.mockClear();
    player = new Player('p1', 'Joker', '
      ');
  });

  test('should be instantiated with starting money and correct properties', () => {
    expect(player.money).toBe(startingMoney);
    expect(player.id).toBe('p1');
    expect(player.bankrupt).toBe(false);
  });

  describe('addMoney method', () => {
    test('should increase money and emit a "moneyChanged" event', () => {
      const amountToAdd = 500;
      const reason = 'test_add';

      player.addMoney(amountToAdd, reason);

      // Check if money was updated
      expect(player.money).toBe(startingMoney + amountToAdd);

      // Check if the event was emitted correctly
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith('moneyChanged', {
        player: player,
        amount: startingMoney + amountToAdd,
        change: amountToAdd,
        reason: reason,
      });
    });

    test('should not add a negative or zero amount and not emit an event', () => {
      player.addMoney(-100);
      expect(player.money).toBe(startingMoney);
      expect(eventBus.emit).not.toHaveBeenCalled();

      player.addMoney(0);
      expect(player.money).toBe(startingMoney);
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('removeMoney method', () => {
    test('should decrease money and emit a "moneyChanged" event if funds are sufficient', () => {
      const amountToRemove = 500;
      const reason = 'test_remove';

      const result = player.removeMoney(amountToRemove, reason);

      expect(result).toBe(true);
      expect(player.money).toBe(startingMoney - amountToRemove);
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith('moneyChanged', {
        player: player,
        amount: startingMoney - amountToRemove,
        change: -amountToRemove,
        reason: reason,
      });
    });

    test('should not decrease money and not emit an event if funds are insufficient', () => {
      const amountToRemove = startingMoney + 100;

      const result = player.removeMoney(amountToRemove);

      expect(result).toBe(false);
      expect(player.money).toBe(startingMoney);
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});