/**
 * Модуль управления звуком и музыкой
 * Обеспечивает воспроизведение звуковых эффектов, фоновой музыки и настройки звука
 */

class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.music = new Map();
        this.currentMusic = null;
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
        this.masterVolume = 1.0;
        this.muted = false;
        this.audioContext = null;
        this.initialized = false;
        
        this.soundQueue = [];
        this.isPlaying = false;
        
        this.initializeAudio();
    }

    /**
     * Инициализирует аудио систему
     */
    async initializeAudio() {
        try {
            // Создаем AudioContext для современных браузеров
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Загружаем звуки
            await this.loadSounds();
            
            // Загружаем музыку
            await this.loadMusic();
            
            this.initialized = true;
            console.log('Audio system initialized');
            
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }

    /**
     * Загружает звуковые эффекты
     */
    async loadSounds() {
        const soundFiles = {
            // Основные звуки игры
            dice_roll: 'assets/sounds/dice_roll.mp3',
            money: 'assets/sounds/money.mp3',
            property_purchase: 'assets/sounds/property_purchase.mp3',
            rent_payment: 'assets/sounds/rent_payment.mp3',
            jail: 'assets/sounds/jail.mp3',
            bankruptcy: 'assets/sounds/bankruptcy.mp3',
            victory: 'assets/sounds/victory.mp3',
            
            // Звуки карточек
            chance_card: 'assets/sounds/chance_card.mp3',
            treasure_card: 'assets/sounds/treasure_card.mp3',
            
            // Звуки аукциона
            auction_start: 'assets/sounds/auction_start.mp3',
            auction_bid: 'assets/sounds/auction_bid.mp3',
            auction_end: 'assets/sounds/auction_end.mp3',
            
            // Звуки торговли
            trade_offer: 'assets/sounds/trade_offer.mp3',
            trade_accept: 'assets/sounds/trade_accept.mp3',
            trade_reject: 'assets/sounds/trade_reject.mp3',
            
            // Звуки строительства
            build_residence: 'assets/sounds/build_residence.mp3',
            improve_property: 'assets/sounds/improve_property.mp3',
            
            // Звуки событий
            weather_change: 'assets/sounds/weather_change.mp3',
            economic_event: 'assets/sounds/economic_event.mp3',
            cultural_event: 'assets/sounds/cultural_event.mp3',
            
            // Звуки интерфейса
            button_click: 'assets/sounds/button_click.mp3',
            menu_open: 'assets/sounds/menu_open.mp3',
            menu_close: 'assets/sounds/menu_close.mp3',
            notification: 'assets/sounds/notification.mp3',
            achievement: 'assets/sounds/achievement.mp3',
            
            // Звуки чата
            chat_message: 'assets/sounds/chat_message.mp3',
            player_join: 'assets/sounds/player_join.mp3',
            player_leave: 'assets/sounds/player_leave.mp3',
            
            // Звуки турниров
            tournament_start: 'assets/sounds/tournament_start.mp3',
            tournament_end: 'assets/sounds/tournament_end.mp3',
            round_start: 'assets/sounds/round_start.mp3',
            round_end: 'assets/sounds/round_end.mp3',
            
            // Звуки альянсов
            alliance_form: 'assets/sounds/alliance_form.mp3',
            alliance_break: 'assets/sounds/alliance_break.mp3',
            
            // Звуки ошибок
            error: 'assets/sounds/error.mp3',
            warning: 'assets/sounds/warning.mp3',
            
            // Звуки навигации
            move_token: 'assets/sounds/move_token.mp3',
            land_on_property: 'assets/sounds/land_on_property.mp3',
            pass_go: 'assets/sounds/pass_go.mp3',
            
            // Звуки налогов и штрафов
            pay_tax: 'assets/sounds/pay_tax.mp3',
            pay_fine: 'assets/sounds/pay_fine.mp3',
            
            // Звуки улучшений
            mortgage: 'assets/sounds/mortgage.mp3',
            unmortgage: 'assets/sounds/unmortgage.mp3',
            
            // Звуки погоды
            rain: 'assets/sounds/rain.mp3',
            snow: 'assets/sounds/snow.mp3',
            storm: 'assets/sounds/storm.mp3',
            wind: 'assets/sounds/wind.mp3'
        };

        for (const [name, path] of Object.entries(soundFiles)) {
            try {
                const audio = await this.loadAudioFile(path);
                this.sounds.set(name, audio);
            } catch (error) {
                console.warn(`Failed to load sound: ${name}`, error);
            }
        }
    }

    /**
     * Загружает фоновую музыку
     */
    async loadMusic() {
        const musicFiles = {
            // Основная музыка
            main_theme: 'assets/music/main_theme.mp3',
            menu_music: 'assets/music/menu_music.mp3',
            game_music: 'assets/music/game_music.mp3',
            
            // Музыка для разных ситуаций
            victory_music: 'assets/music/victory_music.mp3',
            defeat_music: 'assets/music/defeat_music.mp3',
            tension_music: 'assets/music/tension_music.mp3',
            
            // Музыка для турниров
            tournament_music: 'assets/music/tournament_music.mp3',
            final_round: 'assets/music/final_round.mp3',
            
            // Музыка для событий
            economic_boom: 'assets/music/economic_boom.mp3',
            economic_crisis: 'assets/music/economic_crisis.mp3',
            cultural_festival: 'assets/music/cultural_festival.mp3',
            
            // Музыка для погоды
            sunny_music: 'assets/music/sunny_music.mp3',
            rainy_music: 'assets/music/rainy_music.mp3',
            snowy_music: 'assets/music/snowy_music.mp3',
            stormy_music: 'assets/music/stormy_music.mp3',
            
            // Музыка для аукционов
            auction_music: 'assets/music/auction_music.mp3',
            
            // Музыка для торговли
            trade_music: 'assets/music/trade_music.mp3',
            
            // Музыка для альянсов
            alliance_music: 'assets/music/alliance_music.mp3',
            
            // Музыка для достижений
            achievement_music: 'assets/music/achievement_music.mp3'
        };

        for (const [name, path] of Object.entries(musicFiles)) {
            try {
                const audio = await this.loadAudioFile(path, true);
                this.music.set(name, audio);
            } catch (error) {
                console.warn(`Failed to load music: ${name}`, error);
            }
        }
    }

    /**
     * Загружает аудио файл
     * @param {string} path - путь к файлу
     * @param {boolean} isMusic - является ли музыкой
     * @returns {Promise<HTMLAudioElement>} аудио элемент
     */
    loadAudioFile(path, isMusic = false) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                if (isMusic) {
                    audio.loop = true;
                }
                resolve(audio);
            });
            
            audio.addEventListener('error', (error) => {
                reject(error);
            });
            
            audio.src = path;
            audio.load();
        });
    }

    /**
     * Воспроизводит звуковой эффект
     * @param {string} soundName - название звука
     * @param {Object} options - опции воспроизведения
     */
    playSound(soundName, options = {}) {
        if (this.muted || !this.initialized) return;

        const sound = this.sounds.get(soundName);
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        try {
            // Создаем копию звука для одновременного воспроизведения
            const soundClone = sound.cloneNode();
            
            // Применяем настройки громкости
            const volume = (options.volume || 1.0) * this.soundVolume * this.masterVolume;
            soundClone.volume = Math.max(0, Math.min(1, volume));
            
            // Применяем другие опции
            if (options.rate) {
                soundClone.playbackRate = options.rate;
            }
            
            if (options.pitch) {
                // Изменение тона через Web Audio API
                if (this.audioContext) {
                    const source = this.audioContext.createMediaElementSource(soundClone);
                    const pitchShift = this.audioContext.createBiquadFilter();
                    pitchShift.type = 'highpass';
                    pitchShift.frequency.value = options.pitch;
                    source.connect(pitchShift);
                    pitchShift.connect(this.audioContext.destination);
                }
            }

            // Воспроизводим звук
            soundClone.play().catch(error => {
                console.warn(`Failed to play sound: ${soundName}`, error);
            });

            // Очищаем память после воспроизведения
            soundClone.addEventListener('ended', () => {
                soundClone.remove();
            });

        } catch (error) {
            console.error(`Error playing sound: ${soundName}`, error);
        }
    }

    /**
     * Воспроизводит фоновую музыку
     * @param {string} musicName - название музыки
     * @param {Object} options - опции воспроизведения
     */
    playMusic(musicName, options = {}) {
        if (this.muted || !this.initialized) return;

        const music = this.music.get(musicName);
        if (!music) {
            console.warn(`Music not found: ${musicName}`);
            return;
        }

        try {
            // Останавливаем текущую музыку
            this.stopMusic();

            // Настраиваем новую музыку
            this.currentMusic = music;
            this.currentMusic.volume = (options.volume || 1.0) * this.musicVolume * this.masterVolume;
            this.currentMusic.loop = options.loop !== false; // по умолчанию зациклена

            // Плавное начало
            if (options.fadeIn) {
                this.currentMusic.volume = 0;
                this.fadeIn(this.currentMusic, options.fadeIn);
            }

            // Воспроизводим музыку
            this.currentMusic.play().catch(error => {
                console.warn(`Failed to play music: ${musicName}`, error);
            });

        } catch (error) {
            console.error(`Error playing music: ${musicName}`, error);
        }
    }

    /**
     * Останавливает фоновую музыку
     * @param {number} fadeOutTime - время затухания в миллисекундах
     */
    stopMusic(fadeOutTime = 0) {
        if (!this.currentMusic) return;

        if (fadeOutTime > 0) {
            this.fadeOut(this.currentMusic, fadeOutTime);
        } else {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }

        this.currentMusic = null;
    }

    /**
     * Плавное увеличение громкости
     * @param {HTMLAudioElement} audio - аудио элемент
     * @param {number} duration - длительность в миллисекундах
     */
    fadeIn(audio, duration) {
        const targetVolume = audio.volume;
        audio.volume = 0;
        
        const steps = 50;
        const stepDuration = duration / steps;
        const volumeStep = targetVolume / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(targetVolume, currentStep * volumeStep);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
            }
        }, stepDuration);
    }

    /**
     * Плавное уменьшение громкости
     * @param {HTMLAudioElement} audio - аудио элемент
     * @param {number} duration - длительность в миллисекундах
     */
    fadeOut(audio, duration) {
        const startVolume = audio.volume;
        
        const steps = 50;
        const stepDuration = duration / steps;
        const volumeStep = startVolume / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(0, startVolume - (currentStep * volumeStep));
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audio.pause();
                audio.currentTime = 0;
            }
        }, stepDuration);
    }

    /**
     * Устанавливает громкость звуковых эффектов
     * @param {number} volume - громкость (0-1)
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * Устанавливает громкость музыки
     * @param {number} volume - громкость (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume * this.masterVolume;
        }
        
        this.saveSettings();
    }

    /**
     * Устанавливает общую громкость
     * @param {number} volume - громкость (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume * this.masterVolume;
        }
        
        this.saveSettings();
    }

    /**
     * Включает/выключает звук
     * @param {boolean} muted - выключен ли звук
     */
    setMuted(muted) {
        this.muted = muted;
        
        if (muted && this.currentMusic) {
            this.currentMusic.pause();
        } else if (!muted && this.currentMusic) {
            this.currentMusic.play().catch(error => {
                console.warn('Failed to resume music after unmute:', error);
            });
        }
        
        this.saveSettings();
    }

    /**
     * Воспроизводит звук костей
     * @param {number} dice1 - первая кость
     * @param {number} dice2 - вторая кость
     */
    playDiceRoll(dice1, dice2) {
        this.playSound('dice_roll', {
            volume: 0.8,
            rate: 1.0 + (Math.random() * 0.2 - 0.1) // небольшая вариация скорости
        });
    }

    /**
     * Воспроизводит звук денег
     * @param {number} amount - сумма
     * @param {boolean} isPositive - положительная ли сумма
     */
    playMoneySound(amount, isPositive = true) {
        const soundName = isPositive ? 'money' : 'pay_tax';
        const volume = Math.min(1.0, 0.5 + (amount / 10000) * 0.5); // громкость зависит от суммы
        
        this.playSound(soundName, { volume: volume });
    }

    /**
     * Воспроизводит звук покупки недвижимости
     * @param {number} price - цена
     */
    playPropertyPurchase(price) {
        const volume = Math.min(1.0, 0.6 + (price / 5000) * 0.4);
        this.playSound('property_purchase', { volume: volume });
    }

    /**
     * Воспроизводит звук арендной платы
     * @param {number} amount - сумма
     */
    playRentPayment(amount) {
        const volume = Math.min(1.0, 0.5 + (amount / 2000) * 0.5);
        this.playSound('rent_payment', { volume: volume });
    }

    /**
     * Воспроизводит звук карточки
     * @param {string} cardType - тип карточки
     */
    playCardSound(cardType) {
        const soundName = cardType === 'chance' ? 'chance_card' : 'treasure_card';
        this.playSound(soundName, { volume: 0.7 });
    }

    /**
     * Воспроизводит звук аукциона
     * @param {string} action - действие
     */
    playAuctionSound(action) {
        const soundMap = {
            'start': 'auction_start',
            'bid': 'auction_bid',
            'end': 'auction_end'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.8 });
        }
    }

    /**
     * Воспроизводит звук торговли
     * @param {string} action - действие
     */
    playTradeSound(action) {
        const soundMap = {
            'offer': 'trade_offer',
            'accept': 'trade_accept',
            'reject': 'trade_reject'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.7 });
        }
    }

    /**
     * Воспроизводит звук строительства
     * @param {string} type - тип строительства
     */
    playBuildSound(type) {
        const soundName = type === 'residence' ? 'build_residence' : 'improve_property';
        this.playSound(soundName, { volume: 0.8 });
    }

    /**
     * Воспроизводит звук события
     * @param {string} eventType - тип события
     */
    playEventSound(eventType) {
        const soundMap = {
            'weather': 'weather_change',
            'economic': 'economic_event',
            'cultural': 'cultural_event'
        };
        
        const soundName = soundMap[eventType];
        if (soundName) {
            this.playSound(soundName, { volume: 0.6 });
        }
    }

    /**
     * Воспроизводит звук интерфейса
     * @param {string} action - действие
     */
    playUISound(action) {
        const soundMap = {
            'click': 'button_click',
            'open': 'menu_open',
            'close': 'menu_close',
            'notification': 'notification',
            'achievement': 'achievement'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.5 });
        }
    }

    /**
     * Воспроизводит звук чата
     * @param {string} action - действие
     */
    playChatSound(action) {
        const soundMap = {
            'message': 'chat_message',
            'join': 'player_join',
            'leave': 'player_leave'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.4 });
        }
    }

    /**
     * Воспроизводит звук турнира
     * @param {string} action - действие
     */
    playTournamentSound(action) {
        const soundMap = {
            'start': 'tournament_start',
            'end': 'tournament_end',
            'round_start': 'round_start',
            'round_end': 'round_end'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.8 });
        }
    }

    /**
     * Воспроизводит звук альянса
     * @param {string} action - действие
     */
    playAllianceSound(action) {
        const soundMap = {
            'form': 'alliance_form',
            'break': 'alliance_break'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.7 });
        }
    }

    /**
     * Воспроизводит звук погоды
     * @param {string} weatherType - тип погоды
     */
    playWeatherSound(weatherType) {
        const soundMap = {
            'rainy': 'rain',
            'snowy': 'snow',
            'stormy': 'storm',
            'foggy': 'wind'
        };
        
        const soundName = soundMap[weatherType];
        if (soundName) {
            this.playSound(soundName, { 
                volume: 0.3,
                loop: true // погодные звуки зациклены
            });
        }
    }

    /**
     * Останавливает погодные звуки
     */
    stopWeatherSound() {
        // Останавливаем все погодные звуки
        ['rain', 'snow', 'storm', 'wind'].forEach(soundName => {
            const sound = this.sounds.get(soundName);
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
    }

    /**
     * Воспроизводит звук ошибки
     * @param {string} type - тип ошибки
     */
    playErrorSound(type = 'error') {
        const soundName = type === 'warning' ? 'warning' : 'error';
        this.playSound(soundName, { volume: 0.6 });
    }

    /**
     * Воспроизводит звук навигации
     * @param {string} action - действие
     */
    playNavigationSound(action) {
        const soundMap = {
            'move': 'move_token',
            'land': 'land_on_property',
            'pass_go': 'pass_go'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { volume: 0.6 });
        }
    }

    /**
     * Воспроизводит звук ипотеки
     * @param {boolean} isMortgage - закладывается ли недвижимость
     */
    playMortgageSound(isMortgage) {
        const soundName = isMortgage ? 'mortgage' : 'unmortgage';
        this.playSound(soundName, { volume: 0.7 });
    }

    /**
     * Сохраняет настройки звука
     */
    saveSettings() {
        const settings = {
            soundVolume: this.soundVolume,
            musicVolume: this.musicVolume,
            masterVolume: this.masterVolume,
            muted: this.muted
        };
        
        localStorage.setItem('audioSettings', JSON.stringify(settings));
    }

    /**
     * Загружает настройки звука
     */
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('audioSettings'));
            if (settings) {
                this.soundVolume = settings.soundVolume || 0.7;
                this.musicVolume = settings.musicVolume || 0.5;
                this.masterVolume = settings.masterVolume || 1.0;
                this.muted = settings.muted || false;
            }
        } catch (error) {
            console.warn('Failed to load audio settings:', error);
        }
    }

    /**
     * Получает настройки звука
     * @returns {Object} настройки
     */
    getSettings() {
        return {
            soundVolume: this.soundVolume,
            musicVolume: this.musicVolume,
            masterVolume: this.masterVolume,
            muted: this.muted
        };
    }

    /**
     * Получает статус инициализации
     * @returns {boolean} статус
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Получает статус воспроизведения музыки
     * @returns {boolean} статус
     */
    isMusicPlaying() {
        return this.currentMusic && !this.currentMusic.paused;
    }

    /**
     * Получает текущую музыку
     * @returns {string|null} название текущей музыки
     */
    getCurrentMusic() {
        if (!this.currentMusic) return null;
        
        for (const [name, music] of this.music.entries()) {
            if (music === this.currentMusic) {
                return name;
            }
        }
        
        return null;
    }

    /**
     * Получает список доступных звуков
     * @returns {Array} список звуков
     */
    getAvailableSounds() {
        return Array.from(this.sounds.keys());
    }

    /**
     * Получает список доступной музыки
     * @returns {Array} список музыки
     */
    getAvailableMusic() {
        return Array.from(this.music.keys());
    }
}

// Экспортируем класс
window.AudioManager = AudioManager; 