/**
 * Модуль управления чатом
 * Обеспечивает обмен сообщениями между игроками
 */

import { getText } from './localization.js';
import { showToast } from './ui-utils.js';
import eventBus from './event-bus.js';

class ChatManager {
    constructor() {
        this.messages = [];
        this.maxMessages = 100;
        this.isEnabled = true;
        this.filters = {
            profanity: true,
            spam: true,
            links: false
        };
        
        this.setupEventListeners();
    }

    /**
     * Настраивает слушатели событий
     */
    setupEventListeners() {
        eventBus.on('chatMessage', (data) => this.handleMessage(data));
        eventBus.on('playerJoined', (data) => this.addSystemMessage(getText('MESSAGES.PLAYER_JOINED', { player: data.player.name })));
        eventBus.on('playerLeft', (data) => this.addSystemMessage(getText('MESSAGES.PLAYER_LEFT', { player: data.player.name })));
        eventBus.on('gameStarted', () => this.addSystemMessage(getText('MESSAGES.GAME_STARTED')));
        eventBus.on('gameEnded', (data) => this.addSystemMessage(getText('MESSAGES.GAME_ENDED', { winner: data.winner?.name || 'Никто' })));
    }

    /**
     * Обрабатывает входящее сообщение
     * @param {Object} data - данные сообщения
     */
    handleMessage(data) {
        if (!this.isEnabled) return;

        const { sender, message, type = 'chat' } = data;

        // Фильтрация сообщения
        if (!this.filterMessage(message)) {
            return;
        }

        // Добавляем сообщение
        const chatMessage = {
            id: Date.now() + Math.random(),
            sender: sender,
            message: message,
            type: type,
            timestamp: new Date().toISOString()
        };

        this.addMessage(chatMessage);

        // Отправляем событие об обновлении чата
        eventBus.emit('chatUpdated', this.messages);
    }

    /**
     * Фильтрует сообщение
     * @param {string} message - сообщение
     * @returns {boolean} true если сообщение прошло фильтр
     */
    filterMessage(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }

        // Проверка на спам
        if (this.filters.spam && this.isSpam(message)) {
            showToast('Сообщение заблокировано как спам', 'warning');
            return false;
        }

        // Проверка на нецензурную лексику
        if (this.filters.profanity && this.containsProfanity(message)) {
            showToast('Сообщение заблокировано из-за нецензурной лексики', 'warning');
            return false;
        }

        // Проверка на ссылки
        if (this.filters.links && this.containsLinks(message)) {
            showToast('Ссылки запрещены в чате', 'warning');
            return false;
        }

        return true;
    }

    /**
     * Проверяет, является ли сообщение спамом
     * @param {string} message - сообщение
     * @returns {boolean} true если это спам
     */
    isSpam(message) {
        // Простая проверка на повторяющиеся символы
        const repeatedChars = /(.)\1{4,}/;
        return repeatedChars.test(message);
    }

    /**
     * Проверяет, содержит ли сообщение нецензурную лексику
     * @param {string} message - сообщение
     * @returns {boolean} true если содержит нецензурную лексику
     */
    containsProfanity(message) {
        // Простой список запрещенных слов (можно расширить)
        const profanityList = ['badword1', 'badword2', 'badword3'];
        const lowerMessage = message.toLowerCase();
        
        return profanityList.some(word => lowerMessage.includes(word));
    }

    /**
     * Проверяет, содержит ли сообщение ссылки
     * @param {string} message - сообщение
     * @returns {boolean} true если содержит ссылки
     */
    containsLinks(message) {
        const urlPattern = /https?:\/\/[^\s]+/g;
        return urlPattern.test(message);
    }

    /**
     * Добавляет сообщение в чат
     * @param {Object} chatMessage - сообщение чата
     */
    addMessage(chatMessage) {
        this.messages.push(chatMessage);

        // Ограничиваем количество сообщений
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // Обновляем отображение
        this.updateDisplay();
    }

    /**
     * Добавляет системное сообщение
     * @param {string} message - сообщение
     */
    addSystemMessage(message) {
        this.addMessage({
            id: Date.now() + Math.random(),
            sender: 'system',
            message: message,
            type: 'system',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Обновляет отображение чата
     */
    updateDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        chatMessages.innerHTML = this.messages.map(msg => this.formatMessage(msg)).join('');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Форматирует сообщение для отображения
     * @param {Object} message - сообщение
     * @returns {string} HTML строка
     */
    formatMessage(message) {
        const time = new Date(message.timestamp).toLocaleTimeString();
        const senderClass = message.sender === 'system' ? 'system-message' : 'player-message';
        const senderName = message.sender === 'system' ? 'Система' : message.sender;

        return `
            <div class="chat-message ${senderClass}">
                <span class="message-time">[${time}]</span>
                <span class="message-sender">${senderName}:</span>
                <span class="message-text">${this.escapeHtml(message.message)}</span>
            </div>
        `;
    }

    /**
     * Экранирует HTML
     * @param {string} text - текст
     * @returns {string} экранированный текст
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Отправляет сообщение
     * @param {string} message - сообщение
     */
    sendMessage(message) {
        if (!this.isEnabled) {
            showToast('Чат отключен', 'warning');
            return;
        }

        eventBus.emit('chatMessage', {
            sender: 'player',
            message: message,
            type: 'chat'
        });
    }

    /**
     * Очищает чат
     */
    clearChat() {
        this.messages = [];
        this.updateDisplay();
    }

    /**
     * Включает/выключает чат
     * @param {boolean} enabled - включен ли чат
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        eventBus.emit('chatToggled', { enabled });
    }

    /**
     * Получает сообщения чата
     * @returns {Array} сообщения
     */
    getMessages() {
        return [...this.messages];
    }

    /**
     * Получает последние сообщения
     * @param {number} count - количество сообщений
     * @returns {Array} последние сообщения
     */
    getRecentMessages(count = 10) {
        return this.messages.slice(-count);
    }

    /**
     * Ищет сообщения
     * @param {string} query - поисковый запрос
     * @returns {Array} найденные сообщения
     */
    searchMessages(query) {
        if (!query) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.messages.filter(msg => 
            msg.message.toLowerCase().includes(lowerQuery) ||
            msg.sender.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Экспортирует историю чата
     * @returns {string} JSON строка
     */
    exportHistory() {
        return JSON.stringify(this.messages, null, 2);
    }

    /**
     * Импортирует историю чата
     * @param {string} history - JSON строка
     */
    importHistory(history) {
        try {
            const messages = JSON.parse(history);
            if (Array.isArray(messages)) {
                this.messages = messages.slice(-this.maxMessages);
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Ошибка импорта истории чата:', error);
            showToast('Ошибка импорта истории чата', 'error');
        }
    }
}

// Создаем глобальный экземпляр чат менеджера
const chat = new ChatManager();

// Экспорт для использования в других модулях
export { ChatManager, chat };

// Делаем доступным глобально
window.chat = chat;
