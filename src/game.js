/**
 * 🎲 Монополия России - Оптимизированная версия
 * Идеальная производительность и современный UX
 */

(function() {
    'use strict';

    // ===== PERFORMANCE MONITORING =====
    const Performance = {
        marks: new Map(),
        measures: new Map(),
        
        mark(name) {
            if (window.performance && window.performance.mark) {
                window.performance.mark(name);
                this.marks.set(name, Date.now());
            }
        },
        
        measure(name, startMark, endMark) {
            if (window.performance && window.performance.measure) {
                window.performance.measure(name, startMark, endMark);
                this.measures.set(name, Date.now());
            }
        },
        
        getMetrics() {
            return {
                marks: Array.from(this.marks.entries()),
                measures: Array.from(this.measures.entries())
            };
        }
    };

    // ===== ERROR BOUNDARY =====
    const ErrorBoundary = {
        init() {
            window.addEventListener('error', this.handleError.bind(this));
            window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
        },
        
        handleError(event) {
            console.error('Game Error:', event.error);
            this.showError('Произошла ошибка в игре', event.error.message);
        },
        
        handlePromiseError(event) {
            console.error('Promise Error:', event.reason);
            this.showError('Ошибка асинхронной операции', event.reason);
        },
        
        showError(title, message) {
            const errorEl = document.getElementById('error-boundary');
            const messageEl = document.getElementById('error-message');
            
            if (errorEl && messageEl) {
                messageEl.textContent = message;
                errorEl.classList.remove('hidden');
            }
        }
    };

    // ===== DOM CACHE =====
    const DOM = {
        elements: new Map(),
        
        init() {
            const selectors = {
                board: '#board',
                rollDice: '#rollDice',
                log: '#log',
                moneyAmount: '#money-amount',
                propertiesCount: '#properties-count',
                loading: '#loading',
                gameStats: '#game-stats',
                statsContent: '#stats-content',
                gameContainer: '#game-container'
            };
            
            Object.entries(selectors).forEach(([key, selector]) => {
                const element = document.querySelector(selector);
                if (element) {
                    this.elements.set(key, element);
                }
            });
        },
        
        get(key) {
            return this.elements.get(key);
        },
        
        set(key, element) {
            this.elements.set(key, element);
        }
    };

    // ===== GAME DATA =====
    const GameData = {
        board: [
            { id: 0, name: { ru: 'Старт', en: 'Start' }, type: 'start', icon: '🏁' },
            { id: 1, name: { ru: 'Москва', en: 'Moscow' }, price: 100, rent: 10, color: 'red', icon: '🏛️' },
            { id: 2, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance', icon: '🎲' },
            { id: 3, name: { ru: 'Санкт-Петербург', en: 'Saint Petersburg' }, price: 120, rent: 12, color: 'red', icon: '🏛️' },
            { id: 4, name: { ru: 'Казна', en: 'Treasury' }, type: 'treasury', icon: '💰' },
            { id: 5, name: { ru: 'Сочи', en: 'Sochi' }, price: 140, rent: 14, color: 'yellow', icon: '🏖️' },
            { id: 6, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance', icon: '🎲' },
            { id: 7, name: { ru: 'Казань', en: 'Kazan' }, price: 150, rent: 15, color: 'yellow', icon: '🕌' },
            { id: 8, name: { ru: 'Налог', en: 'Tax' }, type: 'tax', icon: '📋' },
            { id: 9, name: { ru: 'Екатеринбург', en: 'Yekaterinburg' }, price: 160, rent: 16, color: 'green', icon: '🏭' },
            { id: 10, name: { ru: 'Тюрьма', en: 'Jail' }, type: 'jail', icon: '🚔' },
            { id: 11, name: { ru: 'Новосибирск', en: 'Novosibirsk' }, price: 180, rent: 18, color: 'green', icon: '🏙️' },
            { id: 12, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance', icon: '🎲' },
            { id: 13, name: { ru: 'Владивосток', en: 'Vladivostok' }, price: 200, rent: 20, color: 'blue', icon: '⚓' },
            { id: 14, name: { ru: 'Казна', en: 'Treasury' }, type: 'treasury', icon: '💰' },
            { id: 15, name: { ru: 'Калининград', en: 'Kaliningrad' }, price: 220, rent: 22, color: 'blue', icon: '🏰' },
            { id: 16, name: { ru: 'Бесплатная стоянка', en: 'Free Parking' }, type: 'parking', icon: '🅿️' },
            { id: 17, name: { ru: 'Краснодар', en: 'Krasnodar' }, price: 240, rent: 24, color: 'purple', icon: '🌾' },
            { id: 18, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance', icon: '🎲' },
            { id: 19, name: { ru: 'Ростов-на-Дону', en: 'Rostov-on-Don' }, price: 260, rent: 26, color: 'purple', icon: '🌊' },
            { id: 20, name: { ru: 'Казна', en: 'Treasury' }, type: 'treasury', icon: '💰' },
            { id: 21, name: { ru: 'Уфа', en: 'Ufa' }, price: 280, rent: 28, color: 'orange', icon: '🏢' },
            { id: 22, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance', icon: '🎲' },
            { id: 23, name: { ru: 'Самара', en: 'Samara' }, price: 300, rent: 30, color: 'orange', icon: '🏭' },
            { id: 24, name: { ru: 'Отправляйтесь в тюрьму', en: 'Go to Jail' }, type: 'go-to-jail', icon: '🚨' },
            { id: 25, name: { ru: 'Волгоград', en: 'Volgograd' }, price: 320, rent: 32, color: 'brown', icon: '🗽' },
            { id: 26, name: { ru: 'Казна', en: 'Treasury' }, type: 'treasury', icon: '💰' },
            { id: 27, name: { ru: 'Пермь', en: 'Perm' }, price: 340, rent: 34, color: 'brown', icon: '🏔️' },
            { id: 28, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance', icon: '🎲' },
            { id: 29, name: { ru: 'Воронеж', en: 'Voronezh' }, price: 360, rent: 36, color: 'pink', icon: '🏛️' },
            { id: 30, name: { ru: 'Казна', en: 'Treasury' }, type: 'treasury', icon: '💰' },
            { id: 31, name: { ru: 'Саратов', en: 'Saratov' }, price: 380, rent: 38, color: 'pink', icon: '🌉' }
        ],
        
        chanceCards: [
            { 
                ru: 'Вы выиграли билеты в Большой театр! Получите 50₽.', 
                en: 'You won tickets to the Bolshoi Theatre! Collect 50₽.',
                action: 'money',
                value: 50,
                icon: '🎭'
            },
            { 
                ru: 'Транссибирское путешествие! Переместитесь в Сочи.', 
                en: 'Trans-Siberian travel! Move to Sochi.',
                action: 'move',
                target: 'Сочи',
                icon: '🚂'
            },
            {
                ru: 'Налоговая проверка! Заплатите 30₽.',
                en: 'Tax audit! Pay 30₽.',
                action: 'money',
                value: -30,
                icon: '📋'
            },
            {
                ru: 'Выигрыш в лотерею! Получите 100₽.',
                en: 'Lottery win! Collect 100₽.',
                action: 'money',
                value: 100,
                icon: '🎰'
            },
            {
                ru: 'Праздник в городе! Получите 25₽ от каждого игрока.',
                en: 'City celebration! Collect 25₽ from each player.',
                action: 'collect-from-all',
                value: 25,
                icon: '🎉'
            },
            {
                ru: 'Ремонт дорог! Заплатите 50₽.',
                en: 'Road repairs! Pay 50₽.',
                action: 'money',
                value: -50,
                icon: '🚧'
            }
        ],
        
        getSquareById(id) {
            return this.board.find(square => square.id === id);
        },
        
        getSquareByName(name) {
            return this.board.find(square => square.name.ru === name);
        }
    };

    // ===== GAME STATE =====
    const GameState = {
        players: [
            { 
                id: 1, 
                name: 'Игрок 1', 
                position: 0, 
                money: 500, 
                properties: new Set(),
                totalRentPaid: 0,
                totalRentReceived: 0,
                moves: 0,
                icon: '🔴'
            }
        ],
        currentPlayerIndex: 0,
        squares: new Map(),
        playerElements: new Map(),
        isMoving: false,
        gameStarted: false,
        gameStats: {
            totalMoves: 0,
            totalMoneyExchanged: 0,
            propertiesBought: 0,
            chanceCardsDrawn: 0
        },
        
        getCurrentPlayer() {
            return this.players[this.currentPlayerIndex];
        },
        
        updateStats(type, value = 1) {
            if (this.gameStats[type] !== undefined) {
                this.gameStats[type] += value;
            }
        }
    };

    // ===== ANIMATION ENGINE =====
    const AnimationEngine = {
        animations: new Map(),
        
        animate(element, keyframes, options = {}) {
            if (!element || !element.animate) return Promise.resolve();
            
            const animation = element.animate(keyframes, {
                duration: 300,
                easing: 'ease-in-out',
                fill: 'forwards',
                ...options
            });
            
            this.animations.set(element, animation);
            
            return new Promise(resolve => {
                animation.onfinish = () => {
                    this.animations.delete(element);
                    resolve();
                };
            });
        },
        
        stop(element) {
            const animation = this.animations.get(element);
            if (animation) {
                animation.cancel();
                this.animations.delete(element);
            }
        },
        
        bounce(element) {
            return this.animate(element, [
                { transform: 'translate(-50%, -50%) scale(1)' },
                { transform: 'translate(-50%, -50%) scale(1.3)' },
                { transform: 'translate(-50%, -50%) scale(1)' }
            ], { duration: 600 });
        },
        
        shake(element) {
            return this.animate(element, [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(0)' }
            ], { duration: 500 });
        }
    };

    // ===== SOUND ENGINE =====
    const SoundEngine = {
        audioContext: null,
        sounds: new Map(),
        
        init() {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Audio not supported');
            }
        },
        
        playTone(frequency, duration = 200) {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        },
        
        playDiceRoll() {
            this.playTone(800, 100);
            setTimeout(() => this.playTone(600, 100), 100);
            setTimeout(() => this.playTone(400, 200), 200);
        },
        
        playMoney() {
            this.playTone(1000, 150);
            setTimeout(() => this.playTone(1200, 150), 150);
        },
        
        playError() {
            this.playTone(200, 500);
        }
    };

    // ===== RENDERING ENGINE =====
    const RenderEngine = {
        renderBoard() {
            Performance.mark('render-board-start');
            
            const board = DOM.get('board');
            if (!board) {
                console.error('Board element not found!');
                return;
            }
            
            // Очищаем доску
            board.innerHTML = '';
            
            // Создаем полноценное игровое поле 8x8
            const fragment = document.createDocumentFragment();
            
            // Создаем игровое поле в виде квадрата 8x8
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const squareIndex = this.getSquareIndex(row, col);
                    const squareData = squareIndex >= 0 ? GameData.board[squareIndex] : this.createDefaultSquare(squareIndex);
                    
                    const div = document.createElement('div');
                    div.className = `square ${squareData.type || ''}`;
                    div.dataset.id = squareIndex >= 0 ? squareIndex : 'center';
                    div.dataset.type = squareData.type || 'empty';
                    div.dataset.row = row;
                    div.dataset.col = col;
                    
                    const content = document.createElement('div');
                    content.className = 'square-content';
                    content.innerHTML = `
                        <div class="square-icon">${squareData.icon || '🏠'}</div>
                        <div class="square-name">${squareData.name?.ru || `Клетка ${squareIndex}`}</div>
                        ${squareData.price ? `<div class="square-price">${squareData.price}₽</div>` : ''}
                    `;
                    
                    div.appendChild(content);
                    
                    if (squareIndex >= 0) {
                        GameState.squares.set(squareIndex, div);
                    }
                    
                    fragment.appendChild(div);
                }
            }
            
            board.appendChild(fragment);
            this.createPlayerToken(GameState.getCurrentPlayer());
            
            Performance.mark('render-board-end');
            Performance.measure('board-render', 'render-board-start', 'render-board-end');
            
            console.log('Board rendered successfully with', GameState.squares.size, 'squares');
        },
        
        getSquareIndex(row, col) {
            // Создаем поле по периметру 8x8
            // Верхняя сторона (0-7)
            if (row === 0) return col;
            // Правая сторона (8-15)
            if (col === 7) return 7 + row;
            // Нижняя сторона (16-23) - в обратном порядке
            if (row === 7) return 23 - col;
            // Левая сторона (24-31) - в обратном порядке
            if (col === 0) return 31 - row;
            // Центр поля - пустые клетки
            return -1;
        },
        
        createDefaultSquare(index) {
            if (index === -1) {
                return {
                    id: 'center',
                    name: { ru: 'Центр', en: 'Center' },
                    type: 'empty',
                    icon: '🎯'
                };
            }
            
            return {
                id: index,
                name: { ru: `Клетка ${index}`, en: `Square ${index}` },
                type: 'empty',
                icon: '🏠'
            };
        },
        
        createPlayerToken(player) {
            const token = document.createElement('div');
            token.id = `token-${player.id}`;
            token.className = 'token';
            token.innerHTML = player.icon;
            
            GameState.playerElements.set(player.id, token);
            
            const startSquare = GameState.squares.get(0);
            if (startSquare) {
                startSquare.appendChild(token);
                console.log('Player token created and placed on square 0');
            } else {
                console.error('Start square not found for token placement');
            }
        },
        
        updateSquare(squareId, className) {
            const square = GameState.squares.get(squareId);
            if (square) {
                square.className = `square ${className}`;
            }
        },
        
        updateUI() {
            const player = GameState.getCurrentPlayer();
            const moneyEl = DOM.get('moneyAmount');
            const propertiesEl = DOM.get('propertiesCount');
            
            if (moneyEl) {
                moneyEl.textContent = `${player.money}₽`;
            }
            
            if (propertiesEl) {
                propertiesEl.textContent = player.properties.size;
            }
        }
    };

    // ===== GAME LOGIC =====
    const GameLogic = {
        rollDice() {
            Performance.mark('dice-roll-start');
            
            const result = Math.floor(Math.random() * 6) + 1;
            SoundEngine.playDiceRoll();
            
            Performance.mark('dice-roll-end');
            Performance.measure('dice-roll', 'dice-roll-start', 'dice-roll-end');
            
            return result;
        },
        
        async movePlayer(player, steps) {
            if (GameState.isMoving) return;
            
            GameState.isMoving = true;
            GameState.updateStats('totalMoves');
            player.moves++;
            
            const rollDiceBtn = DOM.get('rollDice');
            if (rollDiceBtn) rollDiceBtn.disabled = true;
            
            const oldPosition = player.position;
            player.position = (player.position + steps) % GameData.board.length;
            
            const token = GameState.playerElements.get(player.id);
            const targetSquare = GameState.squares.get(player.position);
            
            if (token && targetSquare) {
                token.classList.add('moving');
                await AnimationEngine.bounce(token);
                
                targetSquare.appendChild(token);
                token.classList.remove('moving');
                
                await this.handleSquare(player);
            }
            
            GameState.isMoving = false;
            if (rollDiceBtn) rollDiceBtn.disabled = false;
            
            Logger.log(`${player.name} переместился с ${oldPosition} на ${player.position}`);
        },
        
        async handleSquare(player) {
            const square = GameData.getSquareById(player.position);
            if (!square) return;
            
            if (square.price && !square.owner) {
                await this.handlePropertyPurchase(player, square);
            } else if (square.owner && square.owner !== player.id) {
                await this.payRent(player, square);
            } else if (square.type === 'chance') {
                await this.drawChance(player);
            }
        },
        
        async handlePropertyPurchase(player, square) {
            if (player.money >= square.price) {
                const confirmed = await this.showConfirmDialog(
                    `Купить ${square.name.ru} за ${square.price}₽?`,
                    'Покупка собственности'
                );
                
                if (confirmed) {
                    this.buyProperty(player, square);
                } else {
                    Logger.log(`${player.name} отказался от покупки ${square.name.ru}`);
                }
            }
        },
        
        buyProperty(player, square) {
            player.money -= square.price;
            player.properties.add(square.id);
            square.owner = player.id;
            
            GameState.updateStats('propertiesBought');
            GameState.updateStats('totalMoneyExchanged', square.price);
            
            RenderEngine.updateSquare(square.id, 'owned');
            RenderEngine.updateUI();
            
            SoundEngine.playMoney();
            Logger.log(`${player.name} купил ${square.name.ru} за ${square.price}₽`);
        },
        
        async payRent(player, square) {
            const rent = square.rent;
            player.money -= rent;
            player.totalRentPaid += rent;
            
            const owner = GameState.players.find(p => p.id === square.owner);
            if (owner) {
                owner.money += rent;
                owner.totalRentReceived += rent;
            }
            
            GameState.updateStats('totalMoneyExchanged', rent);
            RenderEngine.updateUI();
            
            await AnimationEngine.shake(GameState.playerElements.get(player.id));
            Logger.log(`${player.name} заплатил ${rent}₽ аренды за ${square.name.ru}`);
        },
        
        async drawChance(player) {
            GameState.updateStats('chanceCardsDrawn');
            
            const card = GameData.chanceCards[Math.floor(Math.random() * GameData.chanceCards.length)];
            
            await this.showCardDialog(card);
            await this.executeCardAction(player, card);
        },
        
        async executeCardAction(player, card) {
            switch (card.action) {
                case 'money':
                    player.money += card.value;
                    GameState.updateStats('totalMoneyExchanged', Math.abs(card.value));
                    RenderEngine.updateUI();
                    
                    if (card.value > 0) {
                        SoundEngine.playMoney();
                    } else {
                        SoundEngine.playError();
                    }
                    break;
                    
                case 'move':
                    const targetSquare = GameData.getSquareByName(card.target);
                    if (targetSquare) {
                        const steps = (targetSquare.id - player.position + GameData.board.length) % GameData.board.length;
                        await this.movePlayer(player, steps);
                    }
                    break;
            }
        },
        
        showConfirmDialog(message, title = 'Подтверждение') {
            return new Promise(resolve => {
                const confirmed = confirm(message);
                resolve(confirmed);
            });
        },
        
        showCardDialog(card) {
            return new Promise(resolve => {
                const message = `${card.icon} ${card.ru}`;
                alert(message);
                resolve();
            });
        }
    };

    // ===== LOGGING SYSTEM =====
    const Logger = {
        queue: [],
        timeout: null,
        maxLogs: 10,
        
        log(message, type = 'info') {
            this.queue.push({ message, type, timestamp: Date.now() });
            
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            
            this.timeout = setTimeout(() => {
                this.flush();
            }, 100);
        },
        
        flush() {
            const logEl = DOM.get('log');
            if (!logEl) return;
            
            const messages = this.queue
                .slice(-this.maxLogs)
                .map(entry => `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`)
                .join('\n');
            
            logEl.textContent = messages;
            this.queue = [];
        },
        
        clear() {
            this.queue = [];
            const logEl = DOM.get('log');
            if (logEl) logEl.textContent = '';
        }
    };

    // ===== STATISTICS =====
    const Statistics = {
        show() {
            const statsEl = DOM.get('gameStats');
            const contentEl = DOM.get('statsContent');
            
            if (!statsEl || !contentEl) return;
            
            const player = GameState.getCurrentPlayer();
            const stats = GameState.gameStats;
            
            contentEl.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Всего ходов:</span>
                        <span class="stat-value">${stats.totalMoves}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Куплено собственности:</span>
                        <span class="stat-value">${stats.propertiesBought}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Карт шанса:</span>
                        <span class="stat-value">${stats.chanceCardsDrawn}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Обмен денег:</span>
                        <span class="stat-value">${stats.totalMoneyExchanged}₽</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Аренда получена:</span>
                        <span class="stat-value">${player.totalRentReceived}₽</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Аренда выплачена:</span>
                        <span class="stat-value">${player.totalRentPaid}₽</span>
                    </div>
                </div>
            `;
            
            statsEl.classList.remove('hidden');
        },
        
        hide() {
            const statsEl = DOM.get('gameStats');
            if (statsEl) {
                statsEl.classList.add('hidden');
            }
        }
    };

    // ===== EVENT HANDLERS =====
    const EventHandlers = {
        init() {
            this.setupDiceRoll();
            this.setupKeyboard();
            this.setupTouch();
        },
        
        setupDiceRoll() {
            const rollDiceBtn = DOM.get('rollDice');
            if (!rollDiceBtn) return;
            
            let lastClickTime = 0;
            
            rollDiceBtn.addEventListener('click', async (e) => {
                const now = Date.now();
                if (now - lastClickTime < 500) return; // Throttle
                lastClickTime = now;
                
                if (GameState.isMoving) return;
                
                const steps = GameLogic.rollDice();
                Logger.log(`🎲 Выпало: ${steps}`);
                await GameLogic.movePlayer(GameState.getCurrentPlayer(), steps);
            });
        },
        
        setupKeyboard() {
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !GameState.isMoving) {
                    e.preventDefault();
                    const rollDiceBtn = DOM.get('rollDice');
                    if (rollDiceBtn) rollDiceBtn.click();
                }
                
                if (e.code === 'KeyS') {
                    e.preventDefault();
                    Statistics.show();
                }
                
                if (e.code === 'Escape') {
                    Statistics.hide();
                }
            });
        },
        
        setupTouch() {
            let touchStartTime = 0;
            
            document.addEventListener('touchstart', (e) => {
                touchStartTime = Date.now();
            });
            
            document.addEventListener('touchend', (e) => {
                const touchDuration = Date.now() - touchStartTime;
                if (touchDuration > 500) {
                    Statistics.show();
                }
            });
        }
    };

    // ===== INITIALIZATION =====
    const Game = {
        async init() {
            Performance.mark('game-init-start');
            
            try {
                // Show loading
                const loadingEl = DOM.get('loading');
                if (loadingEl) loadingEl.classList.remove('hidden');
                
                // Initialize components
                DOM.init();
                ErrorBoundary.init();
                SoundEngine.init();
                
                // Render game
                RenderEngine.renderBoard();
                EventHandlers.init();
                
                // Hide loading
                if (loadingEl) loadingEl.classList.add('hidden');
                
                // Show welcome message
                Logger.log('🎮 Добро пожаловать в Монополию России!');
                Logger.log('💡 Нажмите пробел или кнопку для броска кубиков');
                Logger.log('📊 Удерживайте S для статистики');
                
                GameState.gameStarted = true;
                
                Performance.mark('game-init-end');
                Performance.measure('game-initialization', 'game-init-start', 'game-init-end');
                
            } catch (error) {
                ErrorBoundary.handleError({ error });
            }
        }
    };

    // ===== STARTUP =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Game.init);
    } else {
        Game.init();
    }

    // ===== CLEANUP =====
    window.addEventListener('beforeunload', () => {
        // Cleanup animations
        AnimationEngine.animations.forEach(animation => animation.cancel());
        
        // Save game state to localStorage
        try {
            localStorage.setItem('monopoly-russia-state', JSON.stringify({
                gameState: GameState,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Could not save game state');
        }
    });

    // ===== EXPOSE TO GLOBAL SCOPE FOR DEBUGGING =====
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.MonopolyRussia = {
            GameState,
            GameData,
            Performance,
            Statistics,
            Logger
        };
    }

})(); 