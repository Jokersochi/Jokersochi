import { random, rollDice, shuffle, randomChoice } from './random.js';

describe('random', () => {
  test('random in range', () => {
    for (let i = 0; i < 100; i++) {
      const n = random(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
  test('rollDice', () => {
    for (let i = 0; i < 20; i++) {
      const d = rollDice();
      expect(d.dice1).toBeGreaterThanOrEqual(1);
      expect(d.dice1).toBeLessThanOrEqual(6);
      expect(d.dice2).toBeGreaterThanOrEqual(1);
      expect(d.dice2).toBeLessThanOrEqual(6);
      expect(d.total).toBe(d.dice1 + d.dice2);
      expect(typeof d.isDouble).toBe('boolean');
    }
  });
  test('shuffle', () => {
    const arr = [1,2,3,4,5];
    const shuffled = shuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled.sort().join(',')).toBe(arr.sort().join(','));
  });
  test('randomChoice', () => {
    const arr = [10, 20, 30];
    for (let i = 0; i < 10; i++) {
      expect(arr).toContain(randomChoice(arr));
    }
    expect(randomChoice([])).toBeNull();
  });
}); 