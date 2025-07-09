// Локализация
let locales = {};
let currentLocale = 'ru';

export const loadLocales = async (lang = 'ru') => {
  const response = await fetch(`assets/tokens/${lang}.json`);
  locales[lang] = await response.json();
  currentLocale = lang;
};

export const setLocale = async (locale) => {
  if (!locales[locale]) {
    await loadLocales(locale);
  }
  currentLocale = locale;
  return true;
};

export const getText = (key, params = {}) => {
  const keys = key.split('.');
  let text = locales[currentLocale];
  for (const k of keys) {
    if (text && text[k]) {
      text = text[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  if (typeof text === 'string' && Object.keys(params).length > 0) {
    return text.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }
  return text;
};

export const setLocales = (newLocales) => { locales = newLocales; };
export const getCurrentLocale = () => currentLocale; 