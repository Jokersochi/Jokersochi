const { getText, setLocale, loadLocales, setLocales } = require('./localization.js');
const fetch = require('node-fetch');
global.fetch = fetch;

jest.mock('node-fetch', () => {
  return jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        COMMON: { HELLO: 'Привет', HI: 'Hi' },
        MESSAGES: { WELCOME: 'Добро пожаловать' }
      })
    })
  );
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('localization', () => {
  beforeAll(async () => {
    await loadLocales('ru');
  });

  test('getText returns correct string', () => {
    expect(getText('COMMON.HELLO')).toBe('Привет');
    expect(getText('MESSAGES.WELCOME')).toBe('Добро пожаловать');
  });

  test('setLocale switches language', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ COMMON: { HI: 'Hallo' } }) }));
    await setLocale('de');
    expect(getText('COMMON.HI')).toBe('Hallo');
  });
}); 