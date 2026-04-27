/**
 * Главный файл сервера для игры "Монополия Россия".
 * Управляет WebSocket-соединениями и маршрутизирует сообщения.
 */

import { WebSocketServer } from 'ws';
import { RoomManager } from './roomManager.js';
import { observability } from './observability.js';
import { captureBackendException, initErrorTracking } from './errorTracking.js';

const env = loadEnv();
const PORT = env.PORT;
const wss = new WebSocketServer({ port: PORT });
const roomManager = new RoomManager(wss, observability);
void initErrorTracking();

observability.logger.info('server_started', { port: PORT });

wss.on('connection', (ws) => {
    // Инициализируем состояние для нового подключения
    ws.isAlive = true;
    ws.connectedAt = Date.now();
    ws.id = null; // ID игрока будет установлен после аутентификации
    ws.roomId = null; // ID комнаты, в которой находится игрок

    observability.logger.info('client_connected', { remote: ws?._socket?.remoteAddress || 'unknown' });

    // Обработчик ответа на ping от сервера
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Обработчик входящих сообщений
    ws.on('message', (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage);
            observability.metrics.recordLeadResponseTime(Date.now() - ws.connectedAt);
            handleMessage(ws, message);
        } catch (e) {
            observability.metrics.incrementInboundDrop();
            captureBackendException(e, { stage: 'parse_message', payload: rawMessage.toString() });
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Неверный формат сообщения.' } }));
        }
    });

    // Обработчик закрытия соединения
    ws.on('close', () => {
        observability.logger.info('client_disconnected', { playerId: ws.id || null });
        roomManager.handleDisconnect(ws);
    });

    // Обработчик ошибок
    ws.on('error', (error) => {
        captureBackendException(error, { stage: 'websocket', playerId: ws.id || null });
    });
});

/**
 * Маршрутизатор входящих сообщений от клиента.
 * @param {WebSocket} ws - Экземпляр WebSocket клиента.
 * @param {object} message - Распарсенное сообщение.
 */
function handleMessage(ws, message) {
    const { type, data } = message;

    // Первое сообщение от клиента должно быть 'auth'
    if (!ws.id && type !== 'auth') {
        observability.metrics.incrementInboundDrop();
        observability.logger.warn('message_without_auth', { type });
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Требуется аутентификация.' } }));
        ws.terminate();
        return;
    }

    // Выводим в лог для отладки
    // console.log(`[${ws.id}] -> [${type}]`, data);

    switch (type) {
        case 'auth':
            ws.id = data.playerId;
            ws.send(JSON.stringify({ type: 'auth_success', data: { playerId: ws.id } }));
            observability.logger.info('auth_success', { playerId: ws.id });
            // После аутентификации отправляем актуальный список комнат
            roomManager.broadcastRoomList();
            break;

        case 'create_room':
            roomManager.createRoom(ws, data);
            break;

        case 'join_room':
            // Клиентский network.js отправляет playerData внутри data
            roomManager.joinRoom(ws, data.roomId, data.playerData);
            break;

        case 'leave_room':
            roomManager.leaveRoom(ws);
            break;

        case 'get_room_list':
            roomManager.broadcastRoomList();
            break;

        case 'heartbeat':
            // Клиент прислал "пульс", значит он жив
            ws.isAlive = true;
            break;

        case 'ops_health_report':
            ws.send(JSON.stringify({
                type: 'ops_health_report',
                data: observability.metrics.dailyHealthReport(),
            }));
            break;

        default:
            // Если это сообщение для конкретной комнаты (например, start_game или player_action)
            if (ws.roomId) {
                roomManager.routeMessageToRoom(ws, message);
            } else {
                observability.logger.warn('unknown_message_type', { playerId: ws.id, type });
            }
            break;
    }
}

/**
 * Проверка "пульса" для всех клиентов.
 * Разрывает соединение, если клиент не отвечает на ping.
 */
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) {
            observability.logger.warn('heartbeat_terminated_connection', { playerId: ws.id || null });
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Проверка каждые 30 секунд

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});
