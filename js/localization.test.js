import { getText, setLocale, loadLocales } from './localization.js';

global.fetch = jest.fn(() => Promise.resolve({
  json: () => Promise.resolve({
    COMMON: { HELLO: 'Привет', HI: 'Hi' },
    MESSAGES: { WELCOME: 'Добро пожаловать' }
  })
}));

describe('localization', () => {
  beforeAll(async () => {
    await loadLocales('ru');
  });

  test('getText returns correct string', () => {
    expect(getText('COMMON.HELLO')).toBe('Привет');
    expect(getText('MESSAGES.WELCOME')).toBe('Добро пожаловать');
  });

  test('setLocale switches language', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({
      json: () => Promise.resolve({ COMMON: { HI: 'Hallo' } })
    }));
    await setLocale('de');
    expect(getText('COMMON.HI')).toBe('Hallo');
  });
}); 