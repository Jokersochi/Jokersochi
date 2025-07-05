import { boardData } from './board.js';
import { chanceCards, treasuryCards, drawCard } from './events.js';

// base player setup with placeholder token (emoji) and localization
export const players = [
  { id: 1, name: 'Игрок 1', token: '🚂', position: 0, money: 500, properties: [] },
  { id: 2, name: 'Player 2', token: '🚜', position: 0, money: 500, properties: [] }
];
let currentPlayerIndex = 0;
let language = 'ru';
// global modifiers affected by events
let rentModifier = 1;
let priceModifier = 1;

function applyModifiers(mod) {
  if (mod.rentModifier) rentModifier *= mod.rentModifier;
  if (mod.priceModifier) priceModifier *= mod.priceModifier;
}

// DOM helpers
const boardEl = document.getElementById('board');
const logEl = document.getElementById('log');
const langSelect = document.getElementById('lang');

langSelect.addEventListener('change', () => {
  language = langSelect.value;
  renderBoard();
});

// render board squares and tokens
export function renderBoard() {
  boardEl.innerHTML = '';
  boardData.forEach(square => {
    const div = document.createElement('div');
    div.className = 'square';
    div.dataset.id = square.id;
    div.style.backgroundColor = square.color || '#fff';
    div.textContent = square.name[language];
    boardEl.appendChild(div);
  });
  // place tokens
  players.forEach(p => {
    const token = document.createElement('div');
    token.className = 'token';
    token.textContent = p.token;
    document.querySelector(`.square[data-id="${p.position}"]`).appendChild(token);
  });
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function movePlayer(player, steps) {
  const oldPos = player.position;
  player.position = (player.position + steps) % boardData.length;
  log(`${player.name} ➡ ${oldPos} → ${player.position}`);
  renderBoard();
  handleSquare(player);
}

function handleSquare(player) {
  const square = boardData[player.position];
  if (square.type === 'property') {
    if (!square.owner) {
      offerPurchase(player, square);
    } else if (square.owner !== player.id) {
      payRent(player, square);
    }
  } else if (square.type === 'chance') {
    const card = drawCard(chanceCards);
    alert(card[language]);
    const pos = player.position;
    const result = card.action(player, boardData);
    if (result) applyModifiers(result);
    if (player.position !== pos) handleSquare(player);
  } else if (square.type === 'treasury') {
    const card = drawCard(treasuryCards);
    alert(card[language]);
    const pos = player.position;
    const result = card.action(player, boardData);
    if (result) applyModifiers(result);
    if (player.position !== pos) handleSquare(player);
  }
  renderBoard();
}

function offerPurchase(player, square) {
  const price = square.price * priceModifier;
  if (player.money < price) return;
  if (confirm(`${player.name}: ${square.name[language]} - ${price}₽?`)) {
    buyProperty(player, square);
  } else {
    auction(square);
  }
}

function buyProperty(player, square) {
  const price = square.price * priceModifier;
  player.money -= price;
  player.properties.push(square.id);
  square.owner = player.id;
  checkResidency(player, square.color);
  log(`${player.name} купил ${square.name[language]}`);
  offerImprovement(player, square);
}

function offerImprovement(player, square) {
  if (confirm(`${player.name}: улучшить ${square.name[language]} за ${square.improvementCost}₽?`)) {
    if (player.money >= square.improvementCost) {
      player.money -= square.improvementCost;
      square.improvements = (square.improvements || 0) + 1;
      log(`${player.name} улучшил ${square.name[language]}`);
    }
  }
}

function auction(square) {
  // simple auction: first other player willing to pay price gets property
  for (const p of players) {
    const price = square.price * priceModifier;
    if (!p.properties.includes(square.id) && p.money >= price) {
      if (confirm(`${p.name}, купить на аукционе ${square.name[language]} за ${price}₽?`)) {
        buyProperty(p, square);
        break;
      }
    }
  }
}

function payRent(player, square) {
  let rent = square.baseRent * (1 + 0.5 * (square.improvements || 0));
  if (square.residency) rent *= 2;
  rent *= rentModifier;
  if (square.owner) {
    const owner = players.find(p => p.id === square.owner);
    const bonus = owner.bonusRent || 1;
    rent *= bonus;
    player.money -= rent;
    owner.money += rent;
    owner.bonusRent = 1;
    log(`${player.name} заплатил ${rent}₽ игроку ${owner.name}`);
  }
}

function checkResidency(player, color) {
  const sameColor = boardData.filter(s => s.color === color);
  if (sameColor.every(sq => sq.owner === player.id)) {
    sameColor.forEach(sq => (sq.residency = true));
    log(`${player.name} построил резиденции на цвете ${color}`);
  }
}

export function nextTurn() {
  const player = players[currentPlayerIndex];
  if (player.skip) {
    log(`${player.name} пропускает ход`);
    player.skip = false;
  } else {
    const steps = rollDice();
    movePlayer(player, steps);
  }
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
}

// attach dice roll
document.getElementById('rollDice').addEventListener('click', nextTurn);

renderBoard();
