import { saveToStorage, loadFromStorage, removeFromStorage, isStorageSupported } from './storage.js';

describe('storage', () => {
  const key = 'test-key';
  const value = { a: 1, b: 'test' };

  beforeEach(() => {
    localStorage.clear();
  });

  test('isStorageSupported', () => {
    expect(isStorageSupported()).toBe(true);
  });

  test('saveToStorage and loadFromStorage', () => {
    saveToStorage(key, value);
    const loaded = loadFromStorage(key);
    expect(loaded).toEqual(value);
  });

  test('removeFromStorage', () => {
    saveToStorage(key, value);
    removeFromStorage(key);
    expect(loadFromStorage(key)).toBeNull();
  });
}); 