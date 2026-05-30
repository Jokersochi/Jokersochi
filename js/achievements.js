/**
 * Модуль системы достижений
 * Управляет достижениями игроков, наградами и прогрессом
 */
import eventBus from './event-bus.js';

import { getText } from './localization.js';

class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.playerAchievements = new Map();
        this.achievementHistory = [];
        this.notifications = [];
        
        this.initializeAchievements();
        this.setupEventListeners();
    }

    /**
     * Инициализирует все достижения
     */
    initializeAchievements() {
        // Достижения за деньги
        this.addAchievement({
            id: 'first_money',
            name: 'Первые деньги',
            en_name: 'First Money',
            description: 'Получите первые 1000₽',
            en_description: 'Earn your first 1000$',
            type: 'money',
            condition: 1000,
            icon: '💰',
            rarity: 'common',
            points: 10,
            reward: { money: 100 }
        });

        this.addAchievement({
            id: 'millionaire',
            name: 'Миллионер',
            en_name: 'Millionaire',
            description: 'Накопите 10,000₽',
            en_description: 'Accumulate 10,000$',
            type: 'money',
            condition: 10000,
            icon: '💎',
            rarity: 'rare',
            points: 50,
            reward: { money: 1000, title: 'Миллионер' }
        });

        this.addAchievement({
            id: 'billionaire',
            name: 'Миллиардер',
            en_name: 'Billionaire',
            description: 'Накопите 100,000₽',
            en_description: 'Accumulate 100,000$',
            type: 'money',
            condition: 100000,
            icon: '👑',
            rarity: 'epic',
            points: 100,
            reward: { money: 5000, title: 'Миллиардер', special: 'golden_token' }
        });

        // Достижения за недвижимость
        this.addAchievement({
            id: 'first_property',
            name: 'Первый домовладелец',
            en_name: 'First Property Owner',
            description: 'Купите свою первую недвижимость',
            en_description: 'Purchase your first property',
            type: 'properties',
            condition: 1,
            icon: '🏠',
            rarity: 'common',
            points: 15,
            reward: { money: 200 }
        });

        this.addAchievement({
            id: 'property_tycoon',
            name: 'Недвижимый магнат',
            en_name: 'Property Tycoon',
            description: 'Владейте 10 объектами недвижимости',
            en_description: 'Own 10 properties',
            type: 'properties',
            condition: 10,
            icon: '🏢',
            rarity: 'rare',
            points: 75,
            reward: { money: 1500, title: 'Магнат недвижимости' }
        });

        this.addAchievement({
            id: 'property_empire',
            name: 'Империя недвижимости',
            en_name: 'Property Empire',
            description: 'Владейте 20 объектами недвижимости',
            en_description: 'Own 20 properties',
            type: 'properties',
            condition: 20,
            icon: '🏰',
            rarity: 'epic',
            points: 150,
            reward: { money: 3000, title: 'Император недвижимости' }
        });

        // Достижения за резиденции
        this.addAchievement({
            id: 'first_residence',
            name: 'Первый дом',
            en_name: 'First Home',
            description: 'Постройте свою первую резиденцию',
            en_description: 'Build your first residence',
            type: 'residences',
            condition: 1,
            icon: '🏡',
            rarity: 'common',
            points: 25,
            reward: { money: 300 }
        });

        this.addAchievement({
            id: 'residence_builder',
            name: 'Строитель резиденций',
            en_name: 'Residence Builder',
            description: 'Постройте 5 резиденций',
            en_description: 'Build 5 residences',
            type: 'residences',
            condition: 5,
            icon: '🏘️',
            rarity: 'rare',
            points: 100,
            reward: { money: 2000, title: 'Строитель' }
        });

        this.addAchievement({
            id: 'residence_master',
            name: 'Мастер резиденций',
            en_name: 'Residence Master',
            description: 'Постройте 10 резиденций',
            en_description: 'Build 10 residences',
            type: 'residences',
            condition: 10,
            icon: '🏛️',
            rarity: 'epic',
            points: 200,
            reward: { money: 5000, title: 'Мастер строительства' }
        });

        // Достижения за улучшения
        this.addAchievement({
            id: 'first_improvement',
            name: 'Первое улучшение',
            en_name: 'First Improvement',
            description: 'Улучшите недвижимость до уровня 1',
            en_description: 'Improve a property to level 1',
            type: 'improvements',
            condition: 1,
            icon: '🔧',
            rarity: 'common',
            points: 20,
            reward: { money: 250 }
        });

        this.addAchievement({
            id: 'improvement_expert',
            name: 'Эксперт по улучшениям',
            en_name: 'Improvement Expert',
            description: 'Улучшите 10 недвижимостей до максимального уровня',
            en_description: 'Improve 10 properties to maximum level',
            type: 'improvements',
            condition: 10,
            icon: '⚡',
            rarity: 'rare',
            points: 125,
            reward: { money: 2500, title: 'Эксперт' }
        });

        // Достижения за торговлю
        this.addAchievement({
            id: 'first_trade',
            name: 'Первая сделка',
            en_name: 'First Trade',
            description: 'Завершите свою первую торговую сделку',
            en_description: 'Complete your first trade deal',
            type: 'trades',
            condition: 1,
            icon: '🤝',
            rarity: 'common',
            points: 30,
            reward: { money: 400 }
        });

        this.addAchievement({
            id: 'trade_master',
            name: 'Мастер торговли',
            en_name: 'Trade Master',
            description: 'Завершите 10 торговых сделок',
            en_description: 'Complete 10 trade deals',
            type: 'trades',
            condition: 10,
            icon: '💼',
            rarity: 'rare',
            points: 150,
            reward: { money: 3000, title: 'Торговец' }
        });

        this.addAchievement({
            id: 'trade_legend',
            name: 'Легенда торговли',
            en_name: 'Trade Legend',
            description: 'Завершите 50 торговых сделок',
            en_description: 'Complete 50 trade deals',
            type: 'trades',
            condition: 50,
            icon: '🎯',
            rarity: 'legendary',
            points: 500,
            reward: { money: 10000, title: 'Легенда торговли', special: 'diamond_token' }
        });

        // Достижения за аукционы
        this.addAchievement({
            id: 'first_auction',
            name: 'Первый аукцион',
            en_name: 'First Auction',
            description: 'Участвуйте в своем первом аукционе',
            en_description: 'Participate in your first auction',
            type: 'auctions',
            condition: 1,
            icon: '🔨',
            rarity: 'common',
            points: 25,
            reward: { money: 300 }
        });

        this.addAchievement({
            id: 'auction_king',
            name: 'Король аукционов',
            en_name: 'Auction King',
            description: 'Выиграйте 5 аукционов',
            en_description: 'Win 5 auctions',
            type: 'auctions',
            condition: 5,
            icon: '👑',
            rarity: 'rare',
            points: 125,
            reward: { money: 2500, title: 'Король аукционов' }
        });

        // Достижения за альянсы
        this.addAchievement({
            id: 'first_alliance',
            name: 'Первый альянс',
            en_name: 'First Alliance',
            description: 'Создайте свой первый альянс',
            en_description: 'Create your first alliance',
            type: 'alliances',
            condition: 1,
            icon: '🤝',
            rarity: 'common',
            points: 40,
            reward: { money: 500 }
        });

        this.addAchievement({
            id: 'alliance_leader',
            name: 'Лидер альянса',
            en_name: 'Alliance Leader',
            description: 'Создайте 3 альянса',
            en_description: 'Create 3 alliances',
            type: 'alliances',
            condition: 3,
            icon: '👥',
            rarity: 'rare',
            points: 175,
            reward: { money: 3500, title: 'Лидер' }
        });

        // Достижения за турниры
        this.addAchievement({
            id: 'first_tournament',
            name: 'Первый турнир',
            en_name: 'First Tournament',
            description: 'Участвуйте в своем первом турнире',
            en_description: 'Participate in your first tournament',
            type: 'tournaments',
            condition: 1,
            icon: '🏆',
            rarity: 'common',
            points: 50,
            reward: { money: 600 }
        });

        this.addAchievement({
            id: 'tournament_champion',
            name: 'Чемпион турнира',
            en_name: 'Tournament Champion',
            description: 'Выиграйте турнир',
            en_description: 'Win a tournament',
            type: 'tournament_wins',
            condition: 1,
            icon: '🥇',
            rarity: 'rare',
            points: 200,
            reward: { money: 5000, title: 'Чемпион' }
        });

        this.addAchievement({
            id: 'tournament_legend',
            name: 'Легенда турниров',
            en_name: 'Tournament Legend',
            description: 'Выиграйте 10 турниров',
            en_description: 'Win 10 tournaments',
            type: 'tournament_wins',
            condition: 10,
            icon: '🌟',
            rarity: 'legendary',
            points: 1000,
            reward: { money: 20000, title: 'Легенда турниров', special: 'legendary_token' }
        });

        // Достижения за победы
        this.addAchievement({
            id: 'first_win',
            name: 'Первая победа',
            en_name: 'First Victory',
            description: 'Выиграйте свою первую игру',
            en_description: 'Win your first game',
            type: 'wins',
            condition: 1,
            icon: '🎉',
            rarity: 'common',
            points: 100,
            reward: { money: 1000, title: 'Победитель' }
        });

        this.addAchievement({
            id: 'winning_streak',
            name: 'Серия побед',
            en_name: 'Winning Streak',
            description: 'Выиграйте 5 игр подряд',
            en_description: 'Win 5 games in a row',
            type: 'winning_streak',
            condition: 5,
            icon: '🔥',
            rarity: 'epic',
            points: 300,
            reward: { money: 7500, title: 'Неуязвимый' }
        });

        this.addAchievement({
            id: 'game_master',
            name: 'Мастер игры',
            en_name: 'Game Master',
            description: 'Выиграйте 50 игр',
            en_description: 'Win 50 games',
            type: 'wins',
            condition: 50,
            icon: '🎮',
            rarity: 'legendary',
            points: 1000,
            reward: { money: 25000, title: 'Мастер игры', special: 'master_token' }
        });

        // Достижения за время игры
        this.addAchievement({
            id: 'dedicated_player',
            name: 'Преданный игрок',
            en_name: 'Dedicated Player',
            description: 'Играйте 10 часов',
            en_description: 'Play for 10 hours',
            type: 'playtime',
            condition: 36000000, // 10 часов в миллисекундах
            icon: '⏰',
            rarity: 'common',
            points: 75,
            reward: { money: 800, title: 'Преданный' }
        });

        this.addAchievement({
            id: 'hardcore_player',
            name: 'Хардкорный игрок',
            en_name: 'Hardcore Player',
            description: 'Играйте 100 часов',
            en_description: 'Play for 100 hours',
            type: 'playtime',
            condition: 360000000, // 100 часов в миллисекундах
            icon: '💪',
            rarity: 'epic',
            points: 400,
            reward: { money: 8000, title: 'Хардкорный' }
        });

        // Достижения за специальные события
        this.addAchievement({
            id: 'weather_master',
            name: 'Повелитель погоды',
            en_name: 'Weather Master',
            description: 'Играйте при всех типах погоды',
            en_description: 'Play during all weather types',
            type: 'weather_types',
            condition: 5,
            icon: '🌤️',
            rarity: 'rare',
            points: 150,
            reward: { money: 2000, title: 'Метеоролог' }
        });

        this.addAchievement({
            id: 'event_explorer',
            name: 'Исследователь событий',
            en_name: 'Event Explorer',
            description: 'Участвуйте в 10 экономических и культурных событиях',
            en_description: 'Participate in 10 economic and cultural events',
            type: 'events',
            condition: 10,
            icon: '🎪',
            rarity: 'rare',
            points: 200,
            reward: { money: 3000, title: 'Исследователь' }
        });

        // Секретные достижения
        this.addAchievement({
            id: 'bankrupt_phoenix',
            name: 'Феникс',
            en_name: 'Phoenix',
            description: 'Выиграйте игру после банкротства',
            en_description: 'Win a game after going bankrupt',
            type: 'secret',
            condition: 1,
            icon: '🦅',
            rarity: 'legendary',
            points: 500,
            reward: { money: 10000, title: 'Феникс', special: 'phoenix_token' },
            secret: true
        });

        this.addAchievement({
            id: 'lucky_winner',
            name: 'Счастливчик',
            en_name: 'Lucky One',
            description: 'Выиграйте игру, имея менее 1000₽ в начале последнего хода',
            en_description: 'Win a game with less than 1000$ at the start of the last turn',
            type: 'secret',
            condition: 1,
            icon: '🍀',
            rarity: 'epic',
            points: 300,
            reward: { money: 5000, title: 'Счастливчик' },
            secret: true
        });
    }

    /**
     * Добавляет достижение в систему
     * @param {Object} achievement - объект достижения
     */
    addAchievement(achievement) {
        this.achievements.set(achievement.id, {
            ...achievement,
            unlocked: false,
            unlockedAt: null,
            progress: 0
        });
    }

    /**
     * Настраивает слушатели событий
     */
    setupEventListeners() {
        eventBus.on('moneyChanged', data => this.checkMoneyAchievements(data.player));
        eventBus.on('propertyPurchased', data => this.checkPropertyAchievements(data.player));
        // Assuming 'residenceBuilt' event will be emitted
        eventBus.on('residenceBuilt', data => this.checkResidenceAchievements(data.player));
        // Assuming 'improvementAdded' event will be emitted
        eventBus.on('improvementAdded', data => this.checkImprovementAchievements(data.player));
        eventBus.on('tradeCompleted', data => this.checkTradeAchievements(data.offer.from, data.offer.to));
        eventBus.on('auctionEnded', data => data.winner && this.checkAuctionAchievements(data.winner));
        eventBus.on('allianceFormed', data => this.checkAllianceAchievements(data.players));
        eventBus.on('tournamentFinished', data => data.winners && this.checkTournamentAchievements(data.winners[0]));
        eventBus.on('gameEnded', data => data.winner && this.checkWinAchievements(data.winner));
    }

    /**
     * Проверяет достижения за деньги
     * @param {Player} player - игрок
     */
    checkMoneyAchievements(player) {
        const totalMoney = player.money;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'money' && !achievement.unlocked) {
                if (totalMoney >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за недвижимость
     * @param {Player} player - игрок
     */
    checkPropertyAchievements(player) {
        const propertyCount = player.properties.length;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'properties' && !achievement.unlocked) {
                if (propertyCount >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за резиденции
     * @param {Player} player - игрок
     */
    checkResidenceAchievements(player) {
        const residenceCount = player.properties.filter(p => p.hasResidence).length;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'residences' && !achievement.unlocked) {
                if (residenceCount >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за улучшения
     * @param {Player} player - игрок
     */
    checkImprovementAchievements(player) {
        const maxImprovements = player.properties.filter(p => p.improvementLevel >= 5).length;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'improvements' && !achievement.unlocked) {
                if (maxImprovements >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за торговлю
     * @param {Player} player - игрок
     * @param {Player} partner - второй игрок в сделке
     */
    checkTradeAchievements(player, partner) {
        // This logic needs player stats to be updated. Assuming player.stats.totalTradesCompleted exists.
        [player, partner].forEach(p => {
            const tradeCount = p.stats.totalTradesCompleted || 0;
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'trades' && !achievement.unlocked) {
                if (tradeCount >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
        });
    }

    /**
     * Проверяет достижения за аукционы
     * @param {Player} player - игрок
     */
    checkAuctionAchievements(player) {
        const auctionWins = player.stats.auctionsWon || 0;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'auctions' && !achievement.unlocked) {
                if (auctionWins >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за альянсы
     * @param {Player} player - игрок
     */
    checkAllianceAchievements(players) {
        // This logic needs player stats. Assuming player.stats.alliancesFormed exists.
        players.forEach(p => {
            const allianceCount = p.stats.alliancesFormed || 0;
            this.achievements.forEach((achievement, id) => {
                if (achievement.type === 'alliances' && !achievement.unlocked) {
                    if (allianceCount >= achievement.condition) {
                        this.unlockAchievement(p, id);
                    }
                }
            });
        })
    }

    /**
     * Проверяет достижения за турниры
     * @param {Player} player - игрок
     */
    checkTournamentAchievements(player) {
        const tournamentWins = player.stats.tournamentsWon || 0;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'tournament_wins' && !achievement.unlocked) {
                if (tournamentWins >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за победы
     * @param {Player} player - игрок
     */
    checkWinAchievements(player) {
        const wins = player.stats.gamesWon || 0;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'wins' && !achievement.unlocked) {
                if (wins >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за погоду
     * @param {Player} player - игрок
     */
    checkWeatherAchievements(player) {
        const weatherTypes = player.weatherTypes ? player.weatherTypes : new Set();
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'weather_types' && !achievement.unlocked) {
                if (weatherTypes.size >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Проверяет достижения за события
     * @param {Player} player - игрок
     */
    checkEventAchievements(player) {
        const eventCount = player.events ? player.events.length : 0;
        
        this.achievements.forEach((achievement, id) => {
            if (achievement.type === 'events' && !achievement.unlocked) {
                if (eventCount >= achievement.condition) {
                    this.unlockAchievement(player, id);
                }
            }
        });
    }

    /**
     * Разблокирует достижение
     * @param {Player} player - игрок
     * @param {string} achievementId - ID достижения
     */
    unlockAchievement(player, achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;

        // Разблокируем достижение
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();

        // Добавляем в историю игрока
        if (!player.achievements) {
            player.achievements = [];
        }
        player.achievements.push({
            id: achievementId,
            unlockedAt: Date.now()
        });

        // Добавляем в общую историю
        this.achievementHistory.push({
            playerId: player.id,
            playerName: player.name,
            achievementId: achievementId,
            achievementName: achievement.name,
            unlockedAt: Date.now()
        });

        // Выдаем награды
        this.giveRewards(player, achievement.reward);

        // Показываем уведомление
        this.showAchievementNotification(achievement);

        // Воспроизводим звук
        if (window.audio) {
            window.audio.playSound('achievement');
        }

        // Отправляем событие
        this.dispatchAchievementEvent(player, achievement);
    }

    /**
     * Выдает награды за достижение
     * @param {Player} player - игрок
     * @param {Object} reward - награда
     */
    giveRewards(player, reward) {
        if (reward.money) {
            player.addMoney(reward.money);
        }

        if (reward.title) {
            if (!player.titles) {
                player.titles = [];
            }
            player.titles.push(reward.title);
        }

        if (reward.special) {
            if (!player.specialItems) {
                player.specialItems = [];
            }
            player.specialItems.push(reward.special);
        }
    }

    /**
     * Показывает уведомление о достижении
     * @param {Object} achievement - достижение
     */
    showAchievementNotification(achievement) {
        const notification = {
            id: Date.now(),
            type: 'achievement',
            title: getText(`ACHIEVEMENTS.${achievement.name.toUpperCase()}`),
            message: getText(`ACHIEVEMENTS.${achievement.description.toUpperCase()}`),
            icon: achievement.icon,
            rarity: achievement.rarity,
            points: achievement.points,
            timestamp: Date.now()
        };

        this.notifications.push(notification);

        // Отправляем событие через EventBus
        eventBus.emit('achievementNotification', { notification });
    }

    /**
     * Отправляет событие о достижении
     * @param {Player} player - игрок
     * @param {Object} achievement - достижение
     */
    dispatchAchievementEvent(player, achievement) {
        eventBus.emit('achievementUnlocked', {
            player: player,
            achievement: achievement,
            timestamp: Date.now()
        });
    }

    /**
     * Получает достижения игрока
     * @param {Player} player - игрок
     * @returns {Array} массив достижений
     */
    getPlayerAchievements(player) {
        return Array.from(this.achievements.values()).map(achievement => ({
            ...achievement,
            unlocked: player.achievements ? 
                player.achievements.some(a => a.id === achievement.id) : false,
            unlockedAt: player.achievements ? 
                player.achievements.find(a => a.id === achievement.id)?.unlockedAt : null
        }));
    }

    /**
     * Получает прогресс игрока
     * @param {Player} player - игрок
     * @returns {Object} прогресс
     */
    getPlayerProgress(player) {
        const achievements = this.getPlayerAchievements(player);
        const unlocked = achievements.filter(a => a.unlocked);
        const totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0);

        return {
            total: achievements.length,
            unlocked: unlocked.length,
            percentage: Math.round((unlocked.length / achievements.length) * 100),
            points: totalPoints,
            rarity: {
                common: unlocked.filter(a => a.rarity === 'common').length,
                rare: unlocked.filter(a => a.rarity === 'rare').length,
                epic: unlocked.filter(a => a.rarity === 'epic').length,
                legendary: unlocked.filter(a => a.rarity === 'legendary').length
            }
        };
    }

    /**
     * Получает статистику достижений
     * @returns {Object} статистика
     */
    getAchievementStats() {
        const totalAchievements = this.achievements.size;
        const totalUnlocks = this.achievementHistory.length;
        const recentUnlocks = this.achievementHistory.filter(
            a => Date.now() - a.unlockedAt < 24 * 60 * 60 * 1000
        ).length;

        return {
            totalAchievements,
            totalUnlocks,
            recentUnlocks,
            averageUnlocksPerDay: Math.round(totalUnlocks / Math.max(1, Math.floor((Date.now() - this.achievementHistory[0]?.unlockedAt || Date.now()) / (24 * 60 * 60 * 1000))))
        };
    }

    /**
     * Получает достижения по редкости
     * @param {string} rarity - редкость
     * @returns {Array} массив достижений
     */
    getAchievementsByRarity(rarity) {
        return Array.from(this.achievements.values()).filter(a => a.rarity === rarity);
    }

    /**
     * Получает секретные достижения
     * @returns {Array} массив секретных достижений
     */
    getSecretAchievements() {
        return Array.from(this.achievements.values()).filter(a => a.secret);
    }

    /**
     * Сбрасывает достижения игрока
     * @param {Player} player - игрок
     */
    resetPlayerAchievements(player) {
        player.achievements = [];
        this.achievementHistory = this.achievementHistory.filter(
            a => a.playerId !== player.id
        );
    }

    /**
     * Сохраняет данные достижений
     */
    saveData() {
        const data = {
            achievementHistory: this.achievementHistory,
            notifications: this.notifications
        };
        localStorage.setItem('achievementData', JSON.stringify(data));
    }

    /**
     * Загружает данные достижений
     */
    loadData() {
        try {
            const data = JSON.parse(localStorage.getItem('achievementData'));
            if (data) {
                this.achievementHistory = data.achievementHistory || [];
                this.notifications = data.notifications || [];
            }
        } catch (error) {
            console.warn('Failed to load achievement data:', error);
        }
    }
}

// Экспортируем класс
export default AchievementSystem; 