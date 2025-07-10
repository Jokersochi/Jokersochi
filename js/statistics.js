/**
 * Модуль статистики
 * Отслеживает игровые показатели, аналитику и рекорды
 */
import eventBus from './event-bus.js';

class StatisticsSystem {
    constructor() {
        this.stats = new Map();
        this.globalStats = {};
        this.playerStats = new Map();
        this.gameHistory = [];
        this.records = new Map();
        
        this.initializeStats();
        this.setupEventListeners();
        this.loadData();
    }

    /**
     * Инициализирует статистику
     */
    initializeStats() {
        // Глобальная статистика
        this.globalStats = {
            totalGames: 0,
            totalPlayers: 0,
            totalPlayTime: 0,
            totalMoneyEarned: 0,
            totalPropertiesPurchased: 0,
            totalResidencesBuilt: 0,
            totalTradesCompleted: 0,
            totalAuctionsWon: 0,
            totalAlliancesFormed: 0,
            totalTournamentsHeld: 0,
            averageGameDuration: 0,
            averagePlayersPerGame: 0,
            mostPopularProperty: null,
            mostActivePlayer: null,
            richestPlayer: null,
            bestTrader: null,
            tournamentChampion: null
        };

        // Рекорды
        this.records = new Map([
            ['highestMoney', { value: 0, player: null, date: null }],
            ['mostProperties', { value: 0, player: null, date: null }],
            ['mostResidences', { value: 0, player: null, date: null }],
            ['longestGame', { value: 0, player: null, date: null }],
            ['fastestWin', { value: Infinity, player: null, date: null }],
            ['mostTrades', { value: 0, player: null, date: null }],
            ['mostAuctionsWon', { value: 0, player: null, date: null }],
            ['mostTournamentsWon', { value: 0, player: null, date: null }],
            ['highestRent', { value: 0, player: null, date: null }],
            ['mostImprovements', { value: 0, player: null, date: null }]
        ]);
    }

    /**
     * Настраивает слушатели событий
     */
    setupEventListeners() {
        eventBus.on('gameStarted', (data) => this.onGameStart(data));
        eventBus.on('gameEnded', (data) => this.onGameEnd(data));
        eventBus.on('moneyChanged', (data) => {
            if (data.amount > 0) this.trackMoneyEarned(data.player, data.amount);
        });
        eventBus.on('propertyPurchased', (data) => this.trackPropertyPurchase(data.player, data.cell));
        // Assuming 'residenceBuilt' event
        eventBus.on('residenceBuilt', (data) => this.trackResidenceBuilt(data.player, data.cell));
        eventBus.on('tradeCompleted', (data) => this.trackTradeCompleted(data.offer.from, data.offer));
        eventBus.on('auctionEnded', (data) => {
            if (data.winner) this.trackAuctionWon(data.winner, data);
        });
        eventBus.on('allianceFormed', (data) => this.trackAllianceFormed(data.players[0], data));
        eventBus.on('tournamentFinished', (data) => {
            if (data.winners && data.winners.length > 0) this.trackTournamentWon(data.winners[0], data.tournament);
        });
        // Assuming 'rentPaid' event
        eventBus.on('rentPaid', (data) => this.trackRentPaid(data.player, data.amount));
        // Assuming 'improvementAdded' event
        eventBus.on('improvementAdded', (data) => this.trackPropertyImproved(data.player, data.cell));
    }

    /**
     * Обрабатывает начало игры
     * @param {Object} gameData - данные игры
     */
    onGameStart(gameData) {
        this.globalStats.totalGames++;
        this.globalStats.totalPlayers += gameData.players.length;
        
        // Инициализируем статистику для каждого игрока
        gameData.players.forEach(player => {
            if (!this.playerStats.has(player.id)) {
                this.playerStats.set(player.id, this.createPlayerStats(player));
            }
        });

        // Записываем начало игры
        this.gameHistory.push({
            id: gameData.id,
            startTime: Date.now(),
            players: gameData.players.map(p => ({ id: p.id, name: p.name })),
            settings: gameData.settings
        });
    }

    /**
     * Обрабатывает окончание игры
     * @param {Object} gameData - данные игры
     */
    onGameEnd(gameData) {
        const gameRecord = this.gameHistory.find(g => g.id === gameData.id);
        if (gameRecord) {
            gameRecord.endTime = Date.now();
            gameRecord.duration = gameRecord.endTime - gameRecord.startTime;
            gameRecord.winner = gameData.winner;
            gameRecord.finalState = gameData.finalState;

            // Обновляем глобальную статистику
            this.globalStats.totalPlayTime += gameRecord.duration;
            this.globalStats.averageGameDuration = 
                this.globalStats.totalPlayTime / this.globalStats.totalGames;
            this.globalStats.averagePlayersPerGame = 
                this.globalStats.totalPlayers / this.globalStats.totalGames;

            // Обновляем статистику победителя
            if (gameData.winner) {
                this.updateWinnerStats(gameData.winner, gameRecord);
            }

            // Проверяем рекорды
            this.checkRecords(gameData);
        }
    }

    /**
     * Создает статистику для игрока
     * @param {Player} player - игрок
     * @returns {Object} статистика игрока
     */
    createPlayerStats(player) {
        return {
            id: player.id,
            name: player.name,
            gamesPlayed: 0,
            gamesWon: 0,
            totalPlayTime: 0,
            totalMoneyEarned: 0,
            totalMoneySpent: 0,
            totalPropertiesPurchased: 0,
            totalPropertiesSold: 0,
            totalResidencesBuilt: 0,
            totalTradesCompleted: 0,
            totalTradesValue: 0,
            totalAuctionsWon: 0,
            totalAuctionsValue: 0,
            totalAlliancesFormed: 0,
            totalTournamentsWon: 0,
            totalRentEarned: 0,
            totalRentPaid: 0,
            totalImprovementsBuilt: 0,
            highestMoney: 0,
            mostProperties: 0,
            mostResidences: 0,
            longestGame: 0,
            fastestWin: Infinity,
            averageGameDuration: 0,
            winRate: 0,
            favoriteProperties: new Map(),
            tradingPartners: new Map(),
            alliancePartners: new Map(),
            achievements: [],
            records: [],
            lastPlayed: null,
            createdAt: Date.now()
        };
    }

    /**
     * Отслеживает заработанные деньги
     * @param {Player} player - игрок
     * @param {number} amount - сумма
     */
    trackMoneyEarned(player, amount) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalMoneyEarned += amount;
            stats.highestMoney = Math.max(stats.highestMoney, player.money);
        }
        this.globalStats.totalMoneyEarned += amount;
    }

    /**
     * Отслеживает покупку недвижимости
     * @param {Player} player - игрок
     * @param {Object} property - недвижимость
     */
    trackPropertyPurchase(player, property) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalPropertiesPurchased++;
            stats.mostProperties = Math.max(stats.mostProperties, player.properties.length);
            
            // Отслеживаем любимые свойства
            const propertyName = property.name;
            stats.favoriteProperties.set(propertyName, 
                (stats.favoriteProperties.get(propertyName) || 0) + 1);
        }
        this.globalStats.totalPropertiesPurchased++;
    }

    /**
     * Отслеживает постройку резиденции
     * @param {Player} player - игрок
     * @param {Object} property - недвижимость
     */
    trackResidenceBuilt(player, property) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalResidencesBuilt++;
            stats.mostResidences = Math.max(stats.mostResidences, 
                player.properties.filter(p => p.hasResidence).length);
        }
        this.globalStats.totalResidencesBuilt++;
    }

    /**
     * Отслеживает завершенную сделку
     * @param {Player} player - игрок
     * @param {Object} trade - сделка
     */
    trackTradeCompleted(player, trade) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalTradesCompleted++;
            stats.totalTradesValue += trade.value;
            
            // Отслеживаем торговых партнеров
            const partnerId = trade.partner.id;
            stats.tradingPartners.set(partnerId, 
                (stats.tradingPartners.get(partnerId) || 0) + 1);
        }
        this.globalStats.totalTradesCompleted++;
    }

    /**
     * Отслеживает выигранный аукцион
     * @param {Player} player - игрок
     * @param {Object} auction - аукцион
     */
    trackAuctionWon(player, auction) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalAuctionsWon++;
            stats.totalAuctionsValue += auction.finalPrice;
        }
        this.globalStats.totalAuctionsWon++;
    }

    /**
     * Отслеживает созданный альянс
     * @param {Player} player - игрок
     * @param {Object} alliance - альянс
     */
    trackAllianceFormed(player, alliance) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalAlliancesFormed++;
            
            // Отслеживаем партнеров по альянсам
            alliance.members.forEach(member => {
                if (member.id !== player.id) {
                    stats.alliancePartners.set(member.id, 
                        (stats.alliancePartners.get(member.id) || 0) + 1);
                }
            });
        }
        this.globalStats.totalAlliancesFormed++;
    }

    /**
     * Отслеживает выигранный турнир
     * @param {Player} player - игрок
     * @param {Object} tournament - турнир
     */
    trackTournamentWon(player, tournament) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalTournamentsWon++;
        }
        this.globalStats.totalTournamentsHeld++;
    }

    /**
     * Отслеживает уплаченную аренду
     * @param {Player} player - игрок
     * @param {number} amount - сумма
     */
    trackRentPaid(player, amount) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalRentPaid += amount;
        }
    }

    /**
     * Отслеживает улучшение недвижимости
     * @param {Player} player - игрок
     * @param {Object} property - недвижимость
     */
    trackPropertyImproved(player, property) {
        const stats = this.playerStats.get(player.id);
        if (stats) {
            stats.totalImprovementsBuilt++;
        }
    }

    /**
     * Обновляет статистику победителя
     * @param {Player} winner - победитель
     * @param {Object} gameRecord - запись игры
     */
    updateWinnerStats(winner, gameRecord) {
        const stats = this.playerStats.get(winner.id);
        if (stats) {
            stats.gamesWon++;
            stats.winRate = (stats.gamesWon / stats.gamesPlayed) * 100;
            stats.fastestWin = Math.min(stats.fastestWin, gameRecord.duration);
            stats.lastPlayed = Date.now();
        }
    }

    /**
     * Проверяет рекорды
     * @param {Object} gameData - данные игры
     */
    checkRecords(gameData) {
        gameData.players.forEach(player => {
            const stats = this.playerStats.get(player.id);
            if (!stats) return;

            // Проверяем рекорд по деньгам
            if (player.money > this.records.get('highestMoney').value) {
                this.records.set('highestMoney', {
                    value: player.money, player: { id: player.id, name: player.name }, date: Date.now()
                });
                this.dispatchRecordEvent('highestMoney', this.records.get('highestMoney'));
            }

            // Проверяем рекорд по недвижимости
            if (player.properties.length > this.records.get('mostProperties').value) {
                this.records.set('mostProperties', {
                    value: player.properties.length, player: { id: player.id, name: player.name }, date: Date.now()
                });
                this.dispatchRecordEvent('mostProperties', this.records.get('mostProperties'));
            }

            // Проверяем рекорд по резиденциям
            const residences = player.properties.filter(p => p.hasResidence).length;
            if (residences > this.records.get('mostResidences').value) {
                this.records.set('mostResidences', {
                    value: residences, player: { id: player.id, name: player.name }, date: Date.now()
                });
                this.dispatchRecordEvent('mostResidences', this.records.get('mostResidences'));
            }

            // Проверяем рекорд по сделкам
            if (stats.totalTradesCompleted > this.records.get('mostTrades').value) {
                this.records.set('mostTrades', {
                    value: stats.totalTradesCompleted, player: { id: player.id, name: player.name }, date: Date.now()
                });
                this.dispatchRecordEvent('mostTrades', this.records.get('mostTrades'));
            }

            // Проверяем рекорд по аукционам
            if (stats.totalAuctionsWon > this.records.get('mostAuctionsWon').value) {
                this.records.set('mostAuctionsWon', {
                    value: stats.totalAuctionsWon, player: { id: player.id, name: player.name }, date: Date.now()
                });
                this.dispatchRecordEvent('mostAuctionsWon', this.records.get('mostAuctionsWon'));
            }

            // Проверяем рекорд по турнирам
            if (stats.totalTournamentsWon > this.records.get('mostTournamentsWon').value) {
                this.records.set('mostTournamentsWon', {
                    value: stats.totalTournamentsWon, player: { id: player.id, name: player.name }, date: Date.now()
                });
                this.dispatchRecordEvent('mostTournamentsWon', this.records.get('mostTournamentsWon'));
            }

            // Проверяем рекорд по улучшениям
            if (stats.totalImprovementsBuilt > this.records.get('mostImprovements').value) {
                this.records.set('mostImprovements', {
                    value: stats.totalImprovementsBuilt,
                    player: { id: player.id, name: player.name },
                    date: Date.now()
                });
                this.dispatchRecordEvent('mostImprovements', this.records.get('mostImprovements'));
            }
        });
    }

    /**
     * Отправляет событие о новом рекорде
     */
    dispatchRecordEvent(key, record) {
        eventBus.emit('recordBroken', { key, record });
    }

    /**
     * Получает статистику игрока
     * @param {string} playerId - ID игрока
     * @returns {Object} статистика игрока
     */
    getPlayerStats(playerId) {
        return this.playerStats.get(playerId);
    }

    /**
     * Получает глобальную статистику
     * @returns {Object} глобальная статистика
     */
    getGlobalStats() {
        return { ...this.globalStats };
    }

    /**
     * Получает рекорды
     * @returns {Map} рекорды
     */
    getRecords() {
        return new Map(this.records);
    }

    /**
     * Получает топ игроков по критерию
     * @param {string} criteria - критерий
     * @param {number} limit - лимит
     * @returns {Array} топ игроков
     */
    getTopPlayers(criteria, limit = 10) {
        const players = Array.from(this.playerStats.values());
        
        switch (criteria) {
            case 'wins':
                return players
                    .sort((a, b) => b.gamesWon - a.gamesWon)
                    .slice(0, limit);
            case 'winRate':
                return players
                    .filter(p => p.gamesPlayed > 0)
                    .sort((a, b) => b.winRate - a.winRate)
                    .slice(0, limit);
            case 'money':
                return players
                    .sort((a, b) => b.highestMoney - a.highestMoney)
                    .slice(0, limit);
            case 'properties':
                return players
                    .sort((a, b) => b.mostProperties - a.mostProperties)
                    .slice(0, limit);
            case 'residences':
                return players
                    .sort((a, b) => b.mostResidences - a.mostResidences)
                    .slice(0, limit);
            case 'trades':
                return players
                    .sort((a, b) => b.totalTradesCompleted - a.totalTradesCompleted)
                    .slice(0, limit);
            case 'auctions':
                return players
                    .sort((a, b) => b.totalAuctionsWon - a.totalAuctionsWon)
                    .slice(0, limit);
            case 'tournaments':
                return players
                    .sort((a, b) => b.totalTournamentsWon - a.totalTournamentsWon)
                    .slice(0, limit);
            case 'playTime':
                return players
                    .sort((a, b) => b.totalPlayTime - a.totalPlayTime)
                    .slice(0, limit);
            default:
                return players.slice(0, limit);
        }
    }

    /**
     * Получает статистику по периодам
     * @param {string} period - период (day, week, month, year)
     * @returns {Object} статистика по периодам
     */
    getPeriodStats(period) {
        const now = Date.now();
        let periodMs;

        switch (period) {
            case 'day':
                periodMs = 24 * 60 * 60 * 1000;
                break;
            case 'week':
                periodMs = 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                periodMs = 30 * 24 * 60 * 60 * 1000;
                break;
            case 'year':
                periodMs = 365 * 24 * 60 * 60 * 1000;
                break;
            default:
                periodMs = 24 * 60 * 60 * 1000;
        }

        const recentGames = this.gameHistory.filter(
            g => now - g.startTime < periodMs
        );

        return {
            gamesPlayed: recentGames.length,
            totalPlayers: recentGames.reduce((sum, g) => sum + g.players.length, 0),
            averageDuration: recentGames.length > 0 ? 
                recentGames.reduce((sum, g) => sum + g.duration, 0) / recentGames.length : 0,
            mostActivePlayer: this.getMostActivePlayer(periodMs),
            mostPopularProperty: this.getMostPopularProperty(periodMs)
        };
    }

    /**
     * Получает самого активного игрока за период
     * @param {number} periodMs - период в миллисекундах
     * @returns {Object} самый активный игрок
     */
    getMostActivePlayer(periodMs) {
        const now = Date.now();
        const playerActivity = new Map();

        this.gameHistory.forEach(game => {
            if (now - game.startTime < periodMs) {
                game.players.forEach(player => {
                    playerActivity.set(player.id, 
                        (playerActivity.get(player.id) || 0) + 1);
                });
            }
        });

        if (playerActivity.size === 0) return null;

        const mostActive = Array.from(playerActivity.entries())
            .sort((a, b) => b[1] - a[1])[0];

        const playerStats = this.playerStats.get(mostActive[0]);
        return {
            id: mostActive[0],
            name: playerStats ? playerStats.name : 'Unknown',
            gamesPlayed: mostActive[1]
        };
    }

    /**
     * Получает самую популярную недвижимость за период
     * @param {number} periodMs - период в миллисекундах
     * @returns {Object} самая популярная недвижимость
     */
    getMostPopularProperty(periodMs) {
        const now = Date.now();
        const propertyCount = new Map();

        this.playerStats.forEach(stats => {
            if (now - stats.lastPlayed < periodMs) {
                stats.favoriteProperties.forEach((count, property) => {
                    propertyCount.set(property, 
                        (propertyCount.get(property) || 0) + count);
                });
            }
        });

        if (propertyCount.size === 0) return null;

        const mostPopular = Array.from(propertyCount.entries())
            .sort((a, b) => b[1] - a[1])[0];

        return {
            name: mostPopular[0],
            purchases: mostPopular[1]
        };
    }

    /**
     * Получает аналитику игрока
     * @param {string} playerId - ID игрока
     * @returns {Object} аналитика
     */
    getPlayerAnalytics(playerId) {
        const stats = this.playerStats.get(playerId);
        if (!stats) return null;

        const totalGames = stats.gamesPlayed;
        const winRate = stats.winRate;
        const avgGameDuration = stats.averageGameDuration;
        const avgMoneyPerGame = totalGames > 0 ? stats.totalMoneyEarned / totalGames : 0;
        const avgPropertiesPerGame = totalGames > 0 ? stats.totalPropertiesPurchased / totalGames : 0;

        // Любимые свойства
        const favoriteProperties = Array.from(stats.favoriteProperties.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Торговые партнеры
        const tradingPartners = Array.from(stats.tradingPartners.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => {
                const partnerStats = this.playerStats.get(id);
                return {
                    id,
                    name: partnerStats ? partnerStats.name : 'Unknown',
                    trades: count
                };
            });

        return {
            overview: {
                totalGames,
                winRate,
                avgGameDuration,
                avgMoneyPerGame,
                avgPropertiesPerGame
            },
            favorites: {
                properties: favoriteProperties,
                tradingPartners
            },
            trends: this.getPlayerTrends(playerId)
        };
    }

    /**
     * Получает тренды игрока
     * @param {string} playerId - ID игрока
     * @returns {Object} тренды
     */
    getPlayerTrends(playerId) {
        // Анализируем последние игры для выявления трендов
        const recentGames = this.gameHistory
            .filter(g => g.players.some(p => p.id === playerId))
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, 10);

        if (recentGames.length < 2) return null;

        const winTrend = recentGames.filter(g => g.winner?.id === playerId).length / recentGames.length;
        const avgDuration = recentGames.reduce((sum, g) => sum + g.duration, 0) / recentGames.length;

        return {
            recentWinRate: winTrend * 100,
            recentAvgDuration: avgDuration,
            improving: winTrend > 0.5,
            consistent: recentGames.length >= 5
        };
    }

    /**
     * Сбрасывает статистику игрока
     * @param {string} playerId - ID игрока
     */
    resetPlayerStats(playerId) {
        this.playerStats.delete(playerId);
    }

    /**
     * Сбрасывает всю статистику
     */
    resetAllStats() {
        this.playerStats.clear();
        this.gameHistory = [];
        this.initializeStats();
    }

    /**
     * Экспортирует статистику
     * @returns {Object} экспортированная статистика
     */
    exportStats() {
        return {
            globalStats: this.globalStats,
            playerStats: Array.from(this.playerStats.entries()),
            gameHistory: this.gameHistory,
            records: Array.from(this.records.entries()),
            exportDate: Date.now()
        };
    }

    /**
     * Импортирует статистику
     * @param {Object} data - данные для импорта
     */
    importStats(data) {
        if (data.globalStats) {
            this.globalStats = data.globalStats;
        }
        if (data.playerStats) {
            this.playerStats = new Map(data.playerStats);
        }
        if (data.gameHistory) {
            this.gameHistory = data.gameHistory;
        }
        if (data.records) {
            this.records = new Map(data.records);
        }
    }

    /**
     * Сохраняет данные статистики
     */
    saveData() {
        const data = {
            globalStats: this.globalStats,
            playerStats: Array.from(this.playerStats.entries()),
            gameHistory: this.gameHistory,
            records: Array.from(this.records.entries())
        };
        localStorage.setItem('statisticsData', JSON.stringify(data));
    }

    /**
     * Загружает данные статистики
     */
    loadData() {
        try {
            const data = JSON.parse(localStorage.getItem('statisticsData'));
            if (data) {
                this.globalStats = data.globalStats || this.globalStats;
                this.playerStats = new Map(data.playerStats || []);
                this.gameHistory = data.gameHistory || [];
                this.records = new Map(data.records || []);
            }
        } catch (error) {
            console.warn('Failed to load statistics data:', error);
        }
    }
}

// Экспортируем класс
window.StatisticsSystem = StatisticsSystem; 