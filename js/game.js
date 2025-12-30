// Basic translations for multi-language support
const translations = {
  en: {
    buy: 'Buy',
    payRent: 'Pay rent',
    noMoney: 'Not enough money',
    build: 'Build',
    upgrade: 'Upgrade',
  },
  ru: {
    buy: 'Купить',
    payRent: 'Оплатить аренду',
    noMoney: 'Недостаточно денег',
    build: 'Построить',
    upgrade: 'Улучшить',
  },
};

// current UI language
let lang = 'en';
const langSelect = document.getElementById('lang');
const buildBtn = document.getElementById('build');
const upgradeBtn = document.getElementById('upgrade');
langSelect.addEventListener('change', e => {
  lang = e.target.value;
  if (buildBtn.style.display !== 'none') {
    buildBtn.textContent = translations[lang].build;
  }
  if (upgradeBtn.style.display !== 'none') {
    upgradeBtn.textContent = translations[lang].upgrade;
  }
  renderLog(`Language changed to ${lang}`);
});

// canvas context for simple board rendering
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = boardTiles.length * 100;

// Player class stores basic state of each participant
class Player {
  constructor(template) {
    Object.assign(this, JSON.parse(JSON.stringify(template)));
  }
}

const players = playerTemplates.map(t => new Player(t));
let currentPlayerIndex = 0;
let activePlayerIndex = null;
let pendingTurnAdvance = false;
let currentTile = null;
let modifiers = { rent: 1, movement: null, movementBonus: 0 };

buildBtn.addEventListener('click', () => {
  if (activePlayerIndex === null) return;
  const player = players[activePlayerIndex];
  if (currentTile && canBuildResidence(player, currentTile) && player.money >= currentTile.residenceCost) {
    player.money -= currentTile.residenceCost;
    currentTile.residence = true;
    updateRent(currentTile);
    renderLog(`${player.name} builds residence on ${currentTile.name[lang]}`);
    buildBtn.style.display = 'none';
  }
});

upgradeBtn.addEventListener('click', () => {
  if (activePlayerIndex === null) return;
  const player = players[activePlayerIndex];
  if (currentTile && canUpgrade(player, currentTile) && player.money >= currentTile.upgradeCost) {
    player.money -= currentTile.upgradeCost;
    currentTile.upgrades += 1;
    updateRent(currentTile);
    renderLog(`${player.name} upgrades ${currentTile.name[lang]}`);
    if (!canUpgrade(player, currentTile)) {
      upgradeBtn.style.display = 'none';
    }
  }
});

// draws the board and players tokens
function renderBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  boardTiles.forEach((tile, i) => {
    ctx.strokeRect(i * 100, 500, 100, 100);
    ctx.fillText(tile.name[lang], i * 100 + 10, 520);
    if (tile.owner !== undefined) {
      const owner = players.find(p => p.id === tile.owner);
      if (owner) ctx.fillText(owner.token, i * 100 + 80, 520);
    }
    if (tile.residence) {
      ctx.fillText('🏠', i * 100 + 40, 520);
    }
  });
  players.forEach(p => {
    ctx.fillText(p.token, p.position * 100 + 50, 550);
  });
}

// outputs a message to the log window
function renderLog(msg) {
  const log = document.getElementById('log');
  log.innerHTML += msg + '<br />';
  log.scrollTop = log.scrollHeight;
}

// simple 6-sided dice
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function applyRandomEvent() {
  modifiers = { rent: 1, movement: null, movementBonus: 0 };
  const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
  if (event) {
    event.effect(modifiers);
    renderLog(event[lang]);
  }
}

// proceed to next player's turn
function nextTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
}

function startAuction(tile) {
  renderLog(`Auction for ${tile.name[lang]}`);
  let highest = 0;
  let winner = null;
  players.forEach(p => {
    const bidStr = prompt(`${p.name} bid for ${tile.name[lang]} (0 pass)`);
    const bid = parseInt(bidStr, 10);
    if (!isNaN(bid) && bid > highest && bid <= p.money) {
      highest = bid;
      winner = p;
    }
  });
  if (winner) {
    winner.money -= highest;
    tile.owner = winner.id;
    winner.properties.push(tile.id);
    renderLog(`${winner.name} wins auction for ${tile.name[lang]} with ${highest}`);
  } else {
    renderLog(`No bids for ${tile.name[lang]}`);
  }
}

function canBuildResidence(player, tile) {
  if (!tile.color || tile.residence) return false;
  return boardTiles.filter(t => t.color === tile.color).every(t => t.owner === player.id);
}

function canUpgrade(player, tile) {
  if (!tile.color || tile.owner !== player.id) return false;
  return (tile.upgrades || 0) < 3;
}

function updateRent(tile) {
  tile.rent = tile.baseRent * (1 + 0.5 * (tile.upgrades || 0)) * (tile.residence ? 2 : 1);
}

// react to tile a player landed on
function handleTile(player, tile) {
  currentTile = tile;
  buildBtn.style.display = 'none';
  upgradeBtn.style.display = 'none';

  if (tile.type === 'chance') {
    const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
    card.effect(player);
    renderLog(card[lang]);
    return;
  }
  if (tile.type === 'treasury') {
    const card = treasuryCards[Math.floor(Math.random() * treasuryCards.length)];
    card.effect(player);
    renderLog(card[lang]);
    return;
  }
  if (tile.type === 'tax') {
    player.money -= tile.amount;
    renderLog(`${player.name} pays tax ${tile.amount}`);
    return;
  }
  if (!tile.owner && tile.price) {
    if (player.money >= tile.price) {
      const buy = confirm(`${player.name}: ${translations[lang].buy} ${tile.name[lang]} for ${tile.price}?`);
      if (buy) {
        player.money -= tile.price;
        tile.owner = player.id;
        player.properties.push(tile.id);
        renderLog(`${player.name} buys ${tile.name[lang]} for ${tile.price}`);
      } else {
        startAuction(tile);
      }
    } else {
      startAuction(tile);
    }
  } else if (tile.owner !== player.id) {
    let rent = tile.rent * modifiers.rent;
    rent = Math.round(rent);
    const owner = players.find(p => p.id === tile.owner);
    player.money -= rent;
    owner.money += rent;
    renderLog(`${player.name} ${translations[lang].payRent} ${rent} to ${owner.name}`);
  } else {
    if (canBuildResidence(player, tile)) {
      buildBtn.style.display = 'block';
      buildBtn.textContent = translations[lang].build + ` (${tile.residenceCost})`;
    }
    if (canUpgrade(player, tile)) {
      upgradeBtn.style.display = 'block';
      upgradeBtn.textContent = translations[lang].upgrade + ` (${tile.upgradeCost})`;
    }
  }
}

// move player token and apply tile effect
function movePlayer(player, steps) {
  let move = steps + (modifiers.movementBonus || 0);
  if (modifiers.movement !== null) {
    move = Math.min(move, modifiers.movement);
  }
  player.position = (player.position + move) % boardTiles.length;
  const tile = boardTiles[player.position];
  handleTile(player, tile);
}

// main action: roll dice and move token
document.getElementById('roll').addEventListener('click', () => {
  if (pendingTurnAdvance) {
    nextTurn();
    pendingTurnAdvance = false;
  }
  activePlayerIndex = currentPlayerIndex;
  const player = players[activePlayerIndex];
  applyRandomEvent();
  const roll = rollDice();
  renderLog(`${player.name} rolls ${roll}`);
  movePlayer(player, roll);
  renderBoard();
  pendingTurnAdvance = true;
});

// initial render
renderBoard();
renderLog('Game started');
