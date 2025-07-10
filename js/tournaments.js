/**
 * Модуль управления турнирами
 * Организует турниры, управляет участниками и наградами
 */
import eventBus from './event-bus.js';

class TournamentSystem {
    constructor() {
        this.tournaments = new Map();
        this.activeTournaments = new Map();
        this.tournamentHistory = [];
        this.players = new Map();
        this.rankings = new Map();
        
        this.tournamentTypes = {
            'quick': { name: 'Быстрый турнир', duration: 30 * 60 * 1000, maxPlayers: 4 },
            'standard': { name: 'Стандартный турнир', duration: 60 * 60 * 1000, maxPlayers: 6 },
            'championship': { name: 'Чемпионат', duration: 120 * 60 * 1000, maxPlayers: 8 },
            'elimination': { name: 'Турнир на выбывание', duration: 90 * 60 * 1000, maxPlayers: 16 },
            'league': { name: 'Лига', duration: 7 * 24 * 60 * 60 * 1000, maxPlayers: 32 }
        };

        this.prizePools = {
            'quick': [1000, 500, 250],
            'standard': [2000, 1000, 500, 250],
            'championship': [5000, 2500, 1000, 500],
            'elimination': [3000, 1500, 750, 375],
            'league': [10000, 5000, 2500, 1000, 500]
        };

        this.setupEventListeners();
        this.loadData();
    }

    /**
     * Настраивает слушатели событий
     */
    setupEventListeners() {
        // Listen for the specific event that a tournament game has ended
        eventBus.on('tournamentGameEnded', (detail) => this.handleGameEnd(detail));

        // This should be emitted by the network manager or a player manager
        // For now, we'll listen to the game-level playerBankrupt event
        eventBus.on('playerDisconnected', (detail) => this.handlePlayerDisconnect(detail));
    }

    /**
     * Создает новый турнир
     * @param {Object} config - конфигурация турнира
     * @returns {Object} созданный турнир
     */
    createTournament(config) {
        const tournamentId = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const type = this.tournamentTypes[config.type] || this.tournamentTypes.standard;
        
        const tournament = {
            id: tournamentId,
            name: config.name || type.name,
            type: config.type,
            status: 'registration', // registration, active, finished
            startTime: null,
            endTime: null,
            duration: type.duration,
            maxPlayers: type.maxPlayers,
            minPlayers: config.minPlayers || 2,
            currentPlayers: [],
            games: [],
            brackets: [],
            standings: [],
            prizePool: this.prizePools[config.type] || this.prizePools.standard,
            entryFee: config.entryFee || 0,
            rules: config.rules || {},
            createdBy: config.createdBy,
            createdAt: Date.now(),
            settings: {
                weatherEnabled: config.weatherEnabled !== false,
                eventsEnabled: config.eventsEnabled !== false,
                tradingEnabled: config.tradingEnabled !== false,
                alliancesEnabled: config.alliancesEnabled !== false,
                startingMoney: config.startingMoney || 1500,
                maxTurns: config.maxTurns || 100
            }
        };

        this.tournaments.set(tournamentId, tournament);
        this.saveData();

        // Отправляем событие о создании турнира
        this.dispatchTournamentEvent('tournamentCreated', tournament);

        return tournament;
    }

    /**
     * Регистрирует игрока в турнире
     * @param {string} tournamentId - ID турнира
     * @param {Player} player - игрок
     * @returns {boolean} успешность регистрации
     */
    registerPlayer(tournamentId, player) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'registration') {
            return false;
        }

        if (tournament.currentPlayers.length >= tournament.maxPlayers) {
            return false;
        }

        if (tournament.currentPlayers.some(p => p.id === player.id)) {
            return false;
        }

        // Проверяем вступительный взнос
        if (tournament.entryFee > 0 && player.money < tournament.entryFee) {
            return false;
        }

        // Списываем вступительный взнос
        if (tournament.entryFee > 0) {
            player.addMoney(-tournament.entryFee);
        }

        const tournamentPlayer = {
            id: player.id,
            name: player.name,
            registeredAt: Date.now(),
            gamesPlayed: 0,
            gamesWon: 0,
            totalMoney: 0,
            totalProperties: 0,
            eliminated: false,
            eliminatedAt: null,
            finalPosition: null
        };

        tournament.currentPlayers.push(tournamentPlayer);
        this.saveData();

        // Отправляем событие о регистрации
        this.dispatchTournamentEvent('playerRegistered', { tournament, player: tournamentPlayer });

        // Проверяем, можно ли начать турнир
        if (tournament.currentPlayers.length >= tournament.minPlayers) {
            this.checkTournamentStart(tournamentId);
        }

        return true;
    }

    /**
     * Отменяет регистрацию игрока
     * @param {string} tournamentId - ID турнира
     * @param {string} playerId - ID игрока
     * @returns {boolean} успешность отмены
     */
    unregisterPlayer(tournamentId, playerId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'registration') {
            return false;
        }

        const playerIndex = tournament.currentPlayers.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return false;
        }

        const player = tournament.currentPlayers[playerIndex];
        tournament.currentPlayers.splice(playerIndex, 1);

        // Возвращаем вступительный взнос
        if (tournament.entryFee > 0) {
            eventBus.emit('playerMoneyUpdateRequest', { playerId: playerId, amount: tournament.entryFee, reason: 'tournament_refund' });
        }

        this.saveData();

        // Отправляем событие об отмене регистрации
        this.dispatchTournamentEvent('playerUnregistered', { tournament, playerId });

        return true;
    }

    /**
     * Проверяет возможность начала турнира
     * @param {string} tournamentId - ID турнира
     */
    checkTournamentStart(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'registration') {
            return;
        }

        // Автоматический старт через 30 секунд после достижения минимального количества игроков
        if (tournament.currentPlayers.length >= tournament.minPlayers) {
            setTimeout(() => {
                this.startTournament(tournamentId);
            }, 30000);
        }
    }

    /**
     * Начинает турнир
     * @param {string} tournamentId - ID турнира
     * @returns {boolean} успешность запуска
     */
    startTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'registration') {
            return false;
        }

        if (tournament.currentPlayers.length < tournament.minPlayers) {
            return false;
        }

        tournament.status = 'active';
        tournament.startTime = Date.now();
        tournament.endTime = tournament.startTime + tournament.duration;

        // Создаем турнирную сетку в зависимости от типа
        this.createTournamentBrackets(tournament);

        this.activeTournaments.set(tournamentId, tournament);
        this.saveData();

        // Отправляем событие о начале турнира
        this.dispatchTournamentEvent('tournamentStarted', tournament);

        // Запускаем первую игру
        this.startNextGame(tournamentId);

        return true;
    }

    /**
     * Создает турнирную сетку
     * @param {Object} tournament - турнир
     */
    createTournamentBrackets(tournament) {
        const players = [...tournament.currentPlayers];
        const playerCount = players.length;

        switch (tournament.type) {
            case 'elimination':
                this.createEliminationBrackets(tournament, players);
                break;
            case 'league':
                this.createLeagueBrackets(tournament, players);
                break;
            default:
                this.createRoundRobinBrackets(tournament, players);
                break;
        }
    }

    /**
     * Создает сетку на выбывание
     * @param {Object} tournament - турнир
     * @param {Array} players - игроки
     */
    createEliminationBrackets(tournament, players) {
        // Перемешиваем игроков
        const shuffledPlayers = players.sort(() => Math.random() - 0.5);
        
        // Создаем пары для первого раунда
        const rounds = [];
        let currentRound = [];
        
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            if (i + 1 < shuffledPlayers.length) {
                currentRound.push({
                    gameId: null,
                    player1: shuffledPlayers[i],
                    player2: shuffledPlayers[i + 1],
                    winner: null,
                    status: 'pending'
                });
            } else {
                // Нечетное количество игроков - последний проходит автоматически
                currentRound.push({
                    gameId: null,
                    player1: shuffledPlayers[i],
                    player2: null,
                    winner: shuffledPlayers[i],
                    status: 'bye'
                });
            }
        }
        
        rounds.push(currentRound);
        tournament.brackets = rounds;
    }

    /**
     * Создает лиговую сетку
     * @param {Object} tournament - турнир
     * @param {Array} players - игроки
     */
    createLeagueBrackets(tournament, players) {
        const games = [];
        
        // Каждый игрок играет с каждым
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                games.push({
                    gameId: null,
                    player1: players[i],
                    player2: players[j],
                    winner: null,
                    status: 'pending',
                    round: Math.floor(games.length / Math.ceil(players.length / 2))
                });
            }
        }
        
        tournament.brackets = [games];
    }

    /**
     * Создает круговую сетку
     * @param {Object} tournament - турнир
     * @param {Array} players - игроки
     */
    createRoundRobinBrackets(tournament, players) {
        const games = [];
        const playerCount = players.length;
        
        // Создаем игры для всех игроков
        for (let i = 0; i < playerCount; i++) {
            for (let j = i + 1; j < playerCount; j++) {
                games.push({
                    gameId: null,
                    player1: players[i],
                    player2: players[j],
                    winner: null,
                    status: 'pending'
                });
            }
        }
        
        tournament.brackets = [games];
    }

    /**
     * Запускает следующую игру в турнире
     * @param {string} tournamentId - ID турнира
     */
    startNextGame(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;

        const pendingGame = this.findPendingGame(tournament);
        if (!pendingGame) {
            this.finishTournament(tournamentId);
            return;
        }

        // Создаем новую игру
        const gameConfig = {
            players: [pendingGame.player1, pendingGame.player2].filter(p => p),
            settings: tournament.settings,
            tournamentId: tournamentId,
            gameId: pendingGame.gameId
        };

        // Запускаем игру
        eventBus.emit('startTournamentGameRequest', gameConfig);
        pendingGame.status = 'active';
    }

    /**
     * Находит ожидающую игру
     * @param {Object} tournament - турнир
     * @returns {Object} игра
     */
    findPendingGame(tournament) {
        for (const round of tournament.brackets) {
            for (const game of round) {
                if (game.status === 'pending') {
                    return game;
                }
            }
        }
        return null;
    }

    /**
     * Обрабатывает окончание игры
     * @param {Object} gameData - данные игры
     */
    handleGameEnd(gameData) {
        if (!gameData.tournamentId) return;

        const tournament = this.activeTournaments.get(gameData.tournamentId);
        if (!tournament) return;

        // Находим игру в турнире
        const game = this.findGameInTournament(tournament, gameData.gameId);
        if (!game) return;

        // Обновляем статус игры
        game.status = 'finished';
        game.winner = gameData.winner;

        // Обновляем статистику игроков
        this.updatePlayerStats(tournament, gameData);

        // Добавляем игру в историю турнира
        tournament.games.push({
            id: gameData.gameId,
            player1: game.player1,
            player2: game.player2,
            winner: gameData.winner,
            duration: gameData.duration,
            finalState: gameData.finalState,
            completedAt: Date.now()
        });

        // Проверяем, нужно ли продолжить турнир
        if (tournament.type === 'elimination') {
            this.handleEliminationGameEnd(tournament, game);
        } else {
            this.handleRoundRobinGameEnd(tournament, game);
        }

        this.saveData();

        // Запускаем следующую игру
        setTimeout(() => {
            this.startNextGame(gameData.tournamentId);
        }, 5000);
    }

    /**
     * Находит игру в турнире
     * @param {Object} tournament - турнир
     * @param {string} gameId - ID игры
     * @returns {Object} игра
     */
    findGameInTournament(tournament, gameId) {
        for (const round of tournament.brackets) {
            for (const game of round) {
                if (game.gameId === gameId) {
                    return game;
                }
            }
        }
        return null;
    }

    /**
     * Обновляет статистику игроков
     * @param {Object} tournament - турнир
     * @param {Object} gameData - данные игры
     */
    updatePlayerStats(tournament, gameData) {
        const player1 = tournament.currentPlayers.find(p => p.id === gameData.player1.id);
        const player2 = tournament.currentPlayers.find(p => p.id === gameData.player2.id);

        if (player1) {
            player1.gamesPlayed++;
            player1.totalMoney += gameData.player1.money;
            player1.totalProperties += gameData.player1.properties.length;
            if (gameData.winner.id === player1.id) {
                player1.gamesWon++;
            }
        }

        if (player2) {
            player2.gamesPlayed++;
            player2.totalMoney += gameData.player2.money;
            player2.totalProperties += gameData.player2.properties.length;
            if (gameData.winner.id === player2.id) {
                player2.gamesWon++;
            }
        }
    }

    /**
     * Обрабатывает окончание игры в турнире на выбывание
     * @param {Object} tournament - турнир
     * @param {Object} game - игра
     */
    handleEliminationGameEnd(tournament, game) {
        // Помечаем проигравшего как выбывшего
        const loser = game.winner.id === game.player1.id ? game.player2 : game.player1;
        if (loser) {
            const tournamentPlayer = tournament.currentPlayers.find(p => p.id === loser.id);
            if (tournamentPlayer) {
                tournamentPlayer.eliminated = true;
                tournamentPlayer.eliminatedAt = Date.now();
            }
        }

        // Проверяем, остался ли только один игрок
        const activePlayers = tournament.currentPlayers.filter(p => !p.eliminated);
        if (activePlayers.length === 1) {
            this.finishTournament(tournament.id);
        }
    }

    /**
     * Обрабатывает окончание игры в круговом турнире
     * @param {Object} tournament - турнир
     * @param {Object} game - игра
     */
    handleRoundRobinGameEnd(tournament, game) {
        // Проверяем, все ли игры завершены
        const pendingGames = this.findPendingGame(tournament);
        if (!pendingGames) {
            this.finishTournament(tournament.id);
        }
    }

    /**
     * Завершает турнир
     * @param {string} tournamentId - ID турнира
     */
    finishTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;

        tournament.status = 'finished';
        tournament.endTime = Date.now();

        // Определяем победителей
        const winners = this.determineWinners(tournament);

        // Выдаем призы
        this.distributePrizes(tournament, winners);

        // Обновляем рейтинги
        this.updateRankings(tournament, winners);

        // Добавляем в историю
        this.tournamentHistory.push({
            id: tournament.id,
            name: tournament.name,
            type: tournament.type,
            startTime: tournament.startTime,
            endTime: tournament.endTime,
            players: tournament.currentPlayers.length,
            winners: winners,
            prizePool: tournament.prizePool
        });

        this.activeTournaments.delete(tournamentId);
        this.saveData();

        // UI уведомление о победе
        if (window.ui && winners && winners.length > 0) {
            const winnerNames = winners.map(w => w.name).join(', ');
            window.ui.showNotification(
                `Турнир завершён! Победитель: ${winnerNames}. <button class='notification-details' onclick='window.ui.showTournamentsModal()'>Подробнее</button>`,
                'success', 7000
            );
        }

        // Отправляем событие о завершении турнира
        this.dispatchTournamentEvent('tournamentFinished', { tournament, winners });
    }

    /**
     * Определяет победителей турнира
     * @param {Object} tournament - турнир
     * @returns {Array} победители
     */
    determineWinners(tournament) {
        const players = [...tournament.currentPlayers];

        // Сортируем по количеству побед, затем по деньгам
        players.sort((a, b) => {
            if (b.gamesWon !== a.gamesWon) {
                return b.gamesWon - a.gamesWon;
            }
            return b.totalMoney - a.totalMoney;
        });

        return players.slice(0, tournament.prizePool.length);
    }

    /**
     * Распределяет призы
     * @param {Object} tournament - турнир
     * @param {Array} winners - победители
     */
    distributePrizes(tournament, winners) {
        winners.forEach((winner, index) => {
            if (index < tournament.prizePool.length) {
                const prize = tournament.prizePool[index];
                winner.finalPosition = index + 1;
                winner.prize = prize;

                // Выдаем приз игроку
                eventBus.emit('playerMoneyUpdateRequest', { playerId: winner.id, amount: prize, reason: 'tournament_prize' });

                // Обновляем статистику игрока
                if (!this.players.has(winner.id)) {
                    this.players.set(winner.id, {
                        id: winner.id,
                        name: winner.name,
                        tournamentsPlayed: 0,
                        tournamentsWon: 0,
                        totalPrizes: 0,
                        bestPosition: Infinity
                    });
                }

                const playerStats = this.players.get(winner.id);
                playerStats.tournamentsPlayed++;
                playerStats.totalPrizes += prize;
                playerStats.bestPosition = Math.min(playerStats.bestPosition, index + 1);

                if (index === 0) {
                    playerStats.tournamentsWon++;
                }
            }
        });
    }

    /**
     * Обновляет рейтинги
     * @param {Object} tournament - турнир
     * @param {Array} winners - победители
     */
    updateRankings(tournament, winners) {
        winners.forEach((winner, index) => {
            const points = this.calculateTournamentPoints(index + 1, tournament.type);
            
            if (!this.rankings.has(winner.id)) {
                this.rankings.set(winner.id, {
                    id: winner.id,
                    name: winner.name,
                    points: 0,
                    tournaments: 0
                });
            }

            const ranking = this.rankings.get(winner.id);
            ranking.points += points;
            ranking.tournaments++;
        });

        // Сортируем рейтинги
        this.sortRankings();
    }

    /**
     * Вычисляет очки за позицию в турнире
     * @param {number} position - позиция
     * @param {string} tournamentType - тип турнира
     * @returns {number} очки
     */
    calculateTournamentPoints(position, tournamentType) {
        const basePoints = {
            'quick': 10,
            'standard': 25,
            'championship': 50,
            'elimination': 30,
            'league': 100
        };

        const multiplier = Math.max(1, 6 - position);
        return (basePoints[tournamentType] || 25) * multiplier;
    }

    /**
     * Сортирует рейтинги
     */
    sortRankings() {
        const sortedRankings = Array.from(this.rankings.values())
            .sort((a, b) => b.points - a.points);

        sortedRankings.forEach((ranking, index) => {
            ranking.rank = index + 1;
        });
    }

    /**
     * Обрабатывает отключение игрока
     * @param {Object} data - данные отключения
     */
    handlePlayerDisconnect(data) {
        // Проверяем все активные турниры
        this.activeTournaments.forEach((tournament, tournamentId) => {
            const player = tournament.currentPlayers.find(p => p.id === data.playerId);
            if (player) {
                // Помечаем игрока как выбывшего
                player.eliminated = true;
                player.eliminatedAt = Date.now();

                // Проверяем, нужно ли завершить турнир
                const activePlayers = tournament.currentPlayers.filter(p => !p.eliminated);
                if (activePlayers.length <= 1) {
                    this.finishTournament(tournamentId);
                }
            }
        });
    }

    /**
     * Получает активные турниры
     * @returns {Array} активные турниры
     */
    getActiveTournaments() {
        return Array.from(this.activeTournaments.values());
    }

    /**
     * Получает турниры для регистрации
     * @returns {Array} турниры для регистрации
     */
    getRegistrationTournaments() {
        return Array.from(this.tournaments.values())
            .filter(t => t.status === 'registration');
    }

    /**
     * Получает историю турниров
     * @param {number} limit - лимит
     * @returns {Array} история турниров
     */
    getTournamentHistory(limit = 10) {
        return this.tournamentHistory
            .sort((a, b) => b.endTime - a.endTime)
            .slice(0, limit);
    }

    /**
     * Получает рейтинги
     * @param {number} limit - лимит
     * @returns {Array} рейтинги
     */
    getRankings(limit = 10) {
        return Array.from(this.rankings.values())
            .sort((a, b) => b.points - a.points)
            .slice(0, limit);
    }

    /**
     * Получает статистику игрока в турнирах
     * @param {string} playerId - ID игрока
     * @returns {Object} статистика
     */
    getPlayerTournamentStats(playerId) {
        const playerStats = this.players.get(playerId);
        const ranking = this.rankings.get(playerId);
        const tournaments = this.tournamentHistory.filter(t => 
            t.winners.some(w => w.id === playerId)
        );

        return {
            stats: playerStats || {
                tournamentsPlayed: 0,
                tournamentsWon: 0,
                totalPrizes: 0,
                bestPosition: Infinity
            },
            ranking: ranking || { points: 0, rank: Infinity },
            recentTournaments: tournaments.slice(0, 5)
        };
    }

    /**
     * Отправляет событие турнира
     * @param {string} eventType - тип события
     * @param {Object} data - данные события
     */
    dispatchTournamentEvent(eventType, data) {
        // The event name will be like 'tournamentCreated', 'playerRegistered', etc.
        eventBus.emit(eventType, { ...data, timestamp: Date.now() });
    }

    /**
     * Сохраняет данные турниров
     */
    saveData() {
        const data = {
            tournaments: Array.from(this.tournaments.entries()),
            activeTournaments: Array.from(this.activeTournaments.entries()),
            tournamentHistory: this.tournamentHistory,
            players: Array.from(this.players.entries()),
            rankings: Array.from(this.rankings.entries())
        };
        localStorage.setItem('tournamentData', JSON.stringify(data));
    }

    /**
     * Загружает данные турниров
     */
    loadData() {
        try {
            const data = JSON.parse(localStorage.getItem('tournamentData'));
            if (data) {
                this.tournaments = new Map(data.tournaments || []);
                this.activeTournaments = new Map(data.activeTournaments || []);
                this.tournamentHistory = data.tournamentHistory || [];
                this.players = new Map(data.players || []);
                this.rankings = new Map(data.rankings || []);
            }
        } catch (error) {
            console.warn('Failed to load tournament data:', error);
        }
    }
}

// Экспортируем класс
window.TournamentSystem = TournamentSystem; 