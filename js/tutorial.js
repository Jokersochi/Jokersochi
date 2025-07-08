/**
 * Модуль системы обучения и подсказок
 * Обеспечивает интерактивное обучение и контекстные подсказки
 */

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.tutorials = new Map();
        this.activeTutorial = null;
        this.completedTutorials = new Set();
        this.tooltips = new Map();
        this.highlights = new Map();
        this.overlay = null;
        
        this.initializeTutorials();
        this.setupOverlay();
        this.loadProgress();
    }

    /**
     * Инициализирует учебные материалы
     */
    initializeTutorials() {
        // Основной учебник для новых игроков
        this.tutorials.set('basic', {
            id: 'basic',
            name: 'Основы игры',
            en_name: 'Game Basics',
            description: 'Изучите основные правила и механики игры',
            en_description: 'Learn the basic rules and game mechanics',
            steps: [
                {
                    id: 'welcome',
                    title: 'Добро пожаловать в Русскую Монополию!',
                    en_title: 'Welcome to Russian Monopoly!',
                    content: 'Это интерактивный учебник поможет вам освоить игру. Нажимайте "Далее" для продолжения.',
                    en_content: 'This interactive tutorial will help you learn the game. Click "Next" to continue.',
                    target: null,
                    position: 'center',
                    action: 'next'
                },
                {
                    id: 'game_board',
                    title: 'Игровое поле',
                    en_title: 'Game Board',
                    content: 'Это игровое поле с 40 клетками. Каждая клетка имеет свои особенности и возможности.',
                    en_content: 'This is the game board with 40 cells. Each cell has its own features and opportunities.',
                    target: '.game-board',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'properties',
                    title: 'Недвижимость',
                    en_title: 'Properties',
                    content: 'Цветные клетки - это недвижимость. Вы можете покупать их и получать арендную плату.',
                    en_content: 'Colored cells are properties. You can buy them and collect rent.',
                    target: '.property-cell',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'chance_cards',
                    title: 'Карточки Шанс',
                    en_title: 'Chance Cards',
                    content: 'Клетки "ШАНС" дают случайные события, которые могут помочь или навредить.',
                    en_content: '"CHANCE" cells provide random events that can help or harm you.',
                    target: '.chance-cell',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'treasure_cards',
                    title: 'Карточки Казна',
                    en_title: 'Treasure Cards',
                    content: 'Клетки "КАЗНА" дают деньги или другие бонусы.',
                    en_content: '"TREASURE" cells give money or other bonuses.',
                    target: '.treasure-cell',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'dice_rolling',
                    title: 'Бросок костей',
                    en_title: 'Dice Rolling',
                    content: 'Нажмите "Бросить кости" для перемещения по полю.',
                    en_content: 'Click "Roll Dice" to move around the board.',
                    target: '#dice-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'money_management',
                    title: 'Управление деньгами',
                    en_title: 'Money Management',
                    content: 'Следите за своими деньгами. Вы начинаете с 2000₽.',
                    en_content: 'Keep track of your money. You start with 2000$.',
                    target: '.player-money',
                    position: 'left',
                    action: 'highlight'
                },
                {
                    id: 'buying_properties',
                    title: 'Покупка недвижимости',
                    en_title: 'Buying Properties',
                    content: 'Когда вы попадаете на свободную недвижимость, вы можете её купить.',
                    en_content: 'When you land on an unowned property, you can buy it.',
                    target: '.property-cell',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'rent_payment',
                    title: 'Арендная плата',
                    en_title: 'Rent Payment',
                    content: 'Если вы попадаете на чужую недвижимость, вы платите аренду.',
                    en_content: 'If you land on someone else\'s property, you pay rent.',
                    target: '.property-cell',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'improvements',
                    title: 'Улучшения',
                    en_title: 'Improvements',
                    content: 'Вы можете улучшать свою недвижимость, увеличивая арендную плату.',
                    en_content: 'You can improve your properties to increase rent.',
                    target: '.improvement-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'residences',
                    title: 'Резиденции',
                    en_title: 'Residences',
                    content: 'Резиденции удваивают арендную плату. Стройте их на своих участках.',
                    en_content: 'Residences double the rent. Build them on your properties.',
                    target: '.residence-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'auctions',
                    title: 'Аукционы',
                    en_title: 'Auctions',
                    content: 'Если игрок не хочет покупать недвижимость, она выставляется на аукцион.',
                    en_content: 'If a player doesn\'t want to buy a property, it goes to auction.',
                    target: '.auction-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'trading',
                    title: 'Торговля',
                    en_title: 'Trading',
                    content: 'Вы можете торговать недвижимостью и деньгами с другими игроками.',
                    en_content: 'You can trade properties and money with other players.',
                    target: '.trade-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'weather_effects',
                    title: 'Погодные эффекты',
                    en_title: 'Weather Effects',
                    content: 'Погода влияет на арендную плату и другие аспекты игры.',
                    en_content: 'Weather affects rent and other game aspects.',
                    target: '.weather-indicator',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'events',
                    title: 'События',
                    en_title: 'Events',
                    content: 'Экономические и культурные события изменяют условия игры.',
                    en_content: 'Economic and cultural events change game conditions.',
                    target: '.event-indicator',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'alliances',
                    title: 'Альянсы',
                    en_title: 'Alliances',
                    content: 'Создавайте альянсы с другими игроками для взаимной выгоды.',
                    en_content: 'Form alliances with other players for mutual benefit.',
                    target: '.alliance-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'tournaments',
                    title: 'Турниры',
                    en_title: 'Tournaments',
                    content: 'Участвуйте в турнирах для получения дополнительных наград.',
                    en_content: 'Participate in tournaments for additional rewards.',
                    target: '.tournament-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'achievements',
                    title: 'Достижения',
                    en_title: 'Achievements',
                    content: 'Выполняйте достижения для получения бонусов и статуса.',
                    en_content: 'Complete achievements for bonuses and status.',
                    target: '.achievements-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'chat',
                    title: 'Чат',
                    en_title: 'Chat',
                    content: 'Общайтесь с другими игроками через чат.',
                    en_content: 'Communicate with other players through chat.',
                    target: '.chat-container',
                    position: 'left',
                    action: 'highlight'
                },
                {
                    id: 'settings',
                    title: 'Настройки',
                    en_title: 'Settings',
                    content: 'Настройте игру под свои предпочтения.',
                    en_content: 'Customize the game to your preferences.',
                    target: '.settings-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'complete',
                    title: 'Обучение завершено!',
                    en_title: 'Tutorial Complete!',
                    content: 'Поздравляем! Вы изучили основы игры. Теперь можете начать играть.',
                    en_content: 'Congratulations! You have learned the basics. You can now start playing.',
                    target: null,
                    position: 'center',
                    action: 'complete'
                }
            ]
        });

        // Учебник по торговле
        this.tutorials.set('trading', {
            id: 'trading',
            name: 'Торговля',
            en_name: 'Trading',
            description: 'Изучите систему торговли между игроками',
            en_description: 'Learn the trading system between players',
            steps: [
                {
                    id: 'trade_intro',
                    title: 'Введение в торговлю',
                    en_title: 'Trading Introduction',
                    content: 'Торговля позволяет обмениваться недвижимостью и деньгами с другими игроками.',
                    en_content: 'Trading allows you to exchange properties and money with other players.',
                    target: '.trade-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'trade_offer',
                    title: 'Предложение торговли',
                    en_title: 'Trade Offer',
                    content: 'Нажмите на игрока и выберите "Предложить торговлю".',
                    en_content: 'Click on a player and select "Offer Trade".',
                    target: '.player-item',
                    position: 'right',
                    action: 'highlight'
                },
                {
                    id: 'trade_items',
                    title: 'Предметы торговли',
                    en_title: 'Trade Items',
                    content: 'Выберите, что предлагаете и что запрашиваете.',
                    en_content: 'Select what you offer and what you request.',
                    target: '.trade-items',
                    position: 'center',
                    action: 'highlight'
                },
                {
                    id: 'trade_accept',
                    title: 'Принятие торговли',
                    en_title: 'Accepting Trades',
                    content: 'Другой игрок может принять или отклонить ваше предложение.',
                    en_content: 'The other player can accept or reject your offer.',
                    target: '.trade-actions',
                    position: 'bottom',
                    action: 'highlight'
                }
            ]
        });

        // Учебник по аукционам
        this.tutorials.set('auctions', {
            id: 'auctions',
            name: 'Аукционы',
            en_name: 'Auctions',
            description: 'Изучите систему аукционов',
            en_description: 'Learn the auction system',
            steps: [
                {
                    id: 'auction_intro',
                    title: 'Введение в аукционы',
                    en_title: 'Auction Introduction',
                    content: 'Аукционы происходят, когда игрок отказывается покупать недвижимость.',
                    en_content: 'Auctions occur when a player refuses to buy a property.',
                    target: '.auction-modal',
                    position: 'center',
                    action: 'highlight'
                },
                {
                    id: 'auction_bidding',
                    title: 'Ставки',
                    en_title: 'Bidding',
                    content: 'Делайте ставки выше минимальной суммы.',
                    en_content: 'Make bids above the minimum amount.',
                    target: '.auction-bid',
                    position: 'bottom',
                    action: 'highlight'
                },
                {
                    id: 'auction_timer',
                    title: 'Таймер',
                    en_title: 'Timer',
                    content: 'У вас есть ограниченное время для ставки.',
                    en_content: 'You have limited time to bid.',
                    target: '.auction-timer',
                    position: 'top',
                    action: 'highlight'
                }
            ]
        });

        // Учебник по альянсам
        this.tutorials.set('alliances', {
            id: 'alliances',
            name: 'Альянсы',
            en_name: 'Alliances',
            description: 'Изучите систему альянсов',
            en_description: 'Learn the alliance system',
            steps: [
                {
                    id: 'alliance_intro',
                    title: 'Введение в альянсы',
                    en_title: 'Alliance Introduction',
                    content: 'Альянсы позволяют игрокам объединяться для взаимной выгоды.',
                    en_content: 'Alliances allow players to unite for mutual benefit.',
                    target: '.alliance-btn',
                    position: 'top',
                    action: 'highlight'
                },
                {
                    id: 'alliance_benefits',
                    title: 'Преимущества альянсов',
                    en_title: 'Alliance Benefits',
                    content: 'Участники альянса получают бонусы к аренде и торговле.',
                    en_content: 'Alliance members receive bonuses to rent and trading.',
                    target: '.alliance-benefits',
                    position: 'center',
                    action: 'highlight'
                }
            ]
        });
    }

    /**
     * Настраивает оверлей для учебника
     */
    setupOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; /* fallback for logical property */
            inset-block-start: 0;
            left: 0; /* fallback for logical property */
            inset-inline-start: 0;
            width: 100%; /* fallback for logical property */
            inline-size: 100%;
            height: 100%; /* fallback for logical property */
            block-size: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.overlay);
    }

    /**
     * Загружает прогресс обучения
     */
    loadProgress() {
        try {
            const progress = JSON.parse(localStorage.getItem('tutorialProgress'));
            if (progress) {
                this.completedTutorials = new Set(progress.completed || []);
            }
        } catch (error) {
            console.warn('Failed to load tutorial progress:', error);
        }
    }

    /**
     * Сохраняет прогресс обучения
     */
    saveProgress() {
        const progress = {
            completed: Array.from(this.completedTutorials),
            timestamp: Date.now()
        };
        localStorage.setItem('tutorialProgress', JSON.stringify(progress));
    }

    /**
     * Начинает учебник
     * @param {string} tutorialId - ID учебника
     */
    startTutorial(tutorialId) {
        const tutorial = this.tutorials.get(tutorialId);
        if (!tutorial) {
            console.warn(`Tutorial not found: ${tutorialId}`);
            return;
        }

        this.activeTutorial = tutorial;
        this.currentStep = 0;
        this.showStep();
    }

    /**
     * Показывает текущий шаг
     */
    showStep() {
        if (!this.activeTutorial) return;

        const step = this.activeTutorial.steps[this.currentStep];
        if (!step) {
            this.completeTutorial();
            return;
        }

        this.showTooltip(step);
    }

    /**
     * Показывает подсказку
     * @param {Object} step - шаг учебника
     */
    showTooltip(step) {
        // Скрываем предыдущие подсказки
        this.hideAllTooltips();

        // Создаем подсказку
        const tooltip = document.createElement('div');
        tooltip.className = 'tutorial-tooltip';
        tooltip.innerHTML = `
            <div class="tutorial-header">
                <h3>${utils.getText(`TUTORIAL.${step.title.toUpperCase()}`)}</h3>
                <button class="tutorial-close" onclick="tutorial.closeTutorial()">×</button>
            </div>
            <div class="tutorial-content">
                <p>${utils.getText(`TUTORIAL.${step.content.toUpperCase()}`)}</p>
            </div>
            <div class="tutorial-footer">
                <span class="tutorial-progress">${this.currentStep + 1} / ${this.activeTutorial.steps.length}</span>
                <div class="tutorial-actions">
                    ${this.currentStep > 0 ? '<button class="tutorial-prev" onclick="tutorial.prevStep()">Назад</button>' : ''}
                    <button class="tutorial-next" onclick="tutorial.nextStep()">
                        ${this.currentStep === this.activeTutorial.steps.length - 1 ? 'Завершить' : 'Далее'}
                    </button>
                </div>
            </div>
        `;

        // Позиционируем подсказку
        this.positionTooltip(tooltip, step);

        // Показываем оверлей
        this.overlay.style.display = 'block';
        this.overlay.appendChild(tooltip);

        // Подсвечиваем цель
        if (step.target) {
            this.highlightTarget(step.target);
        }

        // Добавляем стили
        this.addTooltipStyles();
    }

    /**
     * Позиционирует подсказку
     * @param {HTMLElement} tooltip - подсказка
     * @param {Object} step - шаг учебника
     */
    positionTooltip(tooltip, step) {
        if (!step.target) {
            // Центрируем подсказку
            tooltip.style.position = 'absolute';
            tooltip.style.top = '50%'; /* fallback for logical property */
            tooltip.style.insetBlockStart = '50%';
            tooltip.style.left = '50%'; /* fallback for logical property */
            tooltip.style.insetInlineStart = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const target = document.querySelector(step.target);
        if (!target) return;

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (step.position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 10;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = targetRect.bottom + 10;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.right + 10;
                break;
            default:
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        }

        tooltip.style.position = 'absolute';
        tooltip.style.top = `${Math.max(10, top)}px`; /* fallback for logical property */
        tooltip.style.insetBlockStart = `${Math.max(10, top)}px`;
        tooltip.style.left = `${Math.max(10, left)}px`; /* fallback for logical property */
        tooltip.style.insetInlineStart = `${Math.max(10, left)}px`;
    }

    /**
     * Подсвечивает цель
     * @param {string} selector - селектор цели
     */
    highlightTarget(selector) {
        const targets = document.querySelectorAll(selector);
        targets.forEach(target => {
            target.classList.add('tutorial-highlight');
            this.highlights.set(target, true);
        });
    }

    /**
     * Скрывает все подсказки
     */
    hideAllTooltips() {
        const tooltips = document.querySelectorAll('.tutorial-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());

        // Убираем подсветку
        this.highlights.forEach((highlighted, element) => {
            if (highlighted) {
                element.classList.remove('tutorial-highlight');
            }
        });
        this.highlights.clear();

        // Скрываем оверлей
        this.overlay.style.display = 'none';
    }

    /**
     * Переходит к следующему шагу
     */
    nextStep() {
        if (!this.activeTutorial) return;

        this.currentStep++;
        if (this.currentStep >= this.activeTutorial.steps.length) {
            this.completeTutorial();
        } else {
            this.showStep();
        }
    }

    /**
     * Переходит к предыдущему шагу
     */
    prevStep() {
        if (!this.activeTutorial || this.currentStep <= 0) return;

        this.currentStep--;
        this.showStep();
    }

    /**
     * Завершает учебник
     */
    completeTutorial() {
        if (!this.activeTutorial) return;

        this.completedTutorials.add(this.activeTutorial.id);
        this.saveProgress();
        this.hideAllTooltips();
        this.activeTutorial = null;

        // Показываем сообщение о завершении
        this.showCompletionMessage();
    }

    /**
     * Показывает сообщение о завершении
     */
    showCompletionMessage() {
        const message = document.createElement('div');
        message.className = 'tutorial-completion';
        message.innerHTML = `
            <div class="completion-content">
                <h3>🎉 Учебник завершен!</h3>
                <p>Поздравляем! Вы успешно изучили основы игры.</p>
                <button onclick="this.parentElement.parentElement.remove()">Понятно</button>
            </div>
        `;
        document.body.appendChild(message);

        // Автоматически убираем через 5 секунд
        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 5000);
    }

    /**
     * Закрывает учебник
     */
    closeTutorial() {
        this.hideAllTooltips();
        this.activeTutorial = null;
    }

    /**
     * Проверяет, завершен ли учебник
     * @param {string} tutorialId - ID учебника
     * @returns {boolean} завершен ли
     */
    isTutorialCompleted(tutorialId) {
        return this.completedTutorials.has(tutorialId);
    }

    /**
     * Получает список доступных учебников
     * @returns {Array} список учебников
     */
    getAvailableTutorials() {
        return Array.from(this.tutorials.values());
    }

    /**
     * Получает прогресс обучения
     * @returns {Object} прогресс
     */
    getProgress() {
        return {
            completed: Array.from(this.completedTutorials),
            total: this.tutorials.size,
            percentage: Math.round((this.completedTutorials.size / this.tutorials.size) * 100)
        };
    }

    /**
     * Сбрасывает прогресс обучения
     */
    resetProgress() {
        this.completedTutorials.clear();
        this.saveProgress();
    }

    /**
     * Добавляет стили для подсказок
     */
    addTooltipStyles() {
        if (document.getElementById('tutorial-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'tutorial-styles';
        styles.textContent = `
            .tutorial-overlay {
                pointer-events: auto;
            }
            
            .tutorial-tooltip {
                background: var(--bg-secondary);
                border: 2px solid var(--primary-light);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                max-width: 400px; /* fallback for logical property */
                max-inline-size: 400px;
                box-shadow: var(--shadow-xl);
                z-index: 10000;
                pointer-events: auto;
            }
            
            .tutorial-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem; /* fallback for logical property */
                margin-block-end: 1rem;
                padding-bottom: 0.5rem; /* fallback for logical property */
                padding-block-end: 0.5rem;
                border-bottom: 1px solid var(--bg-tertiary); /* fallback for logical property */
                border-block-end: 1px solid var(--bg-tertiary);
            }
            
            .tutorial-header h3 {
                margin: 0;
                color: var(--primary-light);
                font-size: 1.2rem;
            }
            
            .tutorial-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: var(--radius-sm);
                transition: all var(--transition-normal);
            }
            
            .tutorial-close:hover {
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }
            
            .tutorial-content {
                margin-bottom: 1rem; /* fallback for logical property */
                margin-block-end: 1rem;
            }
            
            .tutorial-content p {
                margin: 0;
                line-height: 1.5;
                color: var(--text-secondary);
            }
            
            .tutorial-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .tutorial-progress {
                font-size: 0.9rem;
                color: var(--text-muted);
            }
            
            .tutorial-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .tutorial-prev,
            .tutorial-next {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: var(--radius-md);
                cursor: pointer;
                transition: all var(--transition-normal);
                font-size: 0.9rem;
            }
            
            .tutorial-prev {
                background: var(--bg-tertiary);
                color: var(--text-secondary);
            }
            
            .tutorial-prev:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }
            
            .tutorial-next {
                background: var(--primary-light);
                color: white;
            }
            
            .tutorial-next:hover {
                background: var(--primary-color);
                transform: translateY(-1px);
            }
            
            .tutorial-highlight {
                position: relative;
                z-index: 10001;
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
                animation: tutorial-pulse 2s ease-in-out infinite;
            }
            
            @keyframes tutorial-pulse {
                0%, 100% {
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
                }
                50% {
                    box-shadow: 0 0 30px rgba(59, 130, 246, 1);
                }
            }
            
            .tutorial-completion {
                position: fixed;
                top: 50%; /* fallback for logical property */
                inset-block-start: 50%;
                left: 50%; /* fallback for logical property */
                inset-inline-start: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-secondary);
                border: 2px solid var(--success-color);
                border-radius: var(--radius-xl);
                padding: 2rem;
                text-align: center;
                z-index: 10002;
                box-shadow: var(--shadow-2xl);
                animation: tutorial-completion-in 0.5s ease-out;
            }
            
            @keyframes tutorial-completion-in {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            .completion-content h3 {
                margin: 0 0 1rem 0;
                color: var(--success-color);
                font-size: 1.5rem;
            }
            
            .completion-content p {
                margin: 0 0 1.5rem 0;
                color: var(--text-secondary);
            }
            
            .completion-content button {
                padding: 0.75rem 1.5rem;
                background: var(--success-color);
                color: white;
                border: none;
                border-radius: var(--radius-lg);
                cursor: pointer;
                transition: all var(--transition-normal);
            }
            
            .completion-content button:hover {
                background: var(--success-color);
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Показывает контекстную подсказку
     * @param {string} elementId - ID элемента
     * @param {string} message - сообщение подсказки
     * @param {number} duration - длительность показа
     */
    showContextualTooltip(elementId, message, duration = 3000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'contextual-tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--bg-secondary);
            border: 1px solid var(--primary-light);
            border-radius: var(--radius-md);
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            color: var(--text-primary);
            z-index: 10000;
            box-shadow: var(--shadow-lg);
            pointer-events: none;
            opacity: 0;
            transition: opacity var(--transition-normal);
        `;

        // Позиционируем подсказку
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;

        document.body.appendChild(tooltip);

        // Показываем подсказку
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 100);

        // Скрываем подсказку
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentElement) {
                    tooltip.remove();
                }
            }, 300);
        }, duration);
    }
}

// Экспортируем класс
window.TutorialManager = TutorialManager; 