/**
 * Модуль управления пользовательским интерфейсом
 * Обеспечивает отображение игрового состояния и взаимодействие с пользователем
 */

import { getText } from './localization.js';
import { showToast } from './ui-utils.js';
import eventBus from './event-bus.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.currentScreen = 'main-menu';
        this.modals = new Map();
        this.tooltips = new Map();
        
        this.initializeUI();
        this.setupEventListeners();
    }

    /**
     * Инициализирует пользовательский интерфейс
     */
    initializeUI() {
        this.cacheElements();
        this.setupModals();
        this.setupTooltips();
    }

    /**
     * Кэширует DOM элементы
     */
    cacheElements() {
        this.elements = {
            gameContainer: document.getElementById('game-container'),
            board: document.getElementById('board'),
            playersPanel: document.getElementById('players-panel'),
            currentPlayer: document.querySelector('.current-player'),
            chat: document.getElementById('chat'),
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            sendMessageBtn: document.getElementById('send-message-btn'),
            saveLoadControls: document.getElementById('save-load-controls'),
            achievementsPanel: document.getElementById('achievements-panel'),
            actionsPanel: document.getElementById('actions-panel'),
            weatherIndicator: document.getElementById('current-weather'),
            eventsIndicator: document.getElementById('current-events')
        };
    }

    /**
     * Настраивает модальные окна
     */
    setupModals() {
        // Модальное окно для карточек
        this.modals.set('card', {
            element: document.getElementById('card-modal'),
            title: document.getElementById('card-title'),
            text: document.getElementById('card-text')
        });

        // Модальное окно для покупки
        this.modals.set('purchase', {
            element: document.getElementById('modal-overlay'),
            title: document.getElementById('modal-title'),
            content: document.getElementById('modal-content'),
            confirm: document.getElementById('modal-confirm'),
            cancel: document.getElementById('modal-cancel')
        });

        // Модальное окно аукциона
        this.modals.set('auction', {
            element: document.getElementById('auction-modal'),
            property: document.getElementById('auction-property'),
            currentBid: document.getElementById('current-bid-amount'),
            currentBidder: document.getElementById('current-bidder'),
            time: document.getElementById('auction-time'),
            bidInput: document.getElementById('bid-amount'),
            placeBid: document.getElementById('place-bid-btn'),
            passBid: document.getElementById('pass-bid-btn')
        });
    }

    /**
     * Настраивает подсказки
     */
    setupTooltips() {
        // Подсказки для свойств
        const propertyCells = document.querySelectorAll('.property-cell');
        propertyCells.forEach(cell => {
            this.setupPropertyTooltip(cell);
        });
    }

    /**
     * Настраивает подсказку для свойства
     * @param {HTMLElement} cell - элемент клетки
     */
    setupPropertyTooltip(cell) {
        const position = parseInt(cell.dataset.position);
        if (isNaN(position)) return;

        cell.addEventListener('mouseenter', () => {
            this.showPropertyTooltip(cell, position);
        });

        cell.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    /**
     * Показывает подсказку для свойства
     * @param {HTMLElement} cell - элемент клетки
     * @param {number} position - позиция свойства
     */
    showPropertyTooltip(cell, position) {
        // Реализация показа подсказки
        console.log(`Показываем подсказку для свойства на позиции ${position}`);
    }

    /**
     * Скрывает подсказку
     */
    hideTooltip() {
        // Реализация скрытия подсказки
        console.log('Скрываем подсказку');
    }

    /**
     * Настраивает слушатели событий
     */
    setupEventListeners() {
        // События чата
        if (this.elements.sendMessageBtn) {
            this.elements.sendMessageBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
        }

        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }

        // События модальных окон
        eventBus.on('showPurchaseDialogRequest', (data) => this.showPurchaseDialog(data));

        // Общие обработчики
        this.setupModalEventListeners();
    }

    /**
     * Настраивает слушатели событий для модальных окон
     */
    setupModalEventListeners() {
        // Закрытие модальных окон по клику вне их области
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Отправляет сообщение в чат
     */
    sendChatMessage() {
        const input = this.elements.chatInput;
        const message = input.value.trim();
        
        if (message) {
            eventBus.emit('chatMessage', {
                sender: 'player',
                message: message
            });
            input.value = '';
        }
    }

    /**
     * Обновляет отображение игрового поля
     */
    updateBoard() {
        // Обновление игрового поля
        eventBus.emit('boardUpdateRequest');
    }

    /**
     * Обновляет отображение игроков
     */
    updatePlayers() {
        // Обновление панели игроков
        eventBus.emit('playersUpdateRequest');
    }

    /**
     * Обновляет отображение текущего игрока
     */
    updateCurrentPlayer() {
        // Обновление информации о текущем игроке
        eventBus.emit('currentPlayerUpdateRequest');
    }

    /**
     * Показывает модальное окно
     * @param {string} modalId - ID модального окна
     * @param {Object} data - данные для отображения
     */
    showModal(modalId, data = {}) {
        const modal = this.modals.get(modalId);
        if (modal && modal.element) {
            modal.element.classList.add('active');
            
            // Заполняем данными
            if (data.title && modal.title) {
                modal.title.textContent = data.title;
            }
            if (data.text && modal.text) {
                modal.text.textContent = data.text;
            }
            if (data.content && modal.content) {
                modal.content.innerHTML = data.content;
            }
        }
    }

    /**
     * Закрывает модальное окно
     * @param {string} modalId - ID модального окна
     */
    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal && modal.element) {
            modal.element.classList.remove('active');
        }
    }

    /**
     * Закрывает все модальные окна
     */
    closeAllModals() {
        this.modals.forEach(modal => {
            if (modal.element) {
                modal.element.classList.remove('active');
            }
        });
    }

    /**
     * Показывает диалог покупки/аукциона для недвижимости.
     * @param {object} data - { player, cell }
     */
    showPurchaseDialog({ player, cell }) {
        const modal = this.modals.get('purchase');
        if (!modal || !modal.element) return;

        // Заполняем контент модального окна
        modal.title.textContent = getText('PURCHASE.TITLE', { property: cell.name });
        modal.content.innerHTML = `
            <p>${getText('PURCHASE.QUESTION', { price: cell.price })}</p>
            <div class="property-card-preview" style="border-left-color: ${cell.color || '#ccc'};">
                 <h4>${cell.name}</h4>
                 <p>${getText('PURCHASE.PRICE')}: ${cell.price}₽</p>
            </div>
        `;

        // Обновляем текст кнопок
        modal.confirm.textContent = getText('PURCHASE.BUY');
        modal.cancel.textContent = getText('PURCHASE.AUCTION');

        // --- Обработчики событий ---
        // Используем cloneNode для удаления старых слушателей
        const newConfirmBtn = modal.confirm.cloneNode(true);
        modal.confirm.parentNode.replaceChild(newConfirmBtn, modal.confirm);
        modal.confirm = newConfirmBtn;

        const newCancelBtn = modal.cancel.cloneNode(true);
        modal.cancel.parentNode.replaceChild(newCancelBtn, modal.cancel);
        modal.cancel = newCancelBtn;

        const handleBuy = () => {
            eventBus.emit('buyPropertyRequest', { player, cell });
            this.closeModal('purchase');
        };

        const handleAuction = () => {
            eventBus.emit('auctionPropertyRequest', { cell });
            this.closeModal('purchase');
        };

        modal.confirm.addEventListener('click', handleBuy);
        modal.cancel.addEventListener('click', handleAuction);

        this.showModal('purchase');
    }

    /**
     * Показывает уведомление
     * @param {string} message - сообщение
     * @param {string} type - тип уведомления
     * @param {number} duration - длительность
     */
    showNotification(message, type = 'info', duration = 3000) {
        showToast(message, type, duration);
    }

    /**
     * Обновляет отображение погоды
     * @param {string} weather - тип погоды
     */
    updateWeather(weather) {
        if (this.elements.weatherIndicator) {
            this.elements.weatherIndicator.textContent = getText(`WEATHER.${weather.toUpperCase()}`);
            this.elements.weatherIndicator.className = `weather-indicator weather-${weather}`;
        }
    }

    /**
     * Обновляет отображение событий
     * @param {Object} event - событие
     */
    updateEvents(event) {
        if (this.elements.eventsIndicator) {
            if (event) {
                this.elements.eventsIndicator.textContent = event.name;
                this.elements.eventsIndicator.className = `event-indicator event-${event.type}`;
            } else {
                this.elements.eventsIndicator.textContent = '';
                this.elements.eventsIndicator.className = 'event-indicator';
            }
        }
    }

    /**
     * Переключает экран
     * @param {string} screenId - ID экрана
     */
    switchScreen(screenId) {
        // Скрываем текущий экран
        const currentScreen = document.querySelector(`.screen.active`);
        if (currentScreen) {
            currentScreen.classList.remove('active');
        }

        // Показываем новый экран
        const newScreen = document.getElementById(screenId);
        if (newScreen) {
            newScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    /**
     * Обновляет весь интерфейс
     */
    updateUI() {
        this.updateBoard();
        this.updatePlayers();
        this.updateCurrentPlayer();
    }
}

// Создаем глобальный экземпляр UI менеджера
const ui = new UIManager();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
} 

// Если функция renderBoard не используется внутри ui.js, удаляю её определение. 