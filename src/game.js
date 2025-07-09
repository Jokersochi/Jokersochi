// Optimized game logic with performance improvements
(function() {
    'use strict';
    
    // Cache DOM elements
    const DOM = {
        board: null,
        rollDice: null,
        log: null,
        moneyAmount: null,
        init() {
            this.board = document.getElementById('board');
            this.rollDice = document.getElementById('rollDice');
            this.log = document.getElementById('log');
            this.moneyAmount = document.getElementById('money-amount');
            
            // Проверяем что все необходимые элементы найдены
            if (!this.board || !this.rollDice || !this.log || !this.moneyAmount) {
                console.error('Ошибка: Не удалось найти все необходимые DOM элементы');
                throw new Error('Required DOM elements not found');
            }
        }
    };

    // Game data with optimized structure
    const boardData = [
        { id: 0, name: { ru: 'Старт', en: 'Start' } },
        { id: 1, name: { ru: 'Москва', en: 'Moscow' }, price: 100, rent: 10, color: 'red' },
        { id: 2, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance' },
        { id: 3, name: { ru: 'Санкт-Петербург', en: 'Saint Petersburg' }, price: 120, rent: 12, color: 'red' },
        { id: 4, name: { ru: 'Казна', en: 'Treasury' }, type: 'treasury' },
        { id: 5, name: { ru: 'Сочи', en: 'Sochi' }, price: 140, rent: 14, color: 'yellow' },
        { id: 6, name: { ru: 'Шанс', en: 'Chance' }, type: 'chance' },
        { id: 7, name: { ru: 'Казань', en: 'Kazan' }, price: 150, rent: 15, color: 'yellow' }
    ];

    const chanceCards = [
        { 
            ru: 'Вы выиграли билеты в Большой театр. Получите 50₽.', 
            en: 'You won tickets to the Bolshoi Theatre. Collect 50₽.',
            action: 'money',
            value: 50
        },
        { 
            ru: 'Транссибирское путешествие! Переместитесь на клетку \'Сочи\'.', 
            en: 'Trans-Siberian travel! Move to "Sochi" square.',
            action: 'move',
            target: 'Сочи'
        }
    ];

    // Game state
    const gameState = {
        players: [
            { id: 1, name: 'Игрок 1', position: 0, money: 500, properties: new Set() }
        ],
        currentPlayerIndex: 0,
        squares: new Map(),
        playerElements: new Map(),
        isMoving: false
    };

    // Performance optimized board rendering
    function renderBoard() {
        const fragment = document.createDocumentFragment();
        
        boardData.forEach(square => {
            const div = document.createElement('div');
            div.className = 'square';
            div.dataset.id = square.id;
            div.textContent = square.name.ru;
            
            // Cache square elements
            gameState.squares.set(square.id, div);
            fragment.appendChild(div);
        });

        DOM.board.appendChild(fragment);
        
        // Create and position initial token
        createPlayerToken(gameState.players[0]);
    }

    function createPlayerToken(player) {
        const token = document.createElement('div');
        token.id = `token-${player.id}`;
        token.className = 'token';
        
        // Cache token element
        gameState.playerElements.set(player.id, token);
        
        // Position token
        const startSquare = gameState.squares.get(0);
        startSquare.appendChild(token);
    }

    // Optimized dice roll with animation
    function rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    // Optimized player movement with smooth animation
    function movePlayer(player, steps) {
        if (gameState.isMoving) return;
        
        gameState.isMoving = true;
        DOM.rollDice.disabled = true;
        
        const oldPosition = player.position;
        player.position = (player.position + steps) % boardData.length;
        
        // Get cached elements
        const token = gameState.playerElements.get(player.id);
        const targetSquare = gameState.squares.get(player.position);
        
        // Animate movement
        token.style.transform = 'translate(-50%, -50%) scale(1.2)';
        
        setTimeout(() => {
            targetSquare.appendChild(token);
            token.style.transform = 'translate(-50%, -50%) scale(1)';
            
            log(`${player.name} переместился с ${oldPosition} на ${player.position}`);
            handleSquare(player);
            
            gameState.isMoving = false;
            DOM.rollDice.disabled = false;
        }, 300);
    }

    // Optimized square handling
    function handleSquare(player) {
        const square = boardData[player.position];
        
        if (square.price && !square.owner) {
            handlePropertyPurchase(player, square);
        } else if (square.owner && square.owner !== player.id) {
            payRent(player, square);
        } else if (square.type === 'chance') {
            drawChance(player);
        }
    }

    function handlePropertyPurchase(player, square) {
        if (player.money >= square.price) {
            // Use requestAnimationFrame for smooth UI updates
            requestAnimationFrame(() => {
                if (confirm(`Купить ${square.name.ru} за ${square.price}₽?`)) {
                    buyProperty(player, square);
                } else {
                    log(`${player.name} отказался от покупки.`);
                }
            });
        }
    }

    function buyProperty(player, square) {
        player.money -= square.price;
        player.properties.add(square.id);
        square.owner = player.id;
        
        // Update UI
        updatePlayerMoney(player);
        log(`${player.name} купил ${square.name.ru}`);
        
        // Visual feedback
        const squareElement = gameState.squares.get(square.id);
        squareElement.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            squareElement.style.backgroundColor = '';
        }, 1000);
    }

    function payRent(player, square) {
        const rent = square.rent;
        player.money -= rent;
        
        // Find owner efficiently
        const owner = gameState.players.find(p => p.id === square.owner);
        if (owner) {
            owner.money += rent;
            updatePlayerMoney(player);
            log(`${player.name} заплатил ${rent}₽ аренды игроку ${owner.name}`);
        }
    }

    // Optimized chance card handling
    function drawChance(player) {
        const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
        
        requestAnimationFrame(() => {
            alert(card.ru);
            log(`${player.name} вытянул карту: ${card.ru}`);
            
            // Execute card action
            executeCardAction(player, card);
        });
    }

    function executeCardAction(player, card) {
        switch (card.action) {
            case 'money':
                player.money += card.value;
                updatePlayerMoney(player);
                break;
            case 'move':
                const targetSquare = boardData.find(s => s.name.ru === card.target);
                if (targetSquare) {
                    const steps = (targetSquare.id - player.position + boardData.length) % boardData.length;
                    movePlayer(player, steps);
                }
                break;
        }
    }

    // Optimized UI updates
    function updatePlayerMoney(player) {
        if (DOM.moneyAmount) {
            DOM.moneyAmount.textContent = `${player.money}₽`;
        }
    }

    // Optimized logging with batching
    let logQueue = [];
    let logTimeout = null;

    function log(message) {
        logQueue.push(message);
        
        if (logTimeout) {
            clearTimeout(logTimeout);
        }
        
        logTimeout = setTimeout(() => {
            if (DOM.log) {
                DOM.log.textContent = logQueue.join(' | ');
            }
            logQueue = [];
        }, 100);
    }

    // Optimized event handling
    function initializeGame() {
        DOM.init();
        renderBoard();
        
        // Optimized event listener with throttling
        let lastClickTime = 0;
        DOM.rollDice.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastClickTime < 500) return; // Throttle clicks
            lastClickTime = now;
            
            if (gameState.isMoving) return;
            
            const steps = rollDice();
            log(`Выпало ${steps}`);
            movePlayer(gameState.players[gameState.currentPlayerIndex], steps);
        });
    }

    // Initialize game when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGame);
    } else {
        initializeGame();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (logTimeout) {
            clearTimeout(logTimeout);
        }
    });

})();
