/**
 * Модуль для управления комнатами
 */
export class RoomManager {
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