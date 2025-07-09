/**
 * Модуль пользовательского интерфейса
 * Управляет переключением экранов, обработкой событий и анимациями
 */

import { getText } from './localization.js';
import { formatMoney, generateId } from './utils.js';
import { saveToStorage, loadFromStorage } from './storage.js';
import { randomChoice, rollDice } from './random.js';
// Временные заглушки для отсутствующих функций
const escapeHTML = (str) => String(str).replace(/[&<>"]'/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
const showToast = (msg) => alert(msg);
const passedStart = (oldPos, newPos) => newPos < oldPos;

class UI {
    constructor() {
        this.currentScreen = 'main-menu';
        this.screens = {};
        this.eventListeners = [];
        
        this.initializeUI();
    }

    /**
     * Инициализирует пользовательский интерфейс
     */
    initializeUI() {
        this.initializeScreens();
        this.initializeEventListeners();
        this.initializeModals();
        this.initializeAnimations();
        this.addDebugTestButtons();
    }

    /**
     * Инициализирует экраны
     */
    initializeScreens() {
        this.screens = {
            'main-menu': document.getElementById('main-menu'),
            'settings-screen': document.getElementById('settings-screen'),
            'game-screen': document.getElementById('game-screen')
        };
    }

    /**
     * Инициализирует обработчики событий
     */
    initializeEventListeners() {
        // Главное меню
        this.addEventListener('#new-game-btn', 'click', () => {
            this.showScreen('settings-screen');
        });

        this.addEventListener('#join-game-btn', 'click', () => {
            this.showJoinGameDialog();
        });

        this.addEventListener('#settings-btn', 'click', () => {
            this.showScreen('settings-screen');
        });

        this.addEventListener('#rules-btn', 'click', () => {
            this.showRulesDialog();
        });

        // Новые кнопки главного меню
        this.addEventListener('#achievements-btn', 'click', () => {
            this.showAchievementsModal();
        });
        this.addEventListener('#statistics-btn', 'click', () => {
            this.showStatisticsModal();
        });
        this.addEventListener('#tournaments-btn', 'click', () => {
            this.showTournamentsModal();
        });

        // Настройки
        this.addEventListener('#back-to-menu', 'click', () => {
            this.showScreen('main-menu');
        });

        this.addEventListener('#start-game', 'click', () => {
            this.startGame();
        });

        // Игровые кнопки
        this.addEventListener('#dice-btn', 'click', () => {
            this.rollDice();
        });

        this.addEventListener('#end-turn-btn', 'click', () => {
            this.endTurn();
        });

        // Кнопки действий
        this.addEventListener('#trade-btn', 'click', () => {
            this.showTradeDialog();
        });

        this.addEventListener('#mortgage-btn', 'click', () => {
            this.showMortgageDialog();
        });

        this.addEventListener('#build-btn', 'click', () => {
            this.showBuildDialog();
        });

        this.addEventListener('#auction-btn', 'click', () => {
            this.showAuctionDialog();
        });

        // Выбор токенов
        this.initializeTokenSelection();

        // Выбор количества игроков
        this.initializePlayerCountSelection();

        // Настройки правил
        this.initializeRuleSettings();

        // Модальные окна
        this.initializeModalHandlers();

        // Карточки
        this.addEventListener('#card-ok', 'click', () => {
            this.hideCardModal();
        });

        // Язык
        this.addEventListener('#language-select', 'change', (e) => {
            this.changeLanguage(e.target.value);
        });

        // Новые кнопки игрового экрана (top-panel)
        this.addEventListener('#achievements-game-btn', 'click', () => {
            this.showAchievementsModal();
        });
        this.addEventListener('#statistics-game-btn', 'click', () => {
            this.showStatisticsModal();
        });
        this.addEventListener('#tournaments-game-btn', 'click', () => {
            this.showTournamentsModal();
        });
    }

    /**
     * Инициализирует выбор токенов
     */
    initializeTokenSelection() {
        const tokenOptions = document.querySelectorAll('.token-option');
        tokenOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Убираем выделение с других токенов
                tokenOptions.forEach(opt => opt.classList.remove('selected'));
                // Выделяем выбранный токен
                option.classList.add('selected');
            });
        });
    }

    /**
     * Инициализирует выбор количества игроков
     */
    initializePlayerCountSelection() {
        const playerCountSelect = document.getElementById('player-count');
        if (playerCountSelect) {
            playerCountSelect.addEventListener('change', (e) => {
                this.updatePlayerCount(parseInt(e.target.value));
            });
        }
    }

    /**
     * Инициализирует настройки правил
     */
    initializeRuleSettings() {
        const ruleCheckboxes = document.querySelectorAll('.rule-options input[type="checkbox"]');
        ruleCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateRuleSettings();
            });
        });
    }

    /**
     * Инициализирует обработчики модальных окон
     */
    initializeModalHandlers() {
        // Закрытие модальных окон
        const modalOverlays = document.querySelectorAll('.modal-overlay');
        modalOverlays.forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal(overlay);
                }
            });
        });

        // Кнопки закрытия
        const closeButtons = document.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal-overlay');
                this.hideModal(modal);
            });
        });

        // Кнопки отмены
        const cancelButtons = document.querySelectorAll('#modal-cancel');
        cancelButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal-overlay');
                this.hideModal(modal);
            });
        });
    }

    /**
     * Инициализирует модальные окна
     */
    initializeModals() {
        // Создаем модальные окна динамически если их нет
        if (!document.getElementById('modal-overlay')) {
            this.createModalOverlay();
        }
    }

    /**
     * Создает модальное окно
     */
    createModalOverlay() {
        const modalHTML = `
            <div id="modal-overlay" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="modal-title">Заголовок</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-content" id="modal-content">
                        <!-- Содержимое модального окна -->
                    </div>
                    <div class="modal-footer">
                        <button id="modal-cancel" class="btn secondary">Отмена</button>
                        <button id="modal-confirm" class="btn primary">Подтвердить</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Инициализирует анимации
     */
    initializeAnimations() {
        // Анимации для кнопок
        const buttons = document.querySelectorAll('.btn, .menu-btn');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px) scale(1.02)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = '';
            });
        });

        // Анимации для клеток
        const cells = document.querySelectorAll('.corner-cell, .property-cell, .chance-cell, .treasure-cell, .tax-cell');
        cells.forEach(cell => {
            cell.addEventListener('mouseenter', () => {
                cell.style.transform = 'scale(1.05)';
                cell.style.zIndex = '5';
            });
            
            cell.addEventListener('mouseleave', () => {
                cell.style.transform = '';
                cell.style.zIndex = '';
            });
        });
    }

    /**
     * Добавляет обработчик события
     * @param {string} selector - селектор элемента
     * @param {string} event - тип события
     * @param {Function} handler - обработчик
     */
    addEventListener(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * Показывает экран
     * @param {string} screenName - название экрана
     */
    showScreen(screenName) {
        // Скрываем все экраны
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
                screen.classList.add('fade-out');
            }
        });

        // Показываем нужный экран
        const targetScreen = this.screens[screenName];
        if (targetScreen) {
            setTimeout(() => {
                Object.values(this.screens).forEach(screen => {
                    if (screen) {
                        screen.classList.remove('fade-out');
                    }
                });
                targetScreen.classList.add('active');
                this.currentScreen = screenName;
            }, 300);
        }
    }

    /**
     * Показывает модальное окно
     * @param {string} title - заголовок
     * @param {string} content - содержимое
     * @param {Function} onConfirm - обработчик подтверждения
     * @param {Function} onCancel - обработчик отмены
     */
    showModal(title, content, onConfirm = null, onCancel = null) {
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        if (modal && modalTitle && modalContent) {
            modalTitle.textContent = title;
            modalContent.innerHTML = content;
            modal.classList.remove('hidden');
            modal.classList.add('fade-in');
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay) {
                modalOverlay.classList.add('fade-in');
            }

            // Очищаем предыдущие обработчики
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // Добавляем новые обработчики
            if (onConfirm) {
                newConfirmBtn.addEventListener('click', () => {
                    onConfirm();
                    this.hideModal(modal);
                });
            }

            if (onCancel) {
                newCancelBtn.addEventListener('click', () => {
                    onCancel();
                    this.hideModal(modal);
                });
            }
        }
    }

    /**
     * Скрывает модальное окно
     * @param {Element} modal - модальное окно
     */
    hideModal(modal) {
        if (!modal) return;
        const overlay = modal.closest('.modal-overlay');
        modal.classList.remove('fade-in');
        modal.classList.add('fade-out');
        if (overlay) {
            overlay.classList.remove('fade-in');
            overlay.classList.add('fade-out');
        }
        setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
        }, 350);
    }

    /**
     * Показывает карточку
     * @param {string} title - заголовок карточки
     * @param {string} text - текст карточки
     */
    showCard(title, text) {
        const cardModal = document.getElementById('card-modal');
        const cardTitle = document.getElementById('card-title');
        const cardText = document.getElementById('card-text');

        if (cardModal && cardTitle && cardText) {
            cardTitle.textContent = title;
            cardText.textContent = text;
            cardModal.classList.remove('hidden');
            cardModal.classList.add('fade-in');
        }
    }

    /**
     * Скрывает карточку
     */
    hideCardModal() {
        const cardModal = document.querySelector('.card-modal');
        if (!cardModal) return;
        cardModal.classList.remove('fade-in');
        cardModal.classList.add('fade-out');
        setTimeout(() => {
            if (cardModal.parentNode) cardModal.parentNode.removeChild(cardModal);
        }, 350);
    }

    /**
     * Показывает уведомление
     * @param {string} message - сообщение
     * @param {string} type - тип уведомления
     * @param {number} duration - длительность
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            inset-block-start: 20px;
            inset-block-start: 20px;
            inset-inline-end: 20px;
            inset-inline-end: 20px;
            padding: 15px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-inline-size: 300px;
            max-inline-size: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    /**
     * Обновляет количество игроков
     * @param {number} count - количество игроков
     */
    updatePlayerCount(count) {
        // Обновляем отображение игроков в настройках
        const playerList = document.querySelector('.player-list');
        if (playerList) {
            playerList.innerHTML = '';
            
            for (let i = 0; i < count; i++) {
                const playerItem = document.createElement('div');
                playerItem.className = 'player-item';
                playerItem.setAttribute('data-player', i + 1);
                playerItem.innerHTML = `
                    <img src="assets/tokens/matryoshka.png" alt="Токен" class="player-token">
                    <div class="player-details">
                        <span class="player-name">Игрок ${i + 1}</span>
                        <span class="player-money">2000₽</span>
                    </div>
                `;
                playerList.appendChild(playerItem);
            }
        }
    }

    /**
     * Обновляет настройки правил
     */
    updateRuleSettings() {
        const settings = {
            auctionsEnabled: document.getElementById('auctions-enabled')?.checked || false,
            weatherEnabled: document.getElementById('weather-enabled')?.checked || false,
            economicEventsEnabled: document.getElementById('economic-events-enabled')?.checked || false,
            culturalEventsEnabled: document.getElementById('cultural-events-enabled')?.checked || false
        };
        
        // Сохраняем настройки
        saveToStorage('game_settings', settings);
    }

    /**
     * Меняет язык
     * @param {string} language - код языка
     */
    changeLanguage(language) {
        // utils.setLocale(language); // utils.setLocale не существует
        
        // Обновляем все тексты на странице
        this.updateAllTexts();
        
        // Сохраняем выбор языка
        saveToStorage('language', language);
    }

    /**
     * Обновляет все тексты на странице
     */
    updateAllTexts() {
        // Обновляем заголовки
        const gameTitle = document.querySelector('.game-title');
        if (gameTitle) {
            gameTitle.textContent = 'Русская Монополия';
        }

        // Обновляем кнопки
        const buttons = document.querySelectorAll('.menu-btn, .btn');
        buttons.forEach(button => {
            const key = button.getAttribute('data-text-key');
            if (key) {
                button.textContent = getText(key);
            }
        });

        // Обновляем другие элементы
        this.updateGameTexts();
    }

    /**
     * Обновляет игровые тексты
     */
    updateGameTexts() {
        // Обновляем названия клеток
        const cells = document.querySelectorAll('.cell-content h3');
        cells.forEach(cell => {
            const position = cell.closest('[data-position]')?.getAttribute('data-position');
            if (position) {
                const cellData = board.getCell(parseInt(position));
                if (cellData) {
                    cell.textContent = cellData.name;
                }
            }
        });

        // Обновляем цены
        const prices = document.querySelectorAll('.price');
        prices.forEach(price => {
            const position = price.closest('[data-position]')?.getAttribute('data-position');
            if (position) {
                const cellData = board.getCell(parseInt(position));
                if (cellData && cellData.price > 0) {
                    price.textContent = formatMoney(cellData.price);
                }
            }
        });
    }

    /**
     * Бросает кости
     */
    rollDice() {
        const diceBtn = document.getElementById('dice-btn');
        if (diceBtn) {
            diceBtn.classList.add('rolling');
            diceBtn.disabled = true;
        }
        // Виброотклик и звук (если поддерживается)
        if (window.navigator && navigator.vibrate) {
            navigator.vibrate(80);
        }
        if (window.Audio) {
            try {
                const audio = new Audio('assets/sounds/dice.mp3');
                audio.volume = 0.5;
                audio.play();
            } catch (e) {}
        }
        // Анимация броска кубиков
        let diceResultBlock = document.querySelector('.dice-result');
        if (diceResultBlock) {
            diceResultBlock.classList.remove('visible');
            diceResultBlock.classList.add('dice-rolling');
        }
        setTimeout(() => {
            const result = game.rollDice();
            this.showDiceResult(result);
            if (diceBtn) {
                diceBtn.classList.remove('rolling');
                diceBtn.disabled = false;
            }
            if (diceResultBlock) {
                diceResultBlock.classList.remove('dice-rolling');
                diceResultBlock.classList.add('visible');
            }
        }, 700);
    }

    /**
     * Показывает результат броска костей
     * @param {Object} result - результат броска
     */
    showDiceResult(result) {
        let diceResultBlock = document.querySelector('.dice-result');
        if (!diceResultBlock) {
            diceResultBlock = document.createElement('div');
            diceResultBlock.className = 'dice-result';
            document.body.appendChild(diceResultBlock);
        }
        diceResultBlock.innerHTML = `
            <div class="dice-numbers">
                <span class="dice">${result.dice1}</span>
                <span class="dice">${result.dice2}</span>
            </div>
        `;
        // Плавное появление результата
        setTimeout(() => {
            diceResultBlock.classList.add('visible');
        }, 50);
    }

    /**
     * Завершает ход
     */
    endTurn() {
        game.nextPlayer();
        this.updateGameUI();
    }

    /**
     * Показывает диалог присоединения к игре
     */
    showJoinGameDialog() {
        const content = `
            <div class="join-game-form">
                <div class="form-group">
                    <label for="game-code">Код игры:</label>
                    <input type="text" id="game-code" placeholder="Введите код игры">
                </div>
                <div class="form-group">
                    <label for="player-name">Ваше имя:</label>
                    <input type="text" id="player-name" placeholder="Введите ваше имя">
                </div>
            </div>
        `;
        
        this.showModal('Присоединиться к игре', content, () => {
            const gameCode = document.getElementById('game-code')?.value;
            const playerName = document.getElementById('player-name')?.value;
            
            if (gameCode && playerName) {
                this.joinGame(gameCode, playerName);
            }
        });
    }

    /**
     * Присоединяется к игре
     * @param {string} gameCode - код игры
     * @param {string} playerName - имя игрока
     */
    joinGame(gameCode, playerName) {
        // Здесь будет логика присоединения к онлайн-игре
        this.showNotification('Функция присоединения к игре будет доступна в следующей версии', 'info');
    }

    /**
     * Показывает диалог правил
     */
    showRulesDialog() {
        const content = `
            <div class="rules-content">
                <h3>Правила игры</h3>
                <div class="rules-section">
                    <h4>Цель игры</h4>
                    <p>Стать самым богатым игроком, покупая недвижимость и собирая арендную плату.</p>
                </div>
                <div class="rules-section">
                    <h4>Ход игры</h4>
                    <ul>
                        <li>Бросьте кости и переместите фишку</li>
                        <li>Покупайте свободные участки</li>
                        <li>Платите аренду за чужие участки</li>
                        <li>Стройте улучшения и резиденции</li>
                    </ul>
                </div>
                <div class="rules-section">
                    <h4>Особенности</h4>
                    <ul>
                        <li>Резиденции удваивают арендную плату</li>
                        <li>Погода влияет на доходность</li>
                        <li>Экономические события изменяют цены</li>
                        <li>Культурные события дают бонусы</li>
                    </ul>
                </div>
            </div>
        `;
        
        this.showModal('Правила игры', content);
    }

    /**
     * Показывает диалог торговли
     */
    showTradeDialog() {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const content = `
            <div class="trade-dialog">
                <h3>Торговля</h3>
                <p>Выберите игрока для торговли и предложите обмен.</p>
                <div class="trade-form">
                    <select id="trade-partner">
                        ${game.players.filter(p => p.id !== currentPlayer.id && !p.bankrupt)
                            .map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        
        this.showModal('Торговля', content, () => {
            this.showNotification('Функция торговли будет доступна в следующей версии', 'info');
        });
    }

    /**
     * Показывает диалог залога
     */
    showMortgageDialog() {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const mortgagedProperties = currentPlayer.getMortgagedProperties();
        const unmortgagedProperties = currentPlayer.getUnmortgagedProperties();
        
        const content = `
            <div class="mortgage-dialog">
                <h3>Залог недвижимости</h3>
                <div class="mortgage-options">
                    <div class="mortgage-section">
                        <h4>Заложить недвижимость</h4>
                        ${unmortgagedProperties.map(pos => {
                            const cell = board.getCell(pos);
                            return `<div class="property-option">
                                <input type="radio" name="mortgage" value="${pos}">
                                <label>${cell.name} - ${formatMoney(cell.price / 2)}</label>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="mortgage-section">
                        <h4>Выкупить из залога</h4>
                        ${mortgagedProperties.map(pos => {
                            const cell = board.getCell(pos);
                            return `<div class="property-option">
                                <input type="radio" name="unmortgage" value="${pos}">
                                <label>${cell.name} - ${formatMoney(cell.price / 2 * 1.1)}</label>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        this.showModal('Залог недвижимости', content, () => {
            this.showNotification('Функция залога будет доступна в следующей версии', 'info');
        });
    }

    /**
     * Показывает диалог строительства
     */
    showBuildDialog() {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const buildableProperties = currentPlayer.properties.filter(pos => {
            const cell = board.getCell(pos);
            return cell && !cell.mortgaged && board.hasColorMonopoly(cell.color, currentPlayer.id);
        });
        
        const content = `
            <div class="build-dialog">
                <h3>Строительство</h3>
                <div class="build-options">
                    ${buildableProperties.map(pos => {
                        const cell = board.getCell(pos);
                        return `<div class="build-option">
                            <h4>${cell.name}</h4>
                            <p>Улучшения: ${cell.improvements}/${CONFIG.IMPROVEMENT.MAX_LEVEL}</p>
                            <p>Стоимость улучшения: ${formatMoney(CONFIG.IMPROVEMENT.COST_PER_LEVEL)}</p>
                            <button onclick="ui.buildImprovement(${pos})" ${cell.improvements >= CONFIG.IMPROVEMENT.MAX_LEVEL ? 'disabled' : ''}>
                                Добавить улучшение
                            </button>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
        
        this.showModal('Строительство', content);
    }

    /**
     * Добавляет улучшение
     * @param {number} position - позиция свойства
     */
    buildImprovement(position) {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer && currentPlayer.addImprovement(position)) {
            this.showNotification('Улучшение добавлено!', 'success');
            this.updateGameUI();
        } else {
            this.showNotification('Не удалось добавить улучшение', 'error');
        }
    }

    /**
     * Показывает диалог аукциона
     */
    showAuctionDialog() {
        const content = `
            <div class="auction-dialog">
                <h3>Аукционы</h3>
                <p>Здесь будут отображаться активные аукционы.</p>
                <p>В данный момент нет активных аукционов.</p>
            </div>
        `;
        
        this.showModal('Аукционы', content);
    }

    /**
     * Начинает игру
     */
    startGame() {
        // Получаем настройки
        const playerCount = parseInt(document.getElementById('player-count')?.value || 4);
        const selectedTokens = document.querySelectorAll('.token-option.selected');
        
        if (selectedTokens.length !== playerCount) {
            this.showNotification('Выберите токены для всех игроков', 'error');
            return;
        }
        
        // Создаем данные игроков
        const playerData = [];
        for (let i = 0; i < playerCount; i++) {
            const token = selectedTokens[i]?.getAttribute('data-token') || 'matryoshka';
            playerData.push({
                id: i + 1,
                name: `Игрок ${i + 1}`,
                token: `assets/tokens/${token}.png`
            });
        }
        
        // Начинаем игру
        game.startNewGame(playerData);
        this.showScreen('game-screen');
        this.updateGameUI();
    }

    /**
     * Обновляет игровой интерфейс
     */
    updateGameUI() {
        // Обновляем отображение игроков
        game.players.forEach(player => {
            player.updateMoneyDisplay();
            player.updateTokenPosition();
        });
        
        // Обновляем отображение текущего игрока
        game.updateCurrentPlayerDisplay();
        
        // Обновляем отображение погоды
        game.updateWeatherDisplay();
        
        // Обновляем отображение событий
        game.updateEventsDisplay();
        
        // Обновляем отображение чата
        game.updateChatDisplay();
    }

    /**
     * Очищает все обработчики событий
     */
    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    /**
     * Показывает модальное окно достижений
     */
    showAchievementsModal() {
        try {
            if (!achievements) {
                this.showNotification('Система достижений не инициализирована', 'error');
                return;
            }
            const player = game?.players?.[game.currentPlayerIndex];
            let playerAchievements = player ? achievements.getPlayerAchievements(player) : [];
            if (!Array.isArray(playerAchievements)) throw new Error('Achievements data corrupted');
            // Фильтрация по редкости
            const rarities = ['all', 'common', 'rare', 'epic', 'secret'];
            let selectedRarity = this._achievementsRarityFilter || 'all';
            if (selectedRarity !== 'all') {
                playerAchievements = playerAchievements.filter(a => a.rarity === selectedRarity);
            }
            const total = achievements.achievements.size;
            const unlocked = playerAchievements.filter(a => a.unlocked).length;
            const percent = total ? Math.round(unlocked / total * 100) : 0;
            const filterButtons = rarities.map(r => `<button class=\"btn secondary${selectedRarity === r ? ' active' : ''}\" data-rarity=\"${r}\">${r === 'all' ? 'Все' : r.charAt(0).toUpperCase() + r.slice(1)}</button>`).join(' ');
            // SVG Pie chart
            const radius = 32, stroke = 8, circ = 2 * Math.PI * radius, offset = circ * (1 - percent / 100);
            const pieChart = `<svg width='80' height='80' style='display:block;margin:0 auto 8px;'><circle r='${radius}' cx='40' cy='40' fill='none' stroke='#eee' stroke-width='${stroke}'/><circle r='${radius}' cx='40' cy='40' fill='none' stroke='#4caf50' stroke-width='${stroke}' stroke-dasharray='${circ}' stroke-dashoffset='${offset}' style='transition:stroke-dashoffset 0.5s;'/><text x='40' y='46' text-anchor='middle' font-size='1.2em' fill='#333'>${percent}%</text></svg>`;
            const content = `
                <div class=\"achievements-modal\">
                    <h3>${getText('ACHIEVEMENTS_TITLE')}</h3>
                    <div style=\"margin-block-end:12px;\">
                        <div style=\"display:flex;align-items:center;flex-direction:column;\">${pieChart}</div>
                        <div style=\"font-size:0.95em; margin-block-end:4px;\">${unlocked} / ${total} (${percent}%) ${getText('ACHIEVEMENTS_UNLOCKED') || 'разблокировано'}</div>
                        <div style=\"background:#eee; border-radius:6px; block-size:10px; inline-size:100%; overflow:hidden; margin-block-end:8px;\">
                            <div style=\"background:#4caf50; inline-size:${percent}%; inline-size:${percent}%; block-size:100%;\"></div>
                        </div>
                        <div class=\"achievements-filters\" style=\"margin-block-end:8px;\">${filterButtons}</div>
                    </div>
                    <ul class=\"achievements-list\">
                        ${playerAchievements.length ? playerAchievements.map(a => `
                            <li class=\"achievement ${a.unlocked ? 'unlocked' : 'locked'}\">\n                                <span class=\"icon\">${a.icon || '🏆'}</span>\n                                <span class=\"title\">${a.title || a.name}</span>\n                                <span class=\"desc\">${a.message || a.description}</span>\n                                <span class=\"date\">${a.unlocked ? (new Date(a.unlockedAt)).toLocaleDateString() : ''}</span>\n                            </li>
                        `).join('') : `<li>${getText('ACHIEVEMENTS_NONE')}</li>`}
                    </ul>
                </div>
                <script>
                    document.querySelectorAll('.achievements-filters button').forEach(btn => {
                        btn.onclick = function() {
                            ui._achievementsRarityFilter = this.getAttribute('data-rarity');
                            ui.showAchievementsModal();
                        };
                    });
                </script>
            `;
            this.showModal(getText('ACHIEVEMENTS_TITLE'), content);
        } catch (e) {
            this.showNotification('Ошибка отображения достижений: ' + (e.message || e), 'error');
        }
    }

    /**
     * Показывает модальное окно статистики
     */
    showStatisticsModal() {
        try {
            if (!statistics) {
                this.showNotification('Система статистики не инициализирована', 'error');
                return;
            }
            const player = game?.players?.[game.currentPlayerIndex];
            const stats = player ? statistics.getPlayerStats(player.id) : null;
            const globalStats = statistics.getGlobalStats ? statistics.getGlobalStats() : null;
            const records = statistics.getRecords ? statistics.getRecords() : null;
            const tabs = [
                { key: 'player', label: 'Игрока' },
                { key: 'global', label: 'Глобальная' },
                { key: 'records', label: 'Рекорды' }
            ];
            let selectedTab = this._statisticsTab || 'player';
            const tabButtons = tabs.map(tab => `<button class="btn secondary${selectedTab === tab.key ? ' active' : ''}" data-tab="${tab.key}">${tab.label}</button>`).join(' ');
            let contentTab = '';
            if (selectedTab === 'player') {
                contentTab = stats ? `
                    <ul class="statistics-list">
                        <li>${getText('STATISTICS.GAMES_PLAYED')}: ${stats.gamesPlayed}</li>
                        <li>${getText('STATISTICS.GAMES_WON')}: ${stats.gamesWon}</li>
                        <li>${getText('STATISTICS.TOTAL_MONEY')}: ${stats.totalMoneyEarned}₽</li>
                        <li>${getText('STATISTICS.TOTAL_PROPERTIES')}: ${stats.totalPropertiesPurchased}</li>
                        <li>${getText('STATISTICS.TOTAL_TRADES')}: ${stats.totalTradesCompleted}</li>
                        <li>${getText('STATISTICS.TOTAL_AUCTIONS')}: ${stats.totalAuctionsWon}</li>
                        <li>${getText('STATISTICS.ACHIEVEMENTS_UNLOCKED')}: ${stats.totalAchievementsUnlocked || 0}</li>
                        <li>${getText('STATISTICS.TIME_PLAYED')}: ${stats.totalPlayTime || 0}</li>
                    </ul>
                ` : `<div>${getText('STATISTICS_NONE')}</div>`;
            } else if (selectedTab === 'global') {
                contentTab = globalStats ? `
                    <ul class="statistics-list">
                        <li>${getText('STATISTICS.GAMES_PLAYED')}: ${globalStats.totalGames}</li>
                        <li>${getText('STATISTICS.TOTAL_MONEY')}: ${globalStats.totalMoneyEarned}₽</li>
                        <li>${getText('STATISTICS.TOTAL_PROPERTIES')}: ${globalStats.totalPropertiesPurchased}</li>
                        <li>${getText('STATISTICS.TOTAL_TRADES')}: ${globalStats.totalTradesCompleted}</li>
                        <li>${getText('STATISTICS.TOTAL_AUCTIONS')}: ${globalStats.totalAuctionsWon}</li>
                        <li>${getText('STATISTICS.TIME_PLAYED')}: ${globalStats.totalPlayTime || 0}</li>
                    </ul>
                ` : `<div>${getText('STATISTICS_NONE')}</div>`;
            } else if (selectedTab === 'records') {
                contentTab = records ? `
                    <ul class="statistics-list">
                        ${Array.from(records.entries()).map(([key, rec]) => `<li>${getText('STATISTICS.'+key.toUpperCase()) || key}: ${rec.value} (${rec.player || ''})</li>`).join('')}
                    </ul>
                ` : `<div>${getText('STATISTICS_NONE')}</div>`;
            }
            const content = `
                <div class="statistics-modal">
                    <h3>${getText('STATISTICS_TITLE')}</h3>
                    <div class="statistics-tabs" style="margin-block-end:12px;">${tabButtons}</div>
                    <div class="statistics-tab-content">${contentTab}</div>
                </div>
                <script>
                    document.querySelectorAll('.statistics-tabs button').forEach(btn => {
                        btn.onclick = function() {
                            ui._statisticsTab = this.getAttribute('data-tab');
                            ui.showStatisticsModal();
                        };
                    });
                </script>
            `;
            this.showModal(getText('STATISTICS_TITLE'), content);
        } catch (e) {
            this.showNotification('Ошибка отображения статистики: ' + (e.message || e), 'error');
        }
    }

    /**
     * Показывает модальное окно турниров
     */
    showTournamentsModal() {
        try {
            if (!tournaments) {
                this.showNotification('Система турниров не инициализирована', 'error');
                return;
            }
            const tabs = [
                { key: 'active', label: 'Активные' },
                { key: 'history', label: 'История' },
                { key: 'rankings', label: 'Рейтинг' }
            ];
            let selectedTab = this._tournamentsTab || 'active';
            const tabButtons = tabs.map(tab => `<button class="btn secondary${selectedTab === tab.key ? ' active' : ''}" data-tab="${tab.key}">${tab.label}</button>`).join(' ');
            let contentTab = '';
            if (selectedTab === 'active') {
                const activeTournaments = tournaments.getActiveTournaments();
                contentTab = `<ul class="tournaments-list">
                    ${activeTournaments.length ? activeTournaments.map(t => `
                        <li class="tournament">
                            <span class="name">${t.name}</span>
                            <span class="type">Тип: ${t.type}</span>
                            <span class="status">Статус: ${t.status}</span>
                            <span class="players">Игроков: ${t.currentPlayers?.length || 0}/${t.maxPlayers}</span>
                        </li>
                    `).join('') : `<li>${getText('TOURNAMENTS_NONE')}</li>`}
                </ul>`;
            } else if (selectedTab === 'history') {
                const history = tournaments.getTournamentHistory ? tournaments.getTournamentHistory(10) : [];
                contentTab = `<ul class="tournaments-list">
                    ${history.length ? history.map(t => `
                        <li class="tournament">
                            <span class="name">${t.name}</span>
                            <span class="type">Тип: ${t.type}</span>
                            <span class="status">Статус: ${t.status}</span>
                            <span class="players">Игроков: ${t.currentPlayers?.length || 0}/${t.maxPlayers}</span>
                            <span class="winner">Победитель: ${t.winner || '-'}</span>
                        </li>
                    `).join('') : `<li>Нет истории турниров</li>`}
                </ul>`;
            } else if (selectedTab === 'rankings') {
                const rankings = tournaments.getRankings ? tournaments.getRankings(10) : [];
                contentTab = `<ul class="tournaments-list">
                    ${rankings.length ? rankings.map(r => `
                        <li class="tournament">
                            <span class="name">${r.playerName || r.player || '-'}</span>
                            <span class="type">Очки: ${r.points || 0}</span>
                            <span class="status">Побед: ${r.tournamentsWon || r.wins || 0}</span>
                        </li>
                    `).join('') : `<li>Нет рейтинга</li>`}
                </ul>`;
            }
            const content = `
                <div class="tournaments-modal">
                    <h3>${getText('TOURNAMENTS_TITLE')}</h3>
                    <div class="tournaments-tabs" style="margin-block-end:12px;">${tabButtons}</div>
                    <div class="tournaments-tab-content">${contentTab}</div>
                </div>
                <script>
                    document.querySelectorAll('.tournaments-tabs button').forEach(btn => {
                        btn.onclick = function() {
                            ui._tournamentsTab = this.getAttribute('data-tab');
                            ui.showTournamentsModal();
                        };
                    });
                </script>
            `;
            this.showModal(getText('TOURNAMENTS_TITLE'), content);
        } catch (e) {
            this.showNotification('Ошибка отображения турниров: ' + (e.message || e), 'error');
        }
    }

    // DEBUG: тестовые кнопки для проверки уведомлений (только если APP_CONFIG.DEBUG_MODE)
    addDebugTestButtons() {
        if (!(window.APP_CONFIG && APP_CONFIG.DEBUG_MODE)) return;
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.bottom = '16px';
        panel.style.right = '16px';
        panel.style.zIndex = 30000;
        panel.style.background = '#fff';
        panel.style.border = '1px solid #ccc';
        panel.style.borderRadius = '8px';
        panel.style.padding = '8px 12px';
        panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        panel.innerHTML = `
            <button onclick="if(window.achievements){achievements.showAchievementNotification({icon:'🏆',name:'Тест',description:'Тестовое достижение',points:10,rarity:'epic'})}">Тест достижение</button>
            <button onclick="if(window.ui){ui.showNotification('Тест рекорд <button class=\\'notification-details\\' onclick=\\'window.ui.showStatisticsModal()\\'>Подробнее</button>','success',5000)}">Тест рекорд</button>
            <button onclick="if(window.ui){ui.showNotification('Тест турнир <button class=\\'notification-details\\' onclick=\\'window.ui.showTournamentsModal()\\'>Подробнее</button>','success',5000)}">Тест турнир</button>
        `;
        document.body.appendChild(panel);
    }
}

// Создаем глобальный экземпляр UI
const ui = new UI();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
} 

/**
 * Динамически строит игровое поле по периметру (40 клеток), с логотипами, цветами и правильными размерами
 */
function renderBoard() {
    const boardContainer = document.querySelector('.game-board');
    if (!boardContainer) return;
    boardContainer.innerHTML = '';

    // Создаём сетку 11x11 (81 ячейка, 40 по периметру)
    const size = 11;
    const boardGrid = document.createElement('div');
    boardGrid.className = 'board-grid';
    boardGrid.style.display = 'grid';
    boardGrid.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    boardGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardGrid.style.width = '100%';
    boardGrid.style.height = '100%';
    boardGrid.style.position = 'relative';

    // Массив позиций клеток по периметру (по часовой стрелке)
    const positions = [];
    for (let i = 0; i < size; i++) positions.push(i); // верх
    for (let i = 1; i < size - 1; i++) positions.push(size - 1 + i * (size - 1)); // правый
    for (let i = size - 2; i >= 0; i--) positions.push((size * (size - 1)) + i); // низ
    for (let i = size - 2; i > 0; i--) positions.push(i * size); // левый

    // Получаем локализацию тултипов
    const tooltips = (CONFIG && CONFIG.TOOLTIPS) || {};

    // Для каждой позиции создаём клетку
    for (let idx = 0; idx < 40; idx++) {
        const cell = board.getCell(idx);
        const pos = positions[idx];
        const row = Math.floor(pos / size) + 1;
        const col = (pos % size) + 1;
        const cellDiv = document.createElement('div');
        cellDiv.classList.add('board-cell');
        cellDiv.style.gridRow = row;
        cellDiv.style.gridColumn = col;
        cellDiv.setAttribute('data-cell-idx', idx);
        cellDiv.setAttribute('data-cell-type', cell.type);

        // Определяем тултип для типа клетки
        let tooltipText = '';
        switch (cell.type) {
            case 'property':
                tooltipText = `${tooltips.PROPERTY_INFO || 'Недвижимость'}: ${cell.name}\nЦена: ${cell.price}₽\nАренда: ${cell.rent || '-'}₽`;
                break;
            case 'chance':
                tooltipText = tooltips.CHANCE || 'Шанс: получите случайное событие';
                break;
            case 'tax':
                tooltipText = tooltips.TAX || 'Налог: заплатите налог';
                break;
            case 'jail':
                tooltipText = tooltips.JAIL || 'Тюрьма: просто посещение';
                break;
            case 'free_parking':
                tooltipText = tooltips.FREE_PARKING || 'Бесплатная парковка';
                break;
            case 'go_to_jail':
                tooltipText = tooltips.GO_TO_JAIL || 'Идите в тюрьму!';
                break;
            case 'treasure':
                tooltipText = tooltips.TREASURE || 'Казна: получите или потеряйте деньги';
                break;
            case 'start':
                tooltipText = tooltips.START || 'Старт: получите деньги при прохождении';
                break;
            default:
                tooltipText = cell.name;
        }
        cellDiv.setAttribute('data-tooltip', tooltipText);

        // Определяем иконку/цвет для тултипа
        let tooltipIcon = '';
        let tooltipColor = '';
        switch (cell.type) {
            case 'property':
                tooltipColor = cell.color || '#888';
                break;
            case 'chance':
                tooltipIcon = '🎲';
                break;
            case 'tax':
                tooltipIcon = '💸';
                break;
            case 'jail':
                tooltipIcon = '🚔';
                break;
            case 'free_parking':
                tooltipIcon = '🅿️';
                break;
            case 'go_to_jail':
                tooltipIcon = '➡️🚔';
                break;
            case 'treasure':
                tooltipIcon = '💰';
                break;
            case 'start':
                tooltipIcon = '🏁';
                break;
            default:
                tooltipIcon = '';
        }

        // Угловые клетки
        if ([0, 10, 20, 30].includes(idx)) {
            cellDiv.classList.add('corner-cell');
            cellDiv.innerHTML = `<div class="cell-content"><h3>${cell.name}</h3></div>`;
        } else if (cell.type === 'property') {
            // Клетки-собственности
            cellDiv.classList.add('property-cell');
            if (cell.color) cellDiv.setAttribute('data-color', cell.color);
            let logoHtml = '';
            if (cell.logo) {
                if (typeof cell.logo === 'string' && (cell.logo.endsWith('.svg') || cell.logo.endsWith('.png'))) {
                    logoHtml = `<img src="${cell.logo}" alt="logo" class="property-logo-img">`;
                } else {
                    logoHtml = cell.logo;
                }
            }
            let ownerHtml = '';
            let improvementsHtml = '';
            // Тестовые цвета владельцев (idx % 4)
            const ownerColors = ['#e53935', '#1e88e5', '#43a047', '#fbc02d'];
            if (cell.owner !== null && cell.owner !== undefined) {
                const color = ownerColors[cell.owner % ownerColors.length];
                ownerHtml = `<span class="property-owner" style="background:${color}"></span>`;
            }
            if (cell.improvements && cell.improvements > 0) {
                for (let i = 0; i < cell.improvements; i++) {
                    improvementsHtml += '<span class="property-improvement">🏠</span>';
                }
            }
            cellDiv.innerHTML = `
                <div class="cell-content">
                    <div class="property-color" style="background:${cell.color}"></div>
                    <div class="property-logo">${logoHtml}</div>
                    <h3>${cell.name}</h3>
                    <p class="price">${cell.price}₽</p>
                    <div class="property-extras">${ownerHtml}${improvementsHtml}</div>
                </div>
            `;
        } else if (cell.type === 'chance') {
            cellDiv.classList.add('chance-cell');
            cellDiv.innerHTML = `<div class="cell-content"><span>?</span><h3>ШАНС</h3></div>`;
        } else if (cell.type === 'treasure') {
            cellDiv.classList.add('treasure-cell');
            cellDiv.innerHTML = `<div class="cell-content"><span>💰</span><h3>КАЗНА</h3></div>`;
        } else if (cell.type === 'tax') {
            cellDiv.classList.add('tax-cell');
            cellDiv.innerHTML = `<div class="cell-content"><span>💸</span><h3>НАЛОГ</h3></div>`;
        } else if (cell.type === 'jail') {
            cellDiv.classList.add('corner-cell', 'jail');
            cellDiv.innerHTML = `<div class="cell-content"><span>🚔</span><h3>ТЮРЬМА</h3></div>`;
        } else if (cell.type === 'free_parking') {
            cellDiv.classList.add('corner-cell', 'free-parking');
            cellDiv.innerHTML = `<div class="cell-content"><span>🅿️</span><h3>ПАРКОВКА</h3></div>`;
        } else if (cell.type === 'go_to_jail') {
            cellDiv.classList.add('corner-cell', 'go-to-jail');
            cellDiv.innerHTML = `<div class="cell-content"><span>➡️🚔</span><h3>В ТЮРЬМУ</h3></div>`;
        } else {
            cellDiv.innerHTML = `<div class="cell-content"><h3>${cell.name}</h3></div>`;
        }

        // Навешиваем обработчик клика для модального окна
        cellDiv.addEventListener('click', () => {
            let modalTitle = cell.name;
            let modalContent = '';
            switch (cell.type) {
                case 'property':
                    modalContent = `<div><b>Цена:</b> ${cell.price}₽<br><b>Аренда:</b> ${cell.rent || '-'}₽<br><b>Владелец:</b> ${cell.owner !== null ? 'Игрок ' + (cell.owner + 1) : 'нет'}<br><b>Улучшения:</b> ${cell.improvements || 0}</div>`;
                    if (cell.owner === null) {
                        modalContent += `<button class='btn primary' onclick='game.buyProperty(${idx})'>Купить</button>`;
                    } else if (cell.owner !== game.currentPlayerIndex) {
                        modalContent += `<button class='btn primary' onclick='game.payRent(${idx})'>Оплатить аренду</button>`;
                    } else {
                        modalContent += `<button class='btn secondary' onclick='ui.showBuildDialog()'>Улучшить</button>`;
                    }
                    break;
                case 'chance':
                    modalContent = `<div>Вытяните карточку Шанс!</div>`;
                    break;
                case 'tax':
                    modalContent = `<div>Заплатите налог!</div>`;
                    break;
                case 'jail':
                    modalContent = `<div>Тюрьма. Просто посещение.</div>`;
                    break;
                case 'free_parking':
                    modalContent = `<div>Бесплатная парковка. Отдохните!</div>`;
                    break;
                case 'go_to_jail':
                    modalContent = `<div>Вы отправляетесь в тюрьму!</div>`;
                    break;
                case 'treasure':
                    modalContent = `<div>Казна. Получите или потеряйте деньги!</div>`;
                    break;
                case 'start':
                    modalContent = `<div>Старт. Получите деньги при прохождении!</div>`;
                    break;
                default:
                    modalContent = `<div>${cell.name}</div>`;
            }
            ui.showModal(modalTitle, modalContent);
        });

        // Кастомный тултип
        cellDiv.addEventListener('mouseenter', (e) => {
            showCustomTooltip(cellDiv, {
                text: tooltipText,
                type: cell.type,
                color: tooltipColor,
                icon: tooltipIcon
            }, e);
        });
        cellDiv.addEventListener('mouseleave', hideCustomTooltip);
        // Для мобильных — по тапу
        cellDiv.addEventListener('touchstart', (e) => {
            showCustomTooltip(cellDiv, {
                text: tooltipText,
                type: cell.type,
                color: tooltipColor,
                icon: tooltipIcon
            }, e);
        });
        cellDiv.addEventListener('touchend', hideCustomTooltip);

        boardGrid.appendChild(cellDiv);
    }

    // Центр доски — пустой div для информации/виджетов
    const centerDiv = document.createElement('div');
    centerDiv.className = 'board-center';
    centerDiv.style.gridRow = '2 / span 9';
    centerDiv.style.gridColumn = '2 / span 9';
    boardGrid.appendChild(centerDiv);

    boardContainer.appendChild(boardGrid);
}

// Кастомный тултип
function showCustomTooltip(target, opts, event) {
    hideCustomTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    let iconHtml = '';
    if (opts.type === 'property' && opts.color) {
        iconHtml = `<span class="custom-tooltip__color" style="background:${opts.color}"></span>`;
    } else if (opts.icon) {
        iconHtml = `<span class="custom-tooltip__icon">${opts.icon}</span>`;
    }
    tooltip.innerHTML = `${iconHtml}<span class="custom-tooltip__text">${opts.text.replace(/\n/g, '<br>')}</span>`;
    document.body.appendChild(tooltip);
    // Позиционирование
    const rect = target.getBoundingClientRect();
    // Сначала делаем видимым, чтобы узнать высоту
    tooltip.style.left = rect.left + window.scrollX + rect.width / 2 + 'px';
    tooltip.style.insetInlineStart = rect.left + window.scrollX + rect.width / 2 + 'px';
    tooltip.style.top = rect.top + window.scrollY - tooltip.offsetHeight - 8 + 'px';
    tooltip.style.insetBlockStart = rect.top + window.scrollY - tooltip.offsetHeight - 8 + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';
    tooltip.style.opacity = '1';
    // Корректируем если тултип выходит за экран
    const tRect = tooltip.getBoundingClientRect();
    if (tRect.left < 4) {
        tooltip.style.left = (rect.left + window.scrollX + tRect.width / 2 + 8) + 'px';
        tooltip.style.insetInlineStart = (rect.left + window.scrollX + tRect.width / 2 + 8) + 'px';
    }
    if (tRect.right > window.innerWidth - 4) {
        tooltip.style.left = (rect.right + window.scrollX - tRect.width / 2 - 8) + 'px';
        tooltip.style.insetInlineStart = (rect.right + window.scrollX - tRect.width / 2 - 8) + 'px';
    }
    if (tRect.top < 4) {
        tooltip.style.top = (rect.top + window.scrollY + rect.height + 8) + 'px';
        tooltip.style.insetBlockStart = (rect.top + window.scrollY + rect.height + 8) + 'px';
        tooltip.style.transform = 'translate(-50%, 0)';
    }
    // Для мобильных — автоисчезновение
    if (event && event.type && event.type.startsWith('touch')) {
        setTimeout(hideCustomTooltip, 2000);
    }
}
function hideCustomTooltip() {
    const tooltip = document.querySelector('.custom-tooltip');
    if (tooltip) tooltip.remove();
} 