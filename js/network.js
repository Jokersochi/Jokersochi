/**
 * Модуль сетевого взаимодействия для мультиплеера
 * Обеспечивает онлайн-игру, чат, синхронизацию и турниры
 */

class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.playerId = null;
        this.serverUrl = 'wss://your-game-server.com';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.eventHandlers = {};
        
        this.initializeNetwork();
    }

    /**
     * Инициализирует сетевые функции
     */
    initializeNetwork() {
        this.setupEventHandlers();
        this.setupHeartbeat();
        this.setupReconnection();
    }

    /**
     * Подключается к серверу
     * @param {string} serverUrl - URL сервера
     * @param {string} playerId - ID игрока
     */
    connect(serverUrl = this.serverUrl, playerId = null) {
        if (this.connected) return;

        try {
            this.socket = new WebSocket(serverUrl);
            this.playerId = playerId || utils.generateId();
            
            this.socket.onopen = () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                this.sendMessage('auth', { playerId: this.playerId });
                this.startHeartbeat();
                this.processMessageQueue();
                this.triggerEvent('connected');
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.socket.onclose = () => {
                this.connected = false;
                this.stopHeartbeat();
                this.triggerEvent('disconnected');
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.triggerEvent('error', error);
            };

        } catch (error) {
            console.error('Connection error:', error);
            this.triggerEvent('error', error);
        }
    }

    /**
     * Отключается от сервера
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        this.stopHeartbeat();
        this.triggerEvent('disconnected');
    }

    /**
     * Отправляет сообщение на сервер
     * @param {string} type - тип сообщения
     * @param {Object} data - данные сообщения
     */
    sendMessage(type, data = {}) {
        const message = {
            type: type,
            playerId: this.playerId,
            roomId: this.roomId,
            timestamp: Date.now(),
            data: data
        };

        if (this.connected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    /**
     * Обрабатывает входящие сообщения
     * @param {Object} message - сообщение
     */
    handleMessage(message) {
        switch (message.type) {
            case 'auth_success':
                this.handleAuthSuccess(message.data);
                break;
            case 'room_joined':
                this.handleRoomJoined(message.data);
                break;
            case 'player_joined':
                this.handlePlayerJoined(message.data);
                break;
            case 'player_left':
                this.handlePlayerLeft(message.data);
                break;
            case 'game_state':
                this.handleGameState(message.data);
                break;
            case 'player_action':
                this.handlePlayerAction(message.data);
                break;
            case 'chat_message':
                this.handleChatMessage(message.data);
                break;
            case 'trade_offer':
                this.handleTradeOffer(message.data);
                break;
            case 'auction_update':
                this.handleAuctionUpdate(message.data);
                break;
            case 'weather_change':
                this.handleWeatherChange(message.data);
                break;
            case 'event_trigger':
                this.handleEventTrigger(message.data);
                break;
            case 'tournament_update':
                this.handleTournamentUpdate(message.data);
                break;
            case 'achievement_unlocked':
                this.handleAchievementUnlocked(message.data);
                break;
            case 'error':
                this.handleError(message.data);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    /**
     * Обрабатывает успешную авторизацию
     * @param {Object} data - данные авторизации
     */
    handleAuthSuccess(data) {
        this.playerId = data.playerId;
        this.triggerEvent('auth_success', data);
    }

    /**
     * Обрабатывает присоединение к комнате
     * @param {Object} data - данные комнаты
     */
    handleRoomJoined(data) {
        this.roomId = data.roomId;
        this.triggerEvent('room_joined', data);
    }

    /**
     * Обрабатывает присоединение игрока
     * @param {Object} data - данные игрока
     */
    handlePlayerJoined(data) {
        this.triggerEvent('player_joined', data);
    }

    /**
     * Обрабатывает выход игрока
     * @param {Object} data - данные игрока
     */
    handlePlayerLeft(data) {
        this.triggerEvent('player_left', data);
    }

    /**
     * Обрабатывает обновление состояния игры
     * @param {Object} data - данные состояния
     */
    handleGameState(data) {
        this.triggerEvent('game_state', data);
    }

    /**
     * Обрабатывает действие игрока
     * @param {Object} data - данные действия
     */
    handlePlayerAction(data) {
        this.triggerEvent('player_action', data);
    }

    /**
     * Обрабатывает сообщение чата
     * @param {Object} data - данные сообщения
     */
    handleChatMessage(data) {
        this.triggerEvent('chat_message', data);
    }

    /**
     * Обрабатывает предложение торговли
     * @param {Object} data - данные торговли
     */
    handleTradeOffer(data) {
        this.triggerEvent('trade_offer', data);
    }

    /**
     * Обрабатывает обновление аукциона
     * @param {Object} data - данные аукциона
     */
    handleAuctionUpdate(data) {
        this.triggerEvent('auction_update', data);
    }

    /**
     * Обрабатывает изменение погоды
     * @param {Object} data - данные погоды
     */
    handleWeatherChange(data) {
        this.triggerEvent('weather_change', data);
    }

    /**
     * Обрабатывает триггер события
     * @param {Object} data - данные события
     */
    handleEventTrigger(data) {
        this.triggerEvent('event_trigger', data);
    }

    /**
     * Обрабатывает обновление турнира
     * @param {Object} data - данные турнира
     */
    handleTournamentUpdate(data) {
        this.triggerEvent('tournament_update', data);
    }

    /**
     * Обрабатывает разблокировку достижения
     * @param {Object} data - данные достижения
     */
    handleAchievementUnlocked(data) {
        this.triggerEvent('achievement_unlocked', data);
    }

    /**
     * Обрабатывает ошибку
     * @param {Object} data - данные ошибки
     */
    handleError(data) {
        console.error('Server error:', data);
        this.triggerEvent('error', data);
    }

    /**
     * Присоединяется к комнате
     * @param {string} roomId - ID комнаты
     * @param {Object} playerData - данные игрока
     */
    joinRoom(roomId, playerData) {
        this.sendMessage('join_room', {
            roomId: roomId,
            playerData: playerData
        });
    }

    /**
     * Создает новую комнату
     * @param {Object} roomConfig - конфигурация комнаты
     */
    createRoom(roomConfig) {
        this.sendMessage('create_room', roomConfig);
    }

    /**
     * Покидает комнату
     */
    leaveRoom() {
        this.sendMessage('leave_room');
        this.roomId = null;
    }

    /**
     * Отправляет действие игрока
     * @param {string} action - действие
     * @param {Object} data - данные действия
     */
    sendPlayerAction(action, data = {}) {
        this.sendMessage('player_action', {
            action: action,
            data: data
        });
    }

    /**
     * Отправляет сообщение в чат
     * @param {string} message - сообщение
     * @param {string} type - тип сообщения
     */
    sendChatMessage(message, type = 'chat') {
        this.sendMessage('chat_message', {
            message: message,
            type: type
        });
    }

    /**
     * Отправляет предложение торговли
     * @param {Object} tradeData - данные торговли
     */
    sendTradeOffer(tradeData) {
        this.sendMessage('trade_offer', tradeData);
    }

    /**
     * Отправляет ставку на аукционе
     * @param {number} amount - сумма ставки
     */
    sendAuctionBid(amount) {
        this.sendMessage('auction_bid', { amount: amount });
    }

    /**
     * Отправляет запрос на создание альянса
     * @param {Array} players - игроки в альянсе
     * @param {Object} conditions - условия альянса
     */
    sendAllianceRequest(players, conditions) {
        this.sendMessage('alliance_request', {
            players: players,
            conditions: conditions
        });
    }

    /**
     * Отправляет запрос на участие в турнире
     * @param {string} tournamentId - ID турнира
     */
    sendTournamentJoin(tournamentId) {
        this.sendMessage('tournament_join', {
            tournamentId: tournamentId
        });
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventHandlers() {
        this.eventHandlers = {
            connected: [],
            disconnected: [],
            error: [],
            auth_success: [],
            room_joined: [],
            player_joined: [],
            player_left: [],
            game_state: [],
            player_action: [],
            chat_message: [],
            trade_offer: [],
            auction_update: [],
            weather_change: [],
            event_trigger: [],
            tournament_update: [],
            achievement_unlocked: []
        };
    }

    /**
     * Добавляет обработчик события
     * @param {string} event - событие
     * @param {Function} handler - обработчик
     */
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    /**
     * Удаляет обработчик события
     * @param {string} event - событие
     * @param {Function} handler - обработчик
     */
    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    /**
     * Вызывает обработчики события
     * @param {string} event - событие
     * @param {*} data - данные события
     */
    triggerEvent(event, data = null) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Event handler error:', error);
                }
            });
        }
    }

    /**
     * Настраивает heartbeat для поддержания соединения
     */
    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.connected) {
                this.sendMessage('heartbeat');
            }
        }, 30000); // каждые 30 секунд
    }

    /**
     * Запускает heartbeat
     */
    startHeartbeat() {
        if (!this.heartbeatInterval) {
            this.setupHeartbeat();
        }
    }

    /**
     * Останавливает heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Настраивает переподключение
     */
    setupReconnection() {
        this.reconnectTimer = null;
    }

    /**
     * Пытается переподключиться
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.triggerEvent('reconnect_failed');
            return;
        }

        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    /**
     * Обрабатывает очередь сообщений
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.send(JSON.stringify(message));
        }
    }

    /**
     * Получает статус соединения
     * @returns {boolean} статус соединения
     */
    isConnected() {
        return this.connected && this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    /**
     * Получает задержку соединения
     * @returns {Promise<number>} задержка в миллисекундах
     */
    async getLatency() {
        if (!this.isConnected()) return null;

        const start = Date.now();
        return new Promise((resolve) => {
            const handler = (data) => {
                if (data.type === 'pong') {
                    this.off('pong', handler);
                    resolve(Date.now() - start);
                }
            };
            this.on('pong', handler);
            this.sendMessage('ping');
            
            // Таймаут
            setTimeout(() => {
                this.off('pong', handler);
                resolve(null);
            }, 5000);
        });
    }

    /**
     * Получает статистику соединения
     * @returns {Object} статистика
     */
    getConnectionStats() {
        return {
            connected: this.connected,
            roomId: this.roomId,
            playerId: this.playerId,
            reconnectAttempts: this.reconnectAttempts,
            messageQueueLength: this.messageQueue.length
        };
    }
}

/**
 * Модуль для управления комнатами
 */
class RoomManager {
    constructor(networkManager) {
        this.network = networkManager;
        this.rooms = new Map();
        this.currentRoom = null;
        this.roomList = [];
        
        this.setupEventHandlers();
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventHandlers() {
        this.network.on('room_list', (data) => {
            this.roomList = data.rooms;
            this.triggerEvent('room_list_updated', this.roomList);
        });

        this.network.on('room_joined', (data) => {
            this.currentRoom = data;
            this.triggerEvent('room_joined', data);
        });

        this.network.on('player_joined', (data) => {
            if (this.currentRoom) {
                this.currentRoom.players.push(data.player);
                this.triggerEvent('player_joined', data);
            }
        });

        this.network.on('player_left', (data) => {
            if (this.currentRoom) {
                this.currentRoom.players = this.currentRoom.players.filter(
                    p => p.id !== data.playerId
                );
                this.triggerEvent('player_left', data);
            }
        });
    }

    /**
     * Получает список комнат
     */
    getRoomList() {
        this.network.sendMessage('get_room_list');
    }

    /**
     * Создает новую комнату
     * @param {Object} config - конфигурация комнаты
     */
    createRoom(config) {
        this.network.sendMessage('create_room', config);
    }

    /**
     * Присоединяется к комнате
     * @param {string} roomId - ID комнаты
     */
    joinRoom(roomId) {
        this.network.sendMessage('join_room', { roomId: roomId });
    }

    /**
     * Покидает текущую комнату
     */
    leaveRoom() {
        if (this.currentRoom) {
            this.network.sendMessage('leave_room');
            this.currentRoom = null;
        }
    }

    /**
     * Получает текущую комнату
     * @returns {Object|null} текущая комната
     */
    getCurrentRoom() {
        return this.currentRoom;
    }

    /**
     * Получает список комнат
     * @returns {Array} список комнат
     */
    getRooms() {
        return this.roomList;
    }
}

/**
 * Модуль для управления турнирами
 */
class TournamentManager {
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

// Экспортируем классы
window.NetworkManager = NetworkManager;
window.RoomManager = RoomManager;
window.TournamentManager = TournamentManager; 