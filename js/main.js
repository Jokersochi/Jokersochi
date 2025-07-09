/**
 * Главный модуль игры Русская Монополия
 * Инициализирует все системы и управляет жизненным циклом приложения
 */

import { loadLocales, setLocale } from './localization.js';

// Глобальные переменные
let game;
let board;
let ui;
let audio;
let network;
let tutorial;
let achievements;
let statistics;
let tournaments;
let roomManager;
let tournamentManager;

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
        this.settings = {};
        this.saveSlots = [];
        this.errorHandler = null;
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
            
            // Загружаем настройки
            await this.loadSettings();
            
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
    async initializeUtils() {
        // Проверяем поддержку браузера
        this.checkBrowserSupport();
        
        // Инициализируем утилиты
        if (typeof utils === 'undefined') {
            throw new Error('Utils module not found');
        }
        
        // Инициализируем конфигурацию
        if (typeof CONFIG === 'undefined') {
            throw new Error('Config module not found');
        }
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
     * Загружает настройки
     */
    async loadSettings() {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
            } else {
                this.settings = {
                    language: APP_CONFIG.DEFAULT_LANGUAGE,
                    soundVolume: 0.7,
                    musicVolume: 0.5,
                    masterVolume: 1.0,
                    muted: false,
                    autoSave: true,
                    animations: true,
                    particles: true,
                    fullscreen: false,
                    theme: 'dark',
                    quality: 'high',
                    networkEnabled: true,
                    tutorialEnabled: true,
                    notifications: true,
                    chatEnabled: true,
                    tradeEnabled: true,
                    auctionEnabled: true,
                    weatherEnabled: true,
                    eventsEnabled: true,
                    alliancesEnabled: true,
                    tournamentsEnabled: true,
                    achievementsEnabled: true
                };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
            this.settings = {};
        }
    }

    /**
     * Сохраняет настройки
     */
    saveSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    /**
     * Инициализирует локализацию
     */
    async initializeLocalization() {
        // Устанавливаем язык
        const language = this.settings.language || APP_CONFIG.DEFAULT_LANGUAGE;
        utils.setLanguage(language);
        
        // Обновляем интерфейс
        this.updateLanguageDisplay();
    }

    /**
     * Обновляет отображение языка
     */
    updateLanguageDisplay() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = this.settings.language;
        }
    }

    /**
     * Инициализирует аудио систему
     */
    async initializeAudio() {
        try {
            audio = new AudioManager();
            await audio.loadSettings();
            
            // Применяем настройки звука
            audio.setMasterVolume(this.settings.masterVolume);
            audio.setSoundVolume(this.settings.soundVolume);
            audio.setMusicVolume(this.settings.musicVolume);
            audio.setMuted(this.settings.muted);
            
            console.log('Audio system initialized');
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
        }
    }

    /**
     * Инициализирует сетевые функции
     */
    async initializeNetwork() {
        try {
            if (this.settings.networkEnabled) {
                network = new NetworkManager();
                roomManager = new RoomManager(network);
                tournamentManager = new TournamentManager(network);
                
                // Настраиваем обработчики сетевых событий
                this.setupNetworkEventHandlers();
                
                console.log('Network system initialized');
            }
        } catch (error) {
            console.warn('Failed to initialize network:', error);
        }
    }

    /**
     * Настраивает обработчики сетевых событий
     */
    setupNetworkEventHandlers() {
        if (!network) return;

        network.on('connected', () => {
            console.log('Connected to server');
            this.showNotification('Подключено к серверу', 'success');
        });

        network.on('disconnected', () => {
            console.log('Disconnected from server');
            this.showNotification('Отключено от сервера', 'warning');
        });

        network.on('error', (error) => {
            console.error('Network error:', error);
            this.showNotification('Ошибка сети', 'error');
        });

        network.on('room_joined', (data) => {
            console.log('Joined room:', data);
            this.showNotification(`Присоединились к комнате: ${data.roomId}`, 'info');
        });

        network.on('player_joined', (data) => {
            console.log('Player joined:', data);
            this.showNotification(`${data.player.name} присоединился к игре`, 'info');
        });

        network.on('player_left', (data) => {
            console.log('Player inset-inline-start:', data);
            this.showNotification(`${data.player.name} покинул игру`, 'warning');
        });

        network.on('game_state', (data) => {
            if (game) {
                game.syncGameState(data);
            }
        });

        network.on('chat_message', (data) => {
            if (game) {
                game.addChatMessage(data.sender, data.message);
            }
        });

        network.on('trade_offer', (data) => {
            this.showTradeOffer(data);
        });

        network.on('auction_update', (data) => {
            if (game) {
                game.updateAuction(data);
            }
        });

        network.on('weather_change', (data) => {
            if (game) {
                game.updateWeather(data);
            }
        });

        network.on('event_trigger', (data) => {
            if (game) {
                game.triggerEvent(data);
            }
        });

        network.on('tournament_update', (data) => {
            this.updateTournamentDisplay(data);
        });

        network.on('achievement_unlocked', (data) => {
            this.showAchievementUnlocked(data);
        });
    }

    /**
     * Инициализирует систему обучения
     */
    async initializeTutorial() {
        try {
            if (this.settings.tutorialEnabled) {
                tutorial = new TutorialManager();
                console.log('Tutorial system initialized');
            }
        } catch (error) {
            console.warn('Failed to initialize tutorial:', error);
        }
    }

    /**
     * Инициализирует игровые модули
     */
    async initializeGameModules() {
        try {
            // Инициализируем игровые системы
            achievements = new AchievementSystem();
            statistics = new StatisticsSystem();
            tournaments = new TournamentSystem();

            // Инициализируем игровое поле
            board = new Board();
            
            // Инициализируем игру
            game = new Game();
            
            console.log('Game modules initialized');
        } catch (error) {
            console.error('Failed to initialize game modules:', error);
            throw error;
        }
    }

    /**
     * Инициализирует пользовательский интерфейс
     */
    async initializeUI() {
        try {
            ui = new UI();
            await ui.initialize();
            
            console.log('UI initialized');
        } catch (error) {
            console.error('Failed to initialize UI:', error);
            throw error;
        }
    }

    /**
     * Инициализирует обработчики событий
     */
    async initializeEventHandlers() {
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
     * Настраивает обработчики главного меню
     */
    setupMainMenuHandlers() {
        // Новая игра
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.showSettingsScreen();
            });
        }

        // Присоединиться к игре
        const joinGameBtn = document.getElementById('join-game-btn');
        if (joinGameBtn) {
            joinGameBtn.addEventListener('click', () => {
                this.showJoinGameScreen();
            });
        }

        // Настройки
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsScreen();
            });
        }

        // Правила
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) {
            rulesBtn.addEventListener('click', () => {
                this.showRulesScreen();
            });
        }

        // Выбор языка
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }
    }

    /**
     * Настраивает обработчики настроек
     */
    setupSettingsHandlers() {
        // Назад к меню
        const backToMenuBtn = document.getElementById('back-to-menu');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                this.showMainMenu();
            });
        }

        // Начать игру
        const startGameBtn = document.getElementById('start-game');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startNewGame();
            });
        }

        // Выбор токенов
        const tokenOptions = document.querySelectorAll('.token-option');
        tokenOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectToken(option.dataset.token);
            });
        });

        // Настройки правил
        const ruleOptions = document.querySelectorAll('input[type="checkbox"]');
        ruleOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                this.updateRuleSetting(e.target.id, e.target.checked);
            });
        });
    }

    /**
     * Настраивает обработчики игры
     */
    setupGameHandlers() {
        // Бросок костей
        const diceBtn = document.getElementById('dice-btn');
        if (diceBtn) {
            diceBtn.addEventListener('click', () => {
                this.rollDice();
            });
        }

        // Завершить ход
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', () => {
                this.endTurn();
            });
        }

        // Кнопки действий
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleAction(e.target.dataset.action);
            });
        });
    }

    /**
     * Настраивает обработчики сетевых функций
     */
    setupNetworkHandlers() {
        if (!network) return;

        // Кнопки сетевых функций
        const networkButtons = document.querySelectorAll('.network-btn');
        networkButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleNetworkAction(e.target.dataset.action);
            });
        });
    }

    /**
     * Настраивает обработчики клавиатуры
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
    }

    /**
     * Настраивает обработчики окна
     */
    setupWindowHandlers() {
        // Изменение размера окна
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Потеря фокуса
        window.addEventListener('blur', () => {
            this.handleWindowBlur();
        });

        // Получение фокуса
        window.addEventListener('focus', () => {
            this.handleWindowFocus();
        });

        // Перед закрытием
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
    }

    /**
     * Инициализирует систему мониторинга
     */
    async initializeMonitoring() {
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

            // Перехват ошибок
            window.addEventListener('error', (e) => {
                this.handleError(e.error);
            });

            window.addEventListener('unhandledrejection', (e) => {
                this.handleError(e.reason);
            });

            // Запуск мониторинга FPS
            this.startPerformanceMonitoring();

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
    async loadSaveSlots() {
        try {
            for (let i = 1; i <= APP_CONFIG.MAX_SAVE_SLOTS; i++) {
                const saveData = localStorage.getItem(`saveSlot_${i}`);
                if (saveData) {
                    const save = JSON.parse(saveData);
                    this.saveSlots[i] = save;
                }
            }
        } catch (error) {
            console.warn('Failed to load save slots:', error);
        }
    }

    /**
     * Запускает автосохранение
     */
    startAutoSave() {
        if (!this.settings.autoSave) return;

        setInterval(() => {
            if (game && game.gameState === 'playing') {
                this.autoSave();
            }
        }, APP_CONFIG.AUTO_SAVE_INTERVAL);
    }

    /**
     * Автосохранение
     */
    autoSave() {
        try {
            const saveData = game.saveGame();
            const autoSaveSlot = {
                id: 'auto',
                name: 'Автосохранение',
                timestamp: Date.now(),
                data: saveData
            };

            localStorage.setItem('autoSave', JSON.stringify(autoSaveSlot));
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
        ui.showScreen('main-menu');
        
        // Воспроизводим музыку меню
        if (audio) {
            audio.playMusic('menu_music');
        }
    }

    /**
     * Показывает экран настроек
     */
    showSettingsScreen() {
        this.currentScreen = 'settings';
        ui.showScreen('settings');
        
        // Заполняем настройки
        this.populateSettings();
    }

    /**
     * Заполняет настройки
     */
    populateSettings() {
        // Количество игроков
        const playerCount = document.getElementById('player-count');
        if (playerCount) {
            playerCount.value = this.settings.playerCount || 4;
        }

        // Выбранные токены
        const selectedTokens = this.settings.selectedTokens || [];
        selectedTokens.forEach(token => {
            const tokenOption = document.querySelector(`[data-token="${token}"]`);
            if (tokenOption) {
                tokenOption.classList.add('selected');
            }
        });

        // Настройки правил
        Object.keys(this.settings).forEach(key => {
            if (key.endsWith('Enabled')) {
                const checkbox = document.getElementById(key);
                if (checkbox) {
                    checkbox.checked = this.settings[key];
                }
            }
        });
    }

    /**
     * Показывает экран присоединения к игре
     */
    showJoinGameScreen() {
        if (!network) {
            this.showNotification('Сетевые функции отключены', 'error');
            return;
        }

        this.currentScreen = 'join-game';
        ui.showScreen('join-game');
    }

    /**
     * Показывает экран правил
     */
    showRulesScreen() {
        this.currentScreen = 'rules';
        ui.showScreen('rules');
    }

    /**
     * Начинает новую игру
     */
    startNewGame() {
        try {
            // Сбросить достижения, статистику и турниры для новой игры
            if (achievements) achievements.playerAchievements.clear();
            if (statistics) statistics.initializeStats();
            if (tournaments) tournaments.activeTournaments.clear();

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
            ui.showScreen('game');

            // Воспроизводим игровую музыку
            if (audio) {
                audio.playMusic('game_music');
            }

            // Показываем учебник для новых игроков
            if (tutorial && !tutorial.isTutorialCompleted('basic')) {
                setTimeout(() => {
                    tutorial.startTutorial('basic');
                }, 2000);
            }

        } catch (error) {
            console.error('Failed to start new game:', error);
            this.showNotification('Ошибка при запуске игры', 'error');
        }
    }

    /**
     * Собирает данные игроков
     */
    collectPlayerData() {
        const playerCount = parseInt(document.getElementById('player-count').value);
        const selectedTokens = Array.from(document.querySelectorAll('.token-option.selected'))
            .map(option => option.dataset.token);

        const players = [];
        for (let i = 0; i < playerCount; i++) {
            players.push({
                id: `player_${i + 1}`,
                name: `Игрок ${i + 1}`,
                token: selectedTokens[i] || 'matryoshka'
            });
        }

        return players;
    }

    /**
     * Обновляет настройки из формы
     */
    updateSettingsFromForm() {
        // Количество игроков
        this.settings.playerCount = parseInt(document.getElementById('player-count').value);

        // Выбранные токены
        this.settings.selectedTokens = Array.from(document.querySelectorAll('.token-option.selected'))
            .map(option => option.dataset.token);

        // Настройки правил
        const ruleOptions = document.querySelectorAll('input[type="checkbox"]');
        ruleOptions.forEach(option => {
            this.settings[option.id] = option.checked;
        });

        // Сохраняем настройки
        this.saveSettings();
    }

    /**
     * Выбирает токен
     * @param {string} token - токен
     */
    selectToken(token) {
        const tokenOptions = document.querySelectorAll('.token-option');
        tokenOptions.forEach(option => {
            option.classList.remove('selected');
        });

        const selectedOption = document.querySelector(`[data-token="${token}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        // Воспроизводим звук
        if (audio) {
            audio.playSound('button_click');
        }
    }

    /**
     * Обновляет настройку правила
     * @param {string} settingId - ID настройки
     * @param {boolean} value - значение
     */
    updateRuleSetting(settingId, value) {
        this.settings[settingId] = value;
        this.saveSettings();

        // Воспроизводим звук
        if (audio) {
            audio.playSound('button_click');
        }
    }

    /**
     * Меняет язык
     * @param {string} language - язык
     */
    async changeLanguage(language) {
        this.settings.language = language;
        this.saveSettings();
        await setLocale(language);
        
        // Обновляем интерфейс
        this.updateLanguageDisplay();
        
        // Воспроизводим звук
        if (audio) {
            audio.playSound('button_click');
        }
    }

    /**
     * Бросает кости
     */
    rollDice() {
        if (!game || game.gameState !== 'playing') return;

        const result = game.rollDice();
        if (result) {
            // Воспроизводим звук
            if (audio) {
                audio.playDiceRoll(result.dice1, result.dice2);
            }

            // Обновляем UI
            ui.updateDiceDisplay(result);
        }
    }

    /**
     * Завершает ход
     */
    endTurn() {
        if (!game || game.gameState !== 'playing') return;

        game.nextPlayer();
        
        // Воспроизводим звук
        if (audio) {
            audio.playSound('button_click');
        }
    }

    /**
     * Обрабатывает действие
     * @param {string} action - действие
     */
    handleAction(action) {
        if (!game) return;

        switch (action) {
            case 'buy_property':
                game.buyProperty();
                break;
            case 'sell_property':
                game.sellProperty();
                break;
            case 'build_residence':
                game.buildResidence();
                break;
            case 'improve_property':
                game.improveProperty();
                break;
            case 'mortgage_property':
                game.mortgageProperty();
                break;
            case 'trade':
                game.showTradeDialog();
                break;
            case 'auction':
                game.showAuctionDialog();
                break;
            case 'alliance':
                game.showAllianceDialog();
                break;
            default:
                console.warn('Unknown action:', action);
        }

        // Воспроизводим звук
        if (audio) {
            audio.playSound('button_click');
        }
    }

    /**
     * Обрабатывает сетевое действие
     * @param {string} action - действие
     */
    handleNetworkAction(action) {
        if (!network) return;

        switch (action) {
            case 'connect':
                network.connect();
                break;
            case 'disconnect':
                network.disconnect();
                break;
            case 'create_room':
                this.showCreateRoomDialog();
                break;
            case 'join_room':
                this.showJoinRoomDialog();
                break;
            case 'leave_room':
                network.leaveRoom();
                break;
            case 'create_tournament':
                this.showCreateTournamentDialog();
                break;
            case 'join_tournament':
                this.showJoinTournamentDialog();
                break;
            default:
                console.warn('Unknown network action:', action);
        }

        // Воспроизводим звук
        if (audio) {
            audio.playSound('button_click');
        }
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
        switch (this.currentScreen) {
            case 'game':
                this.showPauseMenu();
                break;
            case 'settings':
            case 'rules':
            case 'join-game':
                this.showMainMenu();
                break;
            default:
                // Закрываем модальные окна
                ui.closeAllModals();
        }
    }

    /**
     * Обрабатывает клавишу Enter
     */
    handleEnterKey() {
        switch (this.currentScreen) {
            case 'main-menu':
                this.startNewGame();
                break;
            case 'game':
                this.rollDice();
                break;
        }
    }

    /**
     * Обрабатывает клавишу Space
     */
    handleSpaceKey() {
        if (this.currentScreen === 'game') {
            this.rollDice();
        }
    }

    /**
     * Переключает полноэкранный режим
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.settings.fullscreen = true;
        } else {
            document.exitFullscreen();
            this.settings.fullscreen = false;
        }
        this.saveSettings();
    }

    /**
     * Показывает справку
     */
    showHelp() {
        if (tutorial) {
            tutorial.startTutorial('basic');
        }
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
        ui.showStatisticsModal();
    }

    /**
     * Показывает достижения
     */
    showAchievements() {
        ui.showAchievementsModal();
    }

    /**
     * Обрабатывает изменение размера окна
     */
    handleWindowResize() {
        // Обновляем UI при изменении размера окна
        if (ui) {
            ui.handleResize();
        }
    }

    /**
     * Обрабатывает потерю фокуса окна
     */
    handleWindowBlur() {
        // Приостанавливаем игру при потере фокуса
        if (game && game.gameState === 'playing') {
            game.pauseGame();
        }
    }

    /**
     * Обрабатывает получение фокуса окна
     */
    handleWindowFocus() {
        // Возобновляем игру при получении фокуса
        if (game && game.gameState === 'paused') {
            game.resumeGame();
        }
    }

    /**
     * Обрабатывает закрытие окна
     * @param {Event} e - событие
     */
    handleBeforeUnload(e) {
        if (game && game.gameState === 'playing') {
            // Автосохранение перед закрытием
            this.autoSave();
            
            const message = 'Игра будет сохранена автоматически. Вы уверены, что хотите покинуть страницу?';
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
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

        // Воспроизводим звук ошибки
        if (audio) {
            audio.playErrorSound();
        }
    }

    /**
     * Показывает уведомление
     * @param {string} message - сообщение
     * @param {string} type - тип уведомления
     */
    showNotification(message, type = 'info') {
        if (ui) {
            ui.showNotification(message, type);
        }

        // Воспроизводим звук
        if (audio) {
            switch (type) {
                case 'success':
                    audio.playSound('notification');
                    break;
                case 'error':
                    audio.playErrorSound();
                    break;
                case 'warning':
                    audio.playSound('warning');
                    break;
                default:
                    audio.playSound('notification');
            }
        }
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
        if (tutorial && !tutorial.isTutorialCompleted('basic')) {
            setTimeout(() => {
                this.showNotification('Добро пожаловать! Нажмите F1 для обучения.', 'info');
            }, 1000);
        }
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
            currentScreen: this.currentScreen,
            networkConnected: network ? network.isConnected() : false,
            audioEnabled: audio ? audio.isInitialized() : false,
            tutorialCompleted: tutorial ? tutorial.getProgress().percentage : 0
        };
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

// Глобальные функции для UI
window.startNewGame = () => app.startNewGame();
window.joinGame = () => app.showJoinGameScreen();
window.showSettings = () => app.showSettingsScreen();
window.showRules = () => app.showRulesScreen();
window.rollDice = () => app.rollDice();
window.endTurn = () => app.endTurn();
window.changeLanguage = (lang) => app.changeLanguage(lang);
window.toggleFullscreen = () => app.toggleFullscreen();
window.showHelp = () => app.showHelp();
window.showStatistics = () => app.showStatistics();
window.showAchievements = () => app.showAchievements();

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, APP_CONFIG };
} 