/**
 * Модуль управления настройками игры
 * Отвечает за загрузку, сохранение и предоставление доступа к настройкам.
 */
import { CONFIG } from './config.js';

const SETTINGS_KEY = 'gameSettings';

class SettingsManager {
    constructor() {
        this.settings = {};
        this.load();
    }

    /**
     * Загружает настройки из localStorage.
     * Если настройки не найдены, использует значения по умолчанию.
     */
    load() {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                // Объединяем сохраненные настройки с дефолтными, чтобы добавить новые, если их нет
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...CONFIG.APP_DEFAULTS, ...parsedSettings };
            } else {
                this.settings = { ...CONFIG.APP_DEFAULTS };
            }
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
            this.settings = { ...CONFIG.APP_DEFAULTS };
        }
    }

    /**
     * Сохраняет текущие настройки в localStorage.
     */
    save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    /**
     * Получает значение настройки по ключу.
     * @param {string} key - Ключ настройки.
     * @returns {*} Значение настройки или undefined.
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * Возвращает все настройки.
     * @returns {Object} Объект со всеми настройками.
     */
    getAll() {
        return { ...this.settings };
    }

    /**
     * Устанавливает значение для настройки и сохраняет.
     * @param {string} key - Ключ настройки.
     * @param {*} value - Новое значение.
     */
    set(key, value) {
        this.settings[key] = value;
        this.save();
    }
}

// Экспортируем единственный экземпляр менеджера (Singleton)
export const settingsManager = new SettingsManager();