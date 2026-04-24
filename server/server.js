/**
 * Главный файл сервера для игры "Монополия Россия".
 * Управляет WebSocket-соединениями и маршрутизирует сообщения.
 */

import { WebSocketServer } from 'ws';
import { RoomManager } from './roomManager.js';
import { loadEnv } from '../lib/config/env.js';
import { getMessagingProviderStatuses } from './integrations/configStatus.js';

const env = loadEnv();
const PORT = env.PORT;
const wss = new WebSocketServer({ port: PORT });
const roomManager = new RoomManager(wss);

console.log(`🚀 WebSocket-сервер "Монополия Россия" запущен на порту ${PORT}`);
console.log('⚙️ Messaging provider status:', getMessagingProviderStatuses(env));

wss.on('connection', (ws) => {
    // Инициализируем состояние для нового подключения
    ws.isAlive = true;
    ws.id = null; // ID игрока будет установлен после аутентификации
    ws.roomId = null; // ID комнаты, в которой находится игрок

    console.log('🔌 Клиент подключился.');

    // Обработчик ответа на ping от сервера
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Обработчик входящих сообщений
    ws.on('message', (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage);
            handleMessage(ws, message);
        } catch (e) {
            console.error('❌ Ошибка парсинга JSON:', rawMessage.toString());
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Неверный формат сообщения.' } }));
        }
    });

    // Обработчик закрытия соединения
    ws.on('close', () => {
        console.log(`🔌 Клиент ${ws.id || ''} отключился.`);
        roomManager.handleDisconnect(ws);
    });

    // Обработчик ошибок
    ws.on('error', (error) => {
        console.error(`❌ WebSocket ошибка у клиента ${ws.id || ''}:`, error);
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
        console.warn('⚠️ Попытка отправить сообщение без аутентификации. Тип:', type);
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
            console.log(`✅ Игрок ${ws.id} аутентифицирован.`);
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

        default:
            // Если это сообщение для конкретной комнаты (например, start_game или player_action)
            if (ws.roomId) {
                roomManager.routeMessageToRoom(ws, message);
            } else {
                console.warn(`⚠️ Неизвестный тип сообщения от ${ws.id}: ${type}`);
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
            console.log(`🔌 Завершение "мертвого" соединения с клиентом ${ws.id || '(не аутентифицирован)'}.`);
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Проверка каждые 30 секунд

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});
