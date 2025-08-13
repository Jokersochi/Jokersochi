/**
 * Модуль для управления турнирами
 */
export class TournamentManager {
    constructor(networkManager) {
        this.network = networkManager;
        this.tournaments = new Map();
        this.currentTournament = null;
        this.tournamentList = [];
        
        this.setupEventHandlers();
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventHandlers() {
        this.network.on('tournament_list', (data) => {
            this.tournamentList = data.tournaments;
            this.triggerEvent('tournament_list_updated', this.tournamentList);
        });

        this.network.on('tournament_joined', (data) => {
            this.currentTournament = data;
            this.triggerEvent('tournament_joined', data);
        });

        this.network.on('tournament_update', (data) => {
            if (this.currentTournament && this.currentTournament.id === data.tournamentId) {
                Object.assign(this.currentTournament, data);
                this.triggerEvent('tournament_updated', data);
            }
        });

        this.network.on('tournament_ended', (data) => {
            this.currentTournament = null;
            this.triggerEvent('tournament_ended', data);
        });
    }

    /**
     * Получает список турниров
     */
    getTournamentList() {
        this.network.sendMessage('get_tournament_list');
    }

    /**
     * Создает турнир
     * @param {Object} config - конфигурация турнира
     */
    createTournament(config) {
        this.network.sendMessage('create_tournament', config);
    }

    /**
     * Присоединяется к турниру
     * @param {string} tournamentId - ID турнира
     */
    joinTournament(tournamentId) {
        this.network.sendMessage('join_tournament', { tournamentId: tournamentId });
    }

    /**
     * Покидает турнир
     */
    leaveTournament() {
        if (this.currentTournament) {
            this.network.sendMessage('leave_tournament');
            this.currentTournament = null;
        }
    }

    /**
     * Получает текущий турнир
     * @returns {Object|null} текущий турнир
     */
    getCurrentTournament() {
        return this.currentTournament;
    }

    /**
     * Получает список турниров
     * @returns {Array} список турниров
     */
    getTournaments() {
        return this.tournamentList;
    }
}