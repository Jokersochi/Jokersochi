/**
 * Главный модуль игры Русская Монополия
 * Инициализирует все системы и управляет жизненным циклом приложения
 */

import { setLocale } from './localization.js';
import eventBus from './event-bus.js';
import { game } from './game.js';
import { settingsManager } from './settings-manager.js';
import AudioManager from './audio.js';

// Глобальные переменные
let _audio;
let _network;
let _tutorial;
let _achievements;
let _statistics;
let _tournaments;
let _roomManager;
let _eventManager;
let _tournamentManager;
let _tradeManager;
let _auctionManager;
let _allianceManager;

// Настройки приложения
const APP_CONFIG = {
    VERSION: '2.0.0',
    BUILD_DATE: '2024-01-01',
    DEBUG_MODE: false,
    AUTO_SAVE_INTERVAL: 30000, // 30 секунд
    MAX_SAVE_SLOTS: 10,
    DEFAULT_LANGUAGE: 'ru',
    SUPPORTED_LANGUAGES: ['ru', 'en', 'de', 'fr', 'es', 'zh', 'ja', 'ko']
};

/**
 * Основной класс приложения
 */
class App {
    constructor() {
        this.initialized = false;
        this.currentScreen = 'main-menu';
        this.settings = settingsManager.getAll();
        this.saveSlots = [];
        this.errorHandler = null;
        this.eventBus = eventBus;
        this.performanceMonitor = null;
        
        this.initializeApp();
    }

    /**
     * Инициализирует приложение
     */
    async initializeApp() {
        try {
            console.log('Initializing Russian Monopoly v' + APP_CONFIG.VERSION);
            
            // Инициализируем утилиты
            await this.initializeUtils();
            
            // Инициализируем локализацию
            await this.initializeLocalization();
            
            // Инициализируем аудио систему
            await this.initializeAudio();
            
            // Инициализируем сетевые функции
            await this.initializeNetwork();
            
            // Инициализируем систему обучения
            await this.initializeTutorial();
            
            // Инициализируем игровые модули
            await this.initializeGameModules();
            
            // Инициализируем пользовательский интерфейс
            await this.initializeUI();
            
            // Инициализируем обработчики событий
            await this.initializeEventHandlers();
            
            // Инициализируем систему мониторинга
            await this.initializeMonitoring();
            
            // Загружаем сохраненные игры
            await this.loadSaveSlots();
            
            // Показываем главное меню
            this.showMainMenu();
            
            this.initialized = true;
            console.log('App initialized successfully');
            
            // Запускаем автосохранение
            this.startAutoSave();
            
            // Показываем приветственное сообщение
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showErrorScreen(error);
        }
    }

    /**
     * Инициализирует утилиты
     */
    initializeUtils() {
        // Проверяем поддержку браузера
        this.checkBrowserSupport();
        
        console.log('Utils initialized');
    }

    /**
     * Проверяет поддержку браузера
     */
    checkBrowserSupport() {
        const requiredFeatures = [
            'localStorage',
            'sessionStorage',
            'WebSocket',
            'AudioContext',
            'requestAnimationFrame'
        ];

        const unsupportedFeatures = requiredFeatures.filter(feature => {
            switch (feature) {
                case 'localStorage':
                    return !window.localStorage;
                case 'sessionStorage':
                    return !window.sessionStorage;
                case 'WebSocket':
                    return !window.WebSocket;
                case 'AudioContext':
                    return !(window.AudioContext || window.webkitAudioContext);
                case 'requestAnimationFrame':
                    return !window.requestAnimationFrame;
                default:
                    return false;
            }
        });

        if (unsupportedFeatures.length > 0) {
            throw new Error(`Unsupported browser features: ${unsupportedFeatures.join(', ')}`);
        }
    }

    /**
     * Инициализирует локализацию
     */
    async initializeLocalization() {
        try {
            // Устанавливаем язык
            const language = settingsManager.get('language') || APP_CONFIG.DEFAULT_LANGUAGE;
            await setLocale(language);
            
            // Обновляем интерфейс
            this.updateLanguageDisplay();
            
            console.log('Localization initialized');
        } catch (error) {
            console.warn('Failed to initialize localization:', error);
        }
    }

    /**
     * Обновляет отображение языка
     */
    updateLanguageDisplay() {
        console.log('Language display updated');
    }

    /**
     * Инициализирует аудио систему
     */
    initializeAudio() {
        try {
            // Инициализируем аудио менеджер и пробрасываем в window
            const audioManager = new AudioManager();
            window.audio = audioManager;
            console.log('Audio system initialized');
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
        }
    }

    /**
     * Инициализирует сетевые функции
     */
    initializeNetwork() {
        try {
            // Сетевые функции будут инициализированы позже
            console.log('Network system initialization placeholder');
        } catch (error) {
            console.warn('Failed to initialize network:', error);
        }
    }

    /**
     * Настраивает обработчики сетевых событий
     */
    setupNetworkEventHandlers() {
        console.log('Network event handlers setup');
    }
    
    /**
     * Инициализирует систему обучения
     */
    initializeTutorial() {
        try {
            // Система обучения будет инициализирована позже
            console.log('Tutorial system initialization placeholder');
        } catch (error) {
            console.warn('Failed to initialize tutorial:', error);
        }
    }

    /**
     * Инициализирует игровые модули
     */
    initializeGameModules() {
        try {
            // Игровое поле и игра уже инициализированы через импорты
            console.log('Game modules initialized');
        } catch (error) {
            console.error('Failed to initialize game modules:', error);
            throw error;
        }
    }

    /**
     * Инициализирует пользовательский интерфейс
     */
    initializeUI() {
        try {
            // UI уже инициализирован через импорт
            // Настраиваем обработчики событий
            this.setupUIEventHandlers();
            
            console.log('UI initialized');
        } catch (error) {
            console.error('Failed to initialize UI:', error);
            throw error;
        }
    }

    /**
     * Инициализирует обработчики событий
     */
    initializeEventHandlers() {
        // Обработчики главного меню
        this.setupMainMenuHandlers();
        
        // Обработчики настроек
        this.setupSettingsHandlers();
        
        // Обработчики игры
        this.setupGameHandlers();
        
        // Обработчики сетевых функций
        this.setupNetworkHandlers();
        
        // Обработчики клавиатуры
        this.setupKeyboardHandlers();
        
        // Обработчики окна
        this.setupWindowHandlers();
        
        console.log('Event handlers initialized');
    }

    /**
     * Настраивает обработчики событий UI
     */
    setupUIEventHandlers() {
        // Обработчики для UI событий
        eventBus.on('boardUpdateRequest', () => {
            // Обновление игрового поля
            console.log('Board update requested');
        });

        eventBus.on('playersUpdateRequest', () => {
            // Обновление панели игроков
            console.log('Players update requested');
        });

        eventBus.on('currentPlayerUpdateRequest', () => {
            // Обновление текущего игрока
            console.log('Current player update requested');
        });

        eventBus.on('chatUpdated', (messages) => {
            // Обновление чата
            console.log('Chat updated:', messages.length, 'messages');
        });

        console.log('UI event handlers setup');
    }

    /**
     * Настраивает обработчики главного меню
     */
    setupMainMenuHandlers() {
        console.log('Main menu handlers setup');
    }

    /**
     * Настраивает обработчики настроек
     */
    setupSettingsHandlers() {
        console.log('Settings handlers setup');
    }

    /**
     * Настраивает обработчики игры
     */
    setupGameHandlers() {
        console.log('Game handlers setup');
    }

    /**
     * Настраивает обработчики сетевых функций
     */
    setupNetworkHandlers() {
        console.log('Network handlers setup');
    }

    /**
     * Настраивает обработчики клавиатуры
     */
    setupKeyboardHandlers() {
        console.log('Keyboard handlers setup');
    }

    /**
     * Настраивает обработчики окна
     */
    setupWindowHandlers() {
        console.log('Window handlers setup');
    }

    /**
     * Инициализирует систему мониторинга
     */
    initializeMonitoring() {
        try {
            // Мониторинг производительности
            this.performanceMonitor = {
                fps: 0,
                memory: 0,
                startTime: Date.now(),
                frameCount: 0
            };

            // Мониторинг ошибок
            this.errorHandler = {
                errors: [],
                warnings: [],
                maxErrors: 100
            };

            console.log('Monitoring system initialized');
        } catch (error) {
            console.warn('Failed to initialize monitoring:', error);
        }
    }

    /**
     * Запускает мониторинг производительности
     */
    startPerformanceMonitoring() {
        let lastTime = performance.now();

        const measureFPS = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            this.performanceMonitor.fps = Math.round(1000 / deltaTime);
            this.performanceMonitor.frameCount++;
            
            lastTime = currentTime;

            // Измеряем использование памяти
            if (performance.memory) {
                this.performanceMonitor.memory = performance.memory.usedJSHeapSize;
            }

            requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
    }

    /**
     * Загружает слоты сохранения
     */
    loadSaveSlots() {
        console.log('Save slots loaded');
    }

    /**
     * Запускает автосохранение
     */
    startAutoSave() {
        console.log('Auto-save started');
    }

    /**
     * Автосохранение
     */
    autoSave() {
        try {
            console.log('Auto-save completed');
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Показывает главное меню
     */
    showMainMenu() {
        this.currentScreen = 'main-menu';
        console.log('Main menu shown');
    }

    /**
     * Показывает экран настроек
     */
    showSettingsScreen() {
        this.currentScreen = 'settings';
        console.log('Settings screen shown');
        
        // Заполняем настройки
        this.populateSettings();
    }

    /**
     * Заполняет настройки
     */
    populateSettings() {
        console.log('Settings populated');
    }

    /**
     * Показывает экран присоединения к игре
     */
    showJoinGameScreen() {
        this.currentScreen = 'join-game';
        console.log('Join game screen shown');
    }

    /**
     * Показывает экран правил
     */
    showRulesScreen() {
        this.currentScreen = 'rules';
        console.log('Rules screen shown');
    }

    /**
     * Начинает новую игру
     */
    startNewGame() {
        try {
            // Собираем данные игроков
            const playerData = this.collectPlayerData();
            
            if (playerData.length < 2) {
                this.showNotification('Минимум 2 игрока для начала игры', 'warning');
                return;
            }

            // Обновляем настройки
            this.updateSettingsFromForm();

            // Начинаем игру
            game.startNewGame(playerData);

            // Показываем игровой экран
            this.currentScreen = 'game';

        } catch (error) {
            console.error('Failed to start new game:', error);
            this.showNotification('Ошибка при запуске игры', 'error');
        }
    }

    /**
     * Собирает данные игроков
     */
    collectPlayerData() {
        const players = [];
        for (let i = 0; i < 4; i++) {
            players.push({
                id: `player_${i + 1}`,
                name: `Игрок ${i + 1}`,
                token: 'matryoshka'
            });
        }
        return players;
    }

    /**
     * Обновляет настройки из формы
     */
    updateSettingsFromForm() {
        // Настройки обновляются через settingsManager, который автоматически сохраняет их
        console.log('Settings updated from form');
    }

    /**
     * Выбирает токен
     * @param {string} token - токен
     */
    selectToken(token) {
        console.log('Token selected:', token);
    }

    /**
     * Обновляет настройку правила
     * @param {string} settingId - ID настройки
     * @param {boolean} value - значение
     */
    updateRuleSetting(settingId, value) {
        settingsManager.set(settingId, value);
        this.settings = settingsManager.getAll(); // Обновляем локальную копию
        console.log('Rule setting updated:', settingId, value);
    }

    /**
     * Меняет язык
     * @param {string} language - язык
     */
    async changeLanguage(language) {
        settingsManager.set('language', language);
        this.settings = settingsManager.getAll(); // Обновляем локальную копию
        await setLocale(language);
        
        // Обновляем интерфейс
        this.updateLanguageDisplay();
        
        console.log('Language changed to:', language);
    }

    /**
     * Бросает кости
     */
    rollDice() {
        if (!game || game.gameState !== 'playing') return;

        const result = game.rollDice();
        if (result) {
            console.log('Dice rolled:', result);
        }
    }

    /**
     * Завершает ход
     */
    endTurn() {
        if (!game || game.gameState !== 'playing') return;

        game.nextPlayer();
        console.log('Turn ended');
    }

    /**
     * Обрабатывает действие
     * @param {string} action - действие
     */
    handleAction(action) {
        if (!game) return;

        console.log('Action handled:', action);
    }

    /**
     * Обрабатывает сетевое действие
     * @param {string} action - действие
     */
    handleNetworkAction(action) {
        console.log('Network action handled:', action);
    }

    /**
     * Обрабатывает нажатие клавиши
     * @param {KeyboardEvent} e - событие клавиши
     */
    handleKeyPress(e) {
        // Горячие клавиши
        switch (e.key) {
            case 'Escape':
                this.handleEscapeKey();
                break;
            case 'Enter':
                this.handleEnterKey();
                break;
            case 'Space':
                e.preventDefault();
                this.handleSpaceKey();
                break;
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'F1':
                e.preventDefault();
                this.showHelp();
                break;
            case 'F2':
                e.preventDefault();
                this.showSettings();
                break;
            case 'F3':
                e.preventDefault();
                this.showStatistics();
                break;
            case 'F4':
                e.preventDefault();
                this.showAchievements();
                break;
        }
    }

    /**
     * Обрабатывает клавишу Escape
     */
    handleEscapeKey() {
        console.log('Escape key pressed');
    }

    /**
     * Обрабатывает клавишу Enter
     */
    handleEnterKey() {
        console.log('Enter key pressed');
    }

    /**
     * Обрабатывает клавишу Space
     */
    handleSpaceKey() {
        console.log('Space key pressed');
    }

    /**
     * Переключает полноэкранный режим
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            settingsManager.set('fullscreen', true);
        } else {
            document.exitFullscreen();
            settingsManager.set('fullscreen', false);
        }
        this.settings = settingsManager.getAll(); // Обновляем локальную копию
    }

    /**
     * Показывает справку
     */
    showHelp() {
        console.log('Help shown');
    }

    /**
     * Показывает настройки
     */
    showSettings() {
        this.showSettingsScreen();
    }

    /**
     * Показывает статистику
     */
    showStatistics() {
        console.log('Statistics modal shown');
    }

    /**
     * Показывает достижения
     */
    showAchievements() {
        console.log('Achievements modal shown');
    }

    /**
     * Обрабатывает изменение размера окна
     */
    handleWindowResize() {
        console.log('Window resized');
    }

    /**
     * Обрабатывает потерю фокуса окна
     */
    handleWindowBlur() {
        console.log('Window lost focus');
    }

    /**
     * Обрабатывает получение фокуса окна
     */
    handleWindowFocus() {
        console.log('Window gained focus');
    }

    /**
     * Обрабатывает закрытие окна
     * @param {Event} e - событие
     */
    handleBeforeUnload(_e) {
        console.log('Window closing');
    }

    /**
     * Обрабатывает ошибку
     * @param {Error} error - ошибка
     */
    handleError(error) {
        console.error('App error:', error);

        // Добавляем в список ошибок
        if (this.errorHandler) {
            this.errorHandler.errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });

            // Ограничиваем количество ошибок
            if (this.errorHandler.errors.length > this.errorHandler.maxErrors) {
                this.errorHandler.errors.shift();
            }
        }

        // Показываем уведомление
        this.showNotification('Произошла ошибка. Проверьте консоль для деталей.', 'error');
    }

    /**
     * Показывает уведомление
     * @param {string} message - сообщение
     * @param {string} type - тип уведомления
     */
    showNotification(message, type = 'info') {
        console.log(`Notification [${type}]: ${message}`);
    }

    /**
     * Показывает экран ошибки
     * @param {Error} error - ошибка
     */
    showErrorScreen(error) {
        const errorScreen = document.createElement('div');
        errorScreen.className = 'error-screen';
        errorScreen.innerHTML = `
            <div class="error-content">
                <h1>😞 Произошла ошибка</h1>
                <p>Не удалось запустить игру. Попробуйте обновить страницу.</p>
                <p class="error-details">${error.message}</p>
                <button onclick="location.reload()">Обновить страницу</button>
            </div>
        `;
        
        document.body.innerHTML = '';
        document.body.appendChild(errorScreen);
    }

    /**
     * Показывает приветственное сообщение
     */
    showWelcomeMessage() {
        console.log('Welcome message shown');
    }

    /**
     * Получает статистику приложения
     * @returns {Object} статистика
     */
    getAppStats() {
        return {
            version: APP_CONFIG.VERSION,
            uptime: Date.now() - this.performanceMonitor.startTime,
            fps: this.performanceMonitor.fps,
            memory: this.performanceMonitor.memory,
            frameCount: this.performanceMonitor.frameCount,
            errors: this.errorHandler.errors.length,
            warnings: this.errorHandler.warnings.length,
            currentScreen: this.currentScreen
        };
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

// Глобальные функции для UI (оставляем только для совместимости с HTML)
// В будущем можно заменить на event listeners
window.startNewGame = () => app?.startNewGame();
window.joinGame = () => app?.showJoinGameScreen();
window.showSettings = () => app?.showSettingsScreen();
window.showRules = () => app?.showRulesScreen();
window.rollDice = () => app?.rollDice();
window.endTurn = () => app?.endTurn();
window.changeLanguage = (lang) => app?.changeLanguage(lang);
window.toggleFullscreen = () => app?.toggleFullscreen();
window.showHelp = () => app?.showHelp();
window.showStatistics = () => app?.showStatistics();
window.showAchievements = () => app?.showAchievements();

// Экспорт для тестирования
export { App, APP_CONFIG }; 