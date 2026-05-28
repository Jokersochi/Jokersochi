import { isEven, isOdd, clamp, deepClone, formatMoney, generateId } from './utils.js';

describe('utils', () => {
  test('isEven', () => {
    expect(isEven(2)).toBe(true);
    expect(isEven(3)).toBe(false);
  });
  test('isOdd', () => {
    expect(isOdd(2)).toBe(false);
    expect(isOdd(3)).toBe(true);
  });
  test('clamp', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
  test('deepClone', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = deepClone(obj);
    expect(clone).not.toBe(obj);
    expect(clone).toEqual(obj);
    clone.b.c = 3;
    expect(obj.b.c).toBe(2);
  });
  test('formatMoney', () => {
    expect(formatMoney(1000)).toBe('1,000₽');
    expect(formatMoney(500, '$')).toBe('500$');
  });
  test('generateId', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
  });
}); 