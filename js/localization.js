// Локализация
let locales = {};
let currentLocale = 'ru';

export const loadLocales = async (lang = 'ru') => {
  try {
    const response = await fetch(`assets/tokens/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load locale ${lang}`);
    const data = await response.json();
    locales[lang] = data || {};
    currentLocale = lang;
  } catch (error) {
    console.warn('Locale load failed, falling back to key passthrough:', error?.message || error);
    locales[lang] = locales[lang] || {};
    currentLocale = lang;
  }
};

export const setLocale = async (locale) => {
  if (!locales[locale]) {
    await loadLocales(locale);
  }
  currentLocale = locale;
  return true;
};

export const getText = (key, params = {}) => {
  if (!key || typeof key !== 'string') return '';
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