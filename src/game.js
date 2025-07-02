// Basic data for prototype
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
  { ru: 'Вы выиграли билеты в Большой театр. Получите 50₽.', en: 'You won tickets to the Bolshoi Theatre. Collect 50₽.' },
  { ru: 'Транссибирское путешествие! Переместитесь на клетку \'Сочи\'.', en: 'Trans-Siberian travel! Move to "Sochi" square.' }
];

const players = [
  { id: 1, name: 'Игрок 1', position: 0, money: 500, properties: [] }
];
let currentPlayerIndex = 0;

function renderBoard() {
  const board = document.getElementById('board');
  boardData.forEach(square => {
    const div = document.createElement('div');
    div.className = 'square';
    div.dataset.id = square.id;
    div.textContent = square.name.ru;
    board.appendChild(div);
  });

  // place token
  const token = document.createElement('div');
  token.id = 'token-1';
  token.className = 'token';
  document.querySelector('.square[data-id="0"]').appendChild(token);
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function movePlayer(player, steps) {
  const oldPosition = player.position;
  player.position = (player.position + steps) % boardData.length;
  document.querySelector(`#token-${player.id}`).remove();
  const token = document.createElement('div');
  token.id = `token-${player.id}`;
  token.className = 'token';
  document.querySelector(`.square[data-id="${player.position}"]`).appendChild(token);
  log(`${player.name} переместился с ${oldPosition} на ${player.position}`);
  handleSquare(player);
}

function handleSquare(player) {
  const square = boardData[player.position];
  if (square.price && !square.owner) {
    // offer buy
    if (player.money >= square.price) {
      if (confirm(`Купить ${square.name.ru} за ${square.price}₽?`)) {
        buyProperty(player, square);
      } else {
        log(`${player.name} отказался от покупки.`);
        // Here could be auction logic
      }
    }
  } else if (square.owner && square.owner !== player.id) {
    payRent(player, square);
  } else if (square.type === 'chance') {
    drawChance(player);
  }
}

function buyProperty(player, square) {
  player.money -= square.price;
  player.properties.push(square.id);
  square.owner = player.id;
  log(`${player.name} купил ${square.name.ru}`);
}

function payRent(player, square) {
  const rent = square.rent;
  player.money -= rent;
  const owner = players.find(p => p.id === square.owner);
  owner.money += rent;
  log(`${player.name} заплатил ${rent}₽ аренды игроку ${owner.name}`);
}

function drawChance(player) {
  const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
  alert(card.ru);
  log(`${player.name} вытянул карту: ${card.ru}`);
  if (card.ru.includes('Большой театр')) {
    player.money += 50;
  } else if (card.ru.includes('Сочи')) {
    movePlayer(player, boardData.find(s => s.name.ru === 'Сочи').id - player.position);
  }
}

function log(message) {
  const logEl = document.getElementById('log');
  logEl.textContent = message;
}

document.getElementById('rollDice').addEventListener('click', () => {
  const steps = rollDice();
  log(`Выпало ${steps}`);
  movePlayer(players[currentPlayerIndex], steps);
});

renderBoard();
