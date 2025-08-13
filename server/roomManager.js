/**
 * Server-side Room Manager.
 * Manages game rooms, players within them, and the lifecycle of game instances.
 */

import { GameInstance } from './gameInstance.js';
import { generateId } from '../js/utils.js';

/**
 * Представляет одну игровую комнату на сервере.
 */
class Room {
    /**
     * @param {string} id - Уникальный ID комнаты.
     * @param {string} name - Название комнаты.
     * @param {string} hostId - ID игрока-хоста.
     * @param {object} settings - Настройки игры.
     */
    constructor(id, name, hostId, settings = {}) {
        this.id = id;
        this.name = name || `Комната ${id}`;
        this.hostId = hostId;
        this.players = new Map(); // Map<playerId, { ws: WebSocket, playerData: object }>
        this.settings = {
            maxPlayers: 4,
            password: '',
            ...settings
        };
        this.gameInstance = null;
        this.state = 'waiting'; // 'waiting', 'playing', 'finished'
    }

    addPlayer(ws, playerData) {
        if (this.isFull()) {
            return false; // Комната заполнена
        }
        this.players.set(playerData.id, { ws, playerData });
        ws.roomId = this.id; // Связываем ID комнаты с WebSocket соединением
        return true;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.ws.roomId = null;
            this.players.delete(playerId);

            // Если хост выходит, назначаем нового
            if (this.hostId === playerId && this.players.size > 0) {
                this.hostId = this.players.keys().next().value;
                this.broadcast('host_changed', { newHostId: this.hostId });
            }
        }
    }

    isFull() {
        return this.players.size >= this.settings.maxPlayers;
    }

    isEmpty() {
        return this.players.size === 0;
    }

    broadcast(type, data, excludePlayerId = null) {
        const message = JSON.stringify({ type, data, roomId: this.id });
        for (const [playerId, player] of this.players.entries()) {
            if (playerId !== excludePlayerId && player.ws.readyState === 1 /* WebSocket.OPEN */) {
                player.ws.send(message);
            }
        }
    }

    sendToPlayer(playerId, type, data) {
        const player = this.players.get(playerId);
        if (player && player.ws.readyState === 1) {
            player.ws.send(JSON.stringify({ type, data, roomId: this.id }));
        }
    }

    startGame() {
        if (this.state !== 'waiting' || this.players.size < (this.settings.minPlayers || 2)) {
            return false;
        }
        this.state = 'playing';
        const playersData = Array.from(this.players.values()).map(p => p.playerData);

        this.gameInstance = new GameInstance(
            playersData,
            this.settings,
            (type, data) => this.broadcast(type, data),
            (playerId, type, data) => this.sendToPlayer(playerId, type, data)
        );
        return true;
    }

    getPublicState() {
        return {
            id: this.id,
            name: this.name,
            playerCount: this.players.size,
            maxPlayers: this.settings.maxPlayers,
            state: this.state,
            hasPassword: !!this.settings.password,
        };
    }

    getFullState() {
        return {
            id: this.id,
            name: this.name,
            hostId: this.hostId,
            settings: this.settings,
            players: Array.from(this.players.values()).map(p => p.playerData),
        };
    }
}

/**
 * Управляет всеми игровыми комнатами на сервере.
 */
export class RoomManager {
    constructor(wss) {
        this.wss = wss; // Экземпляр WebSocketServer
        this.rooms = new Map(); // Map<roomId, Room>
    }

    createRoom(ws, config) {
        const roomId = generateId();
        const hostId = ws.id; // ws.id должен быть установлен после аутентификации

        const room = new Room(roomId, config.name, hostId, config.settings);
        this.rooms.set(roomId, room);

        // Автоматически присоединяем создателя к комнате
        this.joinRoom(ws, roomId, { id: hostId, name: config.playerName || 'Хост', token: config.playerToken || 'matryoshka' });

        console.log(`Комната создана: ${room.name} (${roomId}) игроком ${hostId}`);

        this.broadcastRoomList();
        return room;
    }

    joinRoom(ws, roomId, playerData) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return ws.send(JSON.stringify({ type: 'error', data: { message: 'Комната не найдена' } }));
        }
        if (room.isFull()) {
            return ws.send(JSON.stringify({ type: 'error', data: { message: 'Комната заполнена' } }));
        }

        // Уведомляем других игроков в комнате о новом участнике
        room.broadcast('player_joined', { player: playerData }, ws.id);

        // Добавляем нового игрока в комнату
        room.addPlayer(ws, playerData);

        // Отправляем полное состояние комнаты новому игроку
        ws.send(JSON.stringify({ type: 'room_joined', data: room.getFullState() }));

        console.log(`Игрок ${playerData.id} присоединился к комнате ${roomId}`);

        this.broadcastRoomList();
    }

    leaveRoom(ws) {
        const roomId = ws.roomId;
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room) return;

        const playerId = ws.id;
        room.removePlayer(playerId);

        console.log(`Игрок ${playerId} покинул комнату ${roomId}`);

        if (room.isEmpty()) {
            this.rooms.delete(roomId);
            console.log(`Комната ${roomId} пуста и была удалена.`);
        } else {
            // Уведомляем оставшихся игроков
            room.broadcast('player_left', { playerId });
        }

        this.broadcastRoomList();
    }

    handleDisconnect(ws) {
        this.leaveRoom(ws);
    }

    routeMessageToRoom(ws, message) {
        const { type, data } = message;
        const room = this.rooms.get(ws.roomId);
        if (!room) return;

        // Обработка начала игры
        if (type === 'start_game' && ws.id === room.hostId) {
            if (room.startGame()) {
                this.broadcastRoomList(); // Обновляем статус комнаты на 'playing'
            } else {
                ws.send(JSON.stringify({ type: 'error', data: { message: 'Не удалось начать игру.' } }));
            }
            return;
        }

        // Обработка игровых действий
        if (type === 'player_action' && room.gameInstance) {
            room.gameInstance.handlePlayerAction(ws.id, data.action, data.data);
        }
    }

    broadcastRoomList() {
        const roomList = Array.from(this.rooms.values()).map(room => room.getPublicState());
        const message = JSON.stringify({
            type: 'room_list',
            data: { rooms: roomList }
        });

        this.wss.clients.forEach(client => {
            if (client.readyState === 1 /* WebSocket.OPEN */) {
                client.send(message);
            }
        });
    }
}