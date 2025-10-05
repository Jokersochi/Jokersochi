(() => {
  const storageKey = 'russian-monopoly-mvp-state';
  const statusBadges = document.getElementById('status-badges');
  const boardElement = document.getElementById('board');
  const playersList = document.getElementById('players-list');
  const logElement = document.getElementById('log');
  const cardDisplay = document.getElementById('card-display');
  const setupForm = document.getElementById('setup-form');
  const presetSelect = document.getElementById('preset-select');
  const languageSelect = document.getElementById('language-select');
  const startMoneyInput = document.getElementById('start-money');
  const rollButton = document.getElementById('btn-roll');
  const buyButton = document.getElementById('btn-buy');
  const endButton = document.getElementById('btn-end');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  const appTitle = document.getElementById('app-title');

  const FALLBACK = createFallback();

  const DATA_FILES = {
    board: 'data/board.json',
    chance: 'data/cards.chance.json',
    trial: 'data/cards.trial.json',
    locales: {
      ru: 'data/locales/ru.json',
      en: 'data/locales/en.json',
      de: 'data/locales/de.json',
      es: 'data/locales/es.json'
    },
    presets: 'data/presets.json'
  };

  const state = {
    data: {
      board: [],
      chance: [],
      trial: [],
      locales: {},
      presets: {}
    },
    locale: 'ru',
    players: [],
    ownership: {},
    decks: { chance: [], trial: [] },
    currentPlayer: 0,
    hasRolled: false,
    doublesCount: 0,
    started: false,
    settings: {
      startMoney: 1500,
      preset: 'rus'
    }
  };

  const tokenPool = [
    { id: 'balalaika', name: 'Балалайка', asset: 'assets/tokens/balalaika.svg' },
    { id: 'matryoshka', name: 'Матрёшка', asset: 'assets/tokens/matryoshka.svg' },
    { id: 'samovar', name: 'Самовар', asset: 'assets/tokens/samovar.svg' },
    { id: 'train', name: 'Паровоз', asset: 'assets/tokens/train.svg' },
    { id: 'bear', name: 'Медведь', asset: 'assets/tokens/bear.svg' },
    { id: 'sputnik', name: 'Спутник', asset: 'assets/tokens/sputnik.svg' }
  ];

  const keyboardShortcuts = {
    KeyR: () => rollButton.click(),
    KeyB: () => buyButton.click(),
    KeyE: () => endButton.click(),
    KeyL: cycleLanguage
  };

  const translations = new Map();

  document.addEventListener('keydown', (event) => {
    if (!state.started) return;
    const handler = keyboardShortcuts[event.code];
    if (handler) {
      event.preventDefault();
      handler();
    }
  });

  modalClose.addEventListener('click', () => modal.close());

  setupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const playerCount = Number.parseInt(event.target['player-count'].value, 10);
    const preset = event.target['preset-select'].value;
    const startMoney = Number.parseInt(event.target['start-money'].value, 10);

    if (Number.isNaN(playerCount) || playerCount < 2 || playerCount > 6) {
      showModal(getText('error_player_count'));
      return;
    }

    const presetData = state.data.presets[preset] || state.data.presets.rus;
    state.settings = {
      startMoney,
      preset,
      salary: presetData.salary,
      taxRate: presetData.taxRate,
      luxuryTax: presetData.luxuryTax,
      jailFine: presetData.jailFine,
      bailout: presetData.bailout
    };

    startGame(playerCount);
  });

  rollButton.addEventListener('click', () => {
    if (!state.started || state.hasRolled) return;
    performDiceRoll();
  });

  buyButton.addEventListener('click', () => {
    if (!state.started) return;
    attemptPurchase();
  });

  endButton.addEventListener('click', () => {
    if (!state.started) return;
    endTurn();
  });

  init();

  async function init() {
    appendBadge('info', getText('badge_loading'));
    try {
      await loadData();
      appendBadge('success', getText('badge_loaded'));
    } catch (error) {
      console.warn('Data loading fallback', error);
      appendBadge('warning', getText('badge_fallback'));
      state.data = FALLBACK;
    }
    populatePresetSelect();
    populateLanguageSelect();
    applyTranslations();
    cardDisplay.classList.add('empty');
    cardDisplay.textContent = getText('card_empty');
    hydrateFromStorage();
  }

  function populatePresetSelect() {
    presetSelect.innerHTML = '';
    Object.entries(state.data.presets)
      .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
      .forEach(([key, preset]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${preset.name} (${preset.salary})`;
        presetSelect.append(option);
      });
    presetSelect.value = state.settings.preset;
  }

  function populateLanguageSelect() {
    languageSelect.innerHTML = '';
    Object.keys(DATA_FILES.locales)
      .sort()
      .forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang.toUpperCase();
        languageSelect.append(option);
      });
    languageSelect.value = state.locale;
    languageSelect.onchange = () => {
      state.locale = languageSelect.value;
      applyTranslations();
      persistState();
    };
  }

  function cycleLanguage() {
    const languages = Object.keys(DATA_FILES.locales).sort();
    const index = languages.indexOf(state.locale);
    const next = languages[(index + 1) % languages.length];
    state.locale = next;
    languageSelect.value = next;
    applyTranslations();
    persistState();
  }

  async function loadData() {
    const [board, chance, trial, presets, locales] = await Promise.all([
      loadJson(DATA_FILES.board, FALLBACK.board),
      loadJson(DATA_FILES.chance, FALLBACK.chance),
      loadJson(DATA_FILES.trial, FALLBACK.trial),
      loadJson(DATA_FILES.presets, FALLBACK.presets),
      loadLocales()
    ]);
    state.data.board = [...board].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    state.data.chance = [...chance].sort((a, b) => a.id.localeCompare(b.id));
    state.data.trial = [...trial].sort((a, b) => a.id.localeCompare(b.id));
    state.data.presets = presets;
    state.data.locales = locales;
  }

  async function loadLocales() {
    const entries = await Promise.all(
      Object.entries(DATA_FILES.locales).map(async ([lang, path]) => {
        const data = await loadJson(path, FALLBACK.locales[lang]);
        return [lang, data];
      })
    );
    return Object.fromEntries(entries);
  }

  async function loadJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      appendBadge('warning', `${getText('badge_error_loading')} ${path}`);
      return fallback;
    }
  }

  function applyTranslations() {
    const dict = state.data.locales[state.locale] || state.data.locales.ru;
    translations.clear();
    Object.entries(dict).forEach(([key, value]) => translations.set(key, value));
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (translations.has(key)) {
        element.textContent = translations.get(key);
      }
    });
    appTitle.textContent = translations.get('app_title') || 'Русская Монополия';
    modalClose.textContent = translations.get('btn_close') || 'Закрыть';
    if (cardDisplay.classList.contains('empty')) {
      cardDisplay.textContent = translations.get('card_empty') || FALLBACK.locales.ru.card_empty;
    }
    refreshPlayerNames();
    if (state.players.length > 0) {
      renderPlayers();
    }
  }

  function getText(key) {
    return translations.get(key) || FALLBACK.locales.ru[key] || key;
  }

  function startGame(playerCount) {
    state.started = true;
    state.players = createPlayers(playerCount);
    refreshPlayerNames();
    state.ownership = {};
    state.currentPlayer = 0;
    state.hasRolled = false;
    state.decks = {
      chance: shuffle([...state.data.chance]),
      trial: shuffle([...state.data.trial])
    };
    cardDisplay.classList.add('empty');
    cardDisplay.textContent = getText('card_empty');
    state.doublesCount = 0;
    renderBoard();
    renderPlayers();
    updateControls();
    log(getText('log_game_started'), 'system');
    persistState();
  }

  function createPlayers(count) {
    const players = [];
    for (let index = 0; index < count; index += 1) {
      const token = tokenPool[index % tokenPool.length];
      players.push({
        id: `P${index + 1}`,
        baseIndex: index + 1,
        customName: null,
        name: `${getText('player')} ${index + 1}`,
        money: state.settings.startMoney,
        position: 0,
        inJail: false,
        jailTurns: 0,
        assets: [],
        token
      });
    }
    return players;
  }

  function renderBoard() {
    boardElement.innerHTML = '';
    state.data.board.forEach((cell) => {
      const template = document.getElementById('cell-template');
      const clone = template.content.firstElementChild.cloneNode(true);
      const nameElement = clone.querySelector('.cell-name');
      const priceElement = clone.querySelector('.cell-price');
      nameElement.textContent = translateCellName(cell);
      priceElement.textContent = formatPrice(cell.price);
      clone.dataset.cellId = cell.id;
      clone.addEventListener('click', () => inspectCell(cell));
      boardElement.append(clone);
    });
    updateBoardTokens();
  }

  function translateCellName(cell) {
    const localeKey = `cell_${cell.id}`;
    return getText(localeKey) || cell.name;
  }

  function inspectCell(cell) {
    const owner = state.ownership[cell.id];
    const ownerText = owner ? `${getText('owned_by')} ${findPlayer(owner).name}` : getText('no_owner');
    const content = document.createElement('div');
    content.innerHTML = `
      <h3>${translateCellName(cell)}</h3>
      <p>${getText('cell_type')}: ${describeCellType(cell.type)}</p>
      <p>${getText('cell_price')}: ${formatPrice(cell.price)}</p>
      <p>${getText('cell_owner')}: ${ownerText}</p>
    `;
    if (cell.microEvent) {
      const event = cell.microEvent;
      const micro = document.createElement('p');
      micro.textContent = `${getText('micro_event_label')}: ${event.name}`;
      content.append(micro);
    }
    if (cell.contract) {
      const contract = document.createElement('p');
      contract.textContent = `${getText('contract_label')}: ${cell.contract.name}`;
      content.append(contract);
    }
    showModal(content);
  }

  function describeCellType(type) {
    const key = `celltype_${type}`;
    return getText(key);
  }

  function renderPlayers() {
    playersList.innerHTML = '';
    const template = document.getElementById('player-template');
    state.players.forEach((player, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const nameElement = node.querySelector('.player-name');
      const moneyElement = node.querySelector('.player-money');
      const statusElement = node.querySelector('.player-status');
      const assetsElement = node.querySelector('.player-assets');
      node.dataset.playerId = player.id;
      nameElement.textContent = `${player.name}${state.currentPlayer === index ? ' — ' + getText('active') : ''}`;
      moneyElement.textContent = formatPrice(player.money);
      statusElement.textContent = player.inJail ? getText('status_in_jail') : getText('status_free');
      const tokenImage = node.querySelector('.player-token');
      tokenImage.src = player.token.asset;
      tokenImage.alt = player.token.name;
      assetsElement.innerHTML = '';
      player.assets.forEach((asset) => {
        const item = document.createElement('li');
        item.textContent = translateCellName(asset);
        assetsElement.append(item);
      });
      playersList.append(node);
    });
    updateBoardTokens();
  }

  function updateBoardTokens() {
    boardElement.querySelectorAll('.cell').forEach((cellElement) => {
      const container = cellElement.querySelector('.cell-players');
      container.innerHTML = '';
      const cellId = cellElement.dataset.cellId;
      state.players
        .filter((player) => state.data.board[player.position]?.id === cellId)
        .forEach((player) => {
          const img = document.createElement('img');
          img.src = player.token.asset;
          img.alt = player.name;
          img.title = player.name;
          container.append(img);
        });
    });
  }

  function performDiceRoll() {
    const player = currentPlayer();
    const dice1 = randomDice();
    const dice2 = randomDice();
    const sum = dice1 + dice2;
    const isDouble = dice1 === dice2;
    log(`${player.name}: ${getText('rolled')} ${dice1} + ${dice2} = ${sum}`);
    if (player.inJail) {
      if (isDouble) {
        player.inJail = false;
        player.jailTurns = 0;
        log(getText('jail_escape_doubles'));
      } else {
        player.jailTurns += 1;
        if (player.jailTurns >= 3) {
          adjustMoney(player, -state.settings.jailFine, getText('jail_fine_paid'));
          player.inJail = false;
          player.jailTurns = 0;
        } else {
          state.hasRolled = true;
          endTurn();
          return;
        }
      }
    }

    movePlayer(player, sum);
    state.hasRolled = true;
    if (isDouble) {
      state.doublesCount += 1;
      if (state.doublesCount >= 3) {
        sendToJail(player, getText('jail_three_doubles'));
        endTurn();
        return;
      }
      log(getText('extra_turn_doubles'));
      state.hasRolled = false;
    } else {
      state.doublesCount = 0;
    }
    updateControls();
    persistState();
  }

  function movePlayer(player, steps) {
    const totalCells = state.data.board.length;
    if (totalCells === 0) return;
    const rawTarget = player.position + steps;
    if (steps > 0) {
      const passes = Math.floor((player.position + steps) / totalCells);
      for (let index = 0; index < passes; index += 1) {
        adjustMoney(player, state.settings.salary, getText('passed_start'));
      }
    }
    let adjusted = rawTarget % totalCells;
    if (adjusted < 0) adjusted += totalCells;
    player.position = adjusted;
    updateBoardTokens();
    resolveCell(state.data.board[adjusted], player);
  }

  function resolveCell(cell, player) {
    switch (cell.type) {
      case 'start':
        adjustMoney(player, state.settings.salary, getText('landed_start'));
        break;
      case 'property':
      case 'transport':
      case 'utility':
        handleProperty(cell, player);
        break;
      case 'tax':
        handleTax(cell, player);
        break;
      case 'chance':
        drawCard('chance', player);
        break;
      case 'trial':
        drawCard('trial', player);
        break;
      case 'jail':
        log(getText('visit_jail'));
        break;
      case 'goto-jail':
        sendToJail(player, getText('goto_jail'));
        break;
      case 'micro-event':
        triggerMicroEvent(cell, player);
        break;
      case 'contract':
        offerContract(cell, player);
        break;
      default:
        log(`${player.name}: ${getText('landed')} ${translateCellName(cell)}`);
    }
  }

  function handleProperty(cell, player) {
    const ownerId = state.ownership[cell.id];
    if (!ownerId) {
      log(`${player.name}: ${getText('landed')} ${translateCellName(cell)} — ${getText('offer_purchase')}`);
      buyButton.disabled = false;
      buyButton.dataset.cellId = cell.id;
      return;
    }
    if (ownerId === player.id) {
      log(getText('landed_own_property'));
      return;
    }
    const owner = findPlayer(ownerId);
    const rent = calculateRent(cell);
    adjustMoney(player, -rent, `${getText('paid_rent')} ${owner.name}`);
    adjustMoney(owner, rent, `${getText('received_rent')} ${player.name}`);
    if (player.money < 0) {
      handleBankruptcy(player);
    }
  }

  function calculateRent(cell) {
    if (typeof cell.rent === 'number') return cell.rent;
    if (!cell.rent) return Math.round((cell.price || 0) * 0.1);
    if (cell.rent.fixed) return cell.rent.fixed;
    if (cell.rent.multiplier) return Math.round((cell.price || 0) * cell.rent.multiplier);
    return Math.round((cell.price || 0) * 0.1);
  }

  function handleTax(cell, player) {
    const amount = cell.amount || Math.round(state.settings.startMoney * state.settings.taxRate);
    adjustMoney(player, -amount, getText('paid_tax'));
    if (player.money < 0) handleBankruptcy(player);
  }

  function drawCard(deckKey, player) {
    const deck = state.decks[deckKey];
    if (deck.length === 0) {
      state.decks[deckKey] = shuffle([...state.data[deckKey]]);
    }
    const card = state.decks[deckKey].shift();
    cardDisplay.classList.remove('empty');
    cardDisplay.innerHTML = `
      <h3>${card.title}</h3>
      <p>${card.text}</p>
    `;
    log(`${player.name}: ${card.title}`);
    applyEffect(card.effect, player);
  }

  function triggerMicroEvent(cell, player) {
    const event = cell.microEvent;
    if (!event) return;
    log(`${player.name}: ${event.name}`);
    applyEffect(event.effect, player);
  }

  function offerContract(cell, player) {
    const contract = cell.contract;
    if (!contract) return;
    const already = player.assets.some((asset) => asset.id === cell.id);
    if (already) {
      log(getText('contract_owned'));
      return;
    }
    const cost = contract.cost;
    if (player.money < cost) {
      log(getText('not_enough_contract'));
      return;
    }
    const confirm = window.confirm(`${contract.name}\n${contract.description}\n${getText('confirm_contract')} ${formatPrice(cost)}?`);
    if (!confirm) return;
    adjustMoney(player, -cost, getText('contract_bought'));
    player.assets.push(cell);
    applyEffect(contract.effect, player);
  }

  function attemptPurchase() {
    const cellId = buyButton.dataset.cellId;
    if (!cellId) return;
    const cell = state.data.board.find((item) => item.id === cellId);
    if (!cell) return;
    const player = currentPlayer();
    if (player.money < cell.price) {
      log(getText('not_enough_money'));
      return;
    }
    adjustMoney(player, -cell.price, `${getText('purchased')} ${translateCellName(cell)}`);
    state.ownership[cell.id] = player.id;
    player.assets.push(cell);
    buyButton.disabled = true;
    buyButton.dataset.cellId = '';
    renderPlayers();
    persistState();
  }

  function adjustMoney(player, delta, reason) {
    player.money += delta;
    const amount = formatPrice(Math.abs(delta));
    const prefix = delta >= 0 ? '+' : '-';
    const entry = `${player.name}: ${prefix}${amount} — ${reason}`;
    log(entry);
    renderPlayers();
  }

  function endTurn() {
    if (!state.started) return;
    if (!state.hasRolled) {
      log(getText('must_roll_first'));
      return;
    }
    buyButton.disabled = true;
    buyButton.dataset.cellId = '';
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    state.hasRolled = false;
    updateControls();
    renderPlayers();
    persistState();
  }

  function updateControls() {
    const player = currentPlayer();
    rollButton.disabled = !state.started || state.hasRolled;
    endButton.disabled = !state.started || (!state.hasRolled && !player.inJail);
    buyButton.disabled = true;
    if (player.inJail && !state.hasRolled) {
      showModal(`${player.name} — ${getText('in_jail_prompt')}`);
    }
  }

  function currentPlayer() {
    return state.players[state.currentPlayer];
  }

  function findPlayer(id) {
    return state.players.find((player) => player.id === id);
  }

  function randomDice() {
    return Math.floor(Math.random() * 6) + 1;
  }

  function shuffle(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const j = Math.floor(Math.random() * (index + 1));
      [array[index], array[j]] = [array[j], array[index]];
    }
    return array;
  }

  function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logElement.prepend(entry);
  }

  function sendToJail(player, reason) {
    const jailIndex = state.data.board.findIndex((cell) => cell.type === 'jail');
    if (jailIndex === -1) return;
    player.position = jailIndex;
    player.inJail = true;
    player.jailTurns = 0;
    log(`${player.name}: ${reason}`);
    updateBoardTokens();
  }

  function handleBankruptcy(player) {
    log(`${player.name} ${getText('bankrupted')}`, 'warning');
    player.assets.forEach((asset) => {
      delete state.ownership[asset.id];
    });
    player.assets = [];
    player.money = 0;
  }

  function showModal(content) {
    modalContent.innerHTML = '';
    if (typeof content === 'string') {
      modalContent.textContent = content;
    } else {
      modalContent.append(content);
    }
    if (!modal.open) modal.showModal();
  }

  function formatPrice(value) {
    if (!value && value !== 0) return getText('free');
    return new Intl.NumberFormat(state.locale === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(value);
  }

  function applyEffect(effect = {}, player) {
    if (effect.money) {
      adjustMoney(player, effect.money, getText('effect_money'));
    }
    if (effect.move) {
      movePlayer(player, effect.move);
    }
    if (typeof effect.moveTo === 'number') {
      const totalCells = state.data.board.length;
      if (totalCells > 0) {
        const target = ((effect.moveTo % totalCells) + totalCells) % totalCells;
        const previous = player.position;
        if (target < previous) {
          adjustMoney(player, state.settings.salary, getText('passed_start'));
        }
        player.position = target;
        updateBoardTokens();
        resolveCell(state.data.board[player.position], player);
      }
    }
    if (effect.jail) {
      sendToJail(player, getText('card_to_jail'));
    }
    if (effect.release) {
      player.inJail = false;
      player.jailTurns = 0;
      log(getText('card_release'));
    }
    if (effect.collectEach) {
      state.players.forEach((other) => {
        if (other.id !== player.id) {
          adjustMoney(other, -effect.collectEach, getText('paid_shared_event'));
          adjustMoney(player, effect.collectEach, getText('received_shared_event'));
        }
      });
    }
  }

  function refreshPlayerNames() {
    state.players.forEach((player, index) => {
      if (!player.customName) {
        const baseIndex = player.baseIndex || index + 1;
        player.name = `${getText('player')} ${baseIndex}`;
      }
    });
  }

  function persistState() {
    if (!state.started) return;
    const payload = {
      state,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      appendBadge('info', getText('badge_saved'));
    } catch (error) {
      appendBadge('warning', getText('badge_storage_error'));
      console.warn('Persist error', error);
    }
  }

  function hydrateFromStorage() {
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (!savedRaw) return;
      const { state: savedState } = JSON.parse(savedRaw);
      Object.assign(state, {
        ...state,
        ...savedState,
        data: state.data
      });
      state.players = savedState.players || [];
      state.ownership = savedState.ownership || {};
      state.decks = savedState.decks || state.decks;
      state.started = savedState.started;
      state.currentPlayer = savedState.currentPlayer || 0;
      state.locale = savedState.locale || state.locale;
      state.settings = savedState.settings || state.settings;
      if (state.started && state.players.length > 0) {
        populatePresetSelect();
        presetSelect.value = state.settings.preset;
        startMoneyInput.value = state.settings.startMoney;
        populateLanguageSelect();
        languageSelect.value = state.locale;
        applyTranslations();
        renderBoard();
        renderPlayers();
        updateControls();
        appendBadge('success', getText('badge_restored'));
      }
    } catch (error) {
      appendBadge('warning', getText('badge_restore_failed'));
      console.warn('Restore failed', error);
    }
  }

  function appendBadge(type, text) {
    if (!text) return;
    const badge = document.createElement('span');
    badge.className = `badge badge-${type}`;
    badge.textContent = text;
    statusBadges.append(badge);
    setTimeout(() => badge.remove(), 8000);
  }

  function createFallback() {
    const board = JSON.parse(`[
  {
    "id": "B02",
    "name": "Калининград",
    "type": "property",
    "price": 120,
    "rent": {
      "multiplier": 0.4
    },
    "category": "Города - Балтийский регион",
    "order": 2,
    "color": "#005f99"
  },
  {
    "id": "B03",
    "name": "Псков",
    "type": "property",
    "price": 140,
    "rent": {
      "multiplier": 0.42
    },
    "category": "Города - Балтийский регион",
    "order": 3,
    "color": "#1a6fb3"
  },
  {
    "id": "B26",
    "name": "Владивосток",
    "type": "property",
    "price": 300,
    "rent": {
      "multiplier": 0.68
    },
    "category": "Города - Дальний Восток",
    "order": 26,
    "color": "#264653"
  },
  {
    "id": "B27",
    "name": "Хабаровск",
    "type": "property",
    "price": 280,
    "rent": {
      "multiplier": 0.65
    },
    "category": "Города - Дальний Восток",
    "order": 27,
    "color": "#2a6f97"
  },
  {
    "id": "B14",
    "name": "Сочи",
    "type": "property",
    "price": 260,
    "rent": {
      "multiplier": 0.6
    },
    "category": "Города - Кавказ",
    "order": 14,
    "color": "#ff7f51"
  },
  {
    "id": "B15",
    "name": "Владикавказ",
    "type": "property",
    "price": 240,
    "rent": {
      "multiplier": 0.58
    },
    "category": "Города - Кавказ",
    "order": 15,
    "color": "#ff9f1c"
  },
  {
    "id": "B07",
    "name": "Мурманск",
    "type": "property",
    "price": 150,
    "rent": {
      "multiplier": 0.44
    },
    "category": "Города - Кольский полуостров",
    "order": 7,
    "color": "#0b4f6c"
  },
  {
    "id": "B10",
    "name": "Тула",
    "type": "property",
    "price": 200,
    "rent": {
      "multiplier": 0.55
    },
    "category": "Города - Московский регион",
    "order": 10,
    "color": "#8f2d56"
  },
  {
    "id": "B11",
    "name": "Коломна",
    "type": "property",
    "price": 210,
    "rent": {
      "multiplier": 0.56
    },
    "category": "Города - Московский регион",
    "order": 11,
    "color": "#a63d40"
  },
  {
    "id": "B12",
    "name": "Москва",
    "type": "property",
    "price": 340,
    "rent": {
      "multiplier": 0.72
    },
    "category": "Города - Московский регион",
    "order": 12,
    "color": "#d62828"
  },
  {
    "id": "B17",
    "name": "Казань",
    "type": "property",
    "price": 280,
    "rent": {
      "multiplier": 0.63
    },
    "category": "Города - Поволжье",
    "order": 17,
    "color": "#5a189a"
  },
  {
    "id": "B18",
    "name": "Нижний Новгород",
    "type": "property",
    "price": 260,
    "rent": {
      "multiplier": 0.6
    },
    "category": "Города - Поволжье",
    "order": 18,
    "color": "#7b2cbf"
  },
  {
    "id": "B19",
    "name": "Самара",
    "type": "property",
    "price": 250,
    "rent": {
      "multiplier": 0.59
    },
    "category": "Города - Поволжье",
    "order": 19,
    "color": "#9d4edd"
  },
  {
    "id": "B05",
    "name": "Санкт-Петербург",
    "type": "property",
    "price": 180,
    "rent": {
      "multiplier": 0.5
    },
    "category": "Города - Северо-Запад",
    "order": 5,
    "color": "#214091"
  },
  {
    "id": "B06",
    "name": "Великий Новгород",
    "type": "property",
    "price": 160,
    "rent": {
      "multiplier": 0.46
    },
    "category": "Города - Северо-Запад",
    "order": 6,
    "color": "#3560b5"
  },
  {
    "id": "B23",
    "name": "Новосибирск",
    "type": "property",
    "price": 280,
    "rent": {
      "multiplier": 0.65
    },
    "category": "Города - Сибирь",
    "order": 23,
    "color": "#073b4c"
  },
  {
    "id": "B24",
    "name": "Красноярск",
    "type": "property",
    "price": 270,
    "rent": {
      "multiplier": 0.63
    },
    "category": "Города - Сибирь",
    "order": 24,
    "color": "#26547c"
  },
  {
    "id": "B25",
    "name": "Иркутск",
    "type": "property",
    "price": 260,
    "rent": {
      "multiplier": 0.61
    },
    "category": "Города - Сибирь",
    "order": 25,
    "color": "#2a9d8f"
  },
  {
    "id": "B21",
    "name": "Екатеринбург",
    "type": "property",
    "price": 260,
    "rent": {
      "multiplier": 0.6
    },
    "category": "Города - Урал",
    "order": 21,
    "color": "#06d6a0"
  },
  {
    "id": "B22",
    "name": "Пермь",
    "type": "property",
    "price": 240,
    "rent": {
      "multiplier": 0.58
    },
    "category": "Города - Урал",
    "order": 22,
    "color": "#118ab2"
  },
  {
    "id": "B30",
    "name": "Северсвязь",
    "type": "utility",
    "price": 220,
    "rent": {
      "fixed": 120
    },
    "category": "Инфраструктура - Связь",
    "order": 30,
    "color": "#4cc9f0"
  },
  {
    "id": "B13",
    "name": "Аэроэкспресс",
    "type": "transport",
    "price": 220,
    "rent": {
      "fixed": 120
    },
    "category": "Инфраструктура - Транспорт",
    "order": 13,
    "color": "#ff4d6d"
  },
  {
    "id": "B20",
    "name": "ВолгаЭнерго",
    "type": "utility",
    "price": 200,
    "rent": {
      "fixed": 110
    },
    "category": "Инфраструктура - Энергетика",
    "order": 20,
    "color": "#ffd166"
  },
  {
    "id": "B01",
    "name": "Старт",
    "type": "start",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 1
  },
  {
    "id": "B04",
    "name": "Шанс",
    "type": "chance",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 4
  },
  {
    "id": "B08",
    "name": "Региональный налог",
    "type": "tax",
    "price": 0,
    "rent": 0,
    "amount": 180,
    "category": "Особые",
    "order": 8
  },
  {
    "id": "B09",
    "name": "Грантовый конкурс",
    "type": "trial",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 9
  },
  {
    "id": "B16",
    "name": "Шанс",
    "type": "chance",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 16
  },
  {
    "id": "B28",
    "name": "Фестиваль варенья",
    "type": "micro-event",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 28,
    "microEvent": {
      "id": "ME01",
      "name": "Фестиваль варенья",
      "type": "bonus",
      "description": "Посетители фестиваля покупают ваш фирменный десерт.",
      "effect": {
        "money": 200
      }
    }
  },
  {
    "id": "B29",
    "name": "Полярный исследователь",
    "type": "contract",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 29,
    "contract": {
      "id": "CT01",
      "name": "Полярный исследователь",
      "type": "expedition",
      "description": "Нанимает команду для экспедиции на Север и приносит премию.",
      "cost": 150,
      "effect": {
        "money": 220
      }
    }
  },
  {
    "id": "B31",
    "name": "Общественный совет",
    "type": "trial",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 31
  },
  {
    "id": "B32",
    "name": "Следственный комитет",
    "type": "goto-jail",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 32
  }
]`);
    const chance = JSON.parse(`[
  {
    "id": "C01",
    "type": "money",
    "title": "Грант на инновации",
    "text": "Вы побеждаете в конкурсе технологических проектов и получаете 200 ₽.",
    "effect": {
      "money": 200
    }
  },
  {
    "id": "C02",
    "type": "move",
    "title": "Экспресс до Москвы",
    "text": "Отправляйтесь на клетку Москва (B12). Если проходите старт, получите зарплату.",
    "effect": {
      "moveTo": 11
    }
  },
  {
    "id": "C03",
    "type": "penalty",
    "title": "Штраф за парковку",
    "text": "Оплатите 100 ₽ в городской бюджет.",
    "effect": {
      "money": -100
    }
  },
  {
    "id": "C04",
    "type": "money",
    "title": "Дивиденды по акциям",
    "text": "Вам начислены дивиденды — получите 160 ₽.",
    "effect": {
      "money": 160
    }
  },
  {
    "id": "C05",
    "type": "move",
    "title": "Северный ветер",
    "text": "Переместитесь вперёд на 3 клетки.",
    "effect": {
      "move": 3
    }
  },
  {
    "id": "C06",
    "type": "jail",
    "title": "Проверка документов",
    "text": "Отправляйтесь напрямую в тюрьму (B09).",
    "effect": {
      "jail": true
    }
  },
  {
    "id": "C07",
    "type": "release",
    "title": "Лучший адвокат",
    "text": "Сохраните карту и используйте, чтобы выйти из тюрьмы. В прототипе эффект применяется сразу.",
    "effect": {
      "release": true
    }
  },
  {
    "id": "C08",
    "type": "collect",
    "title": "Сбор на реставрацию",
    "text": "Каждый игрок перечисляет вам по 60 ₽.",
    "effect": {
      "collectEach": 60
    }
  },
  {
    "id": "C09",
    "type": "money",
    "title": "Налоговая льгота",
    "text": "Получите компенсацию 120 ₽ от государства.",
    "effect": {
      "money": 120
    }
  },
  {
    "id": "C10",
    "type": "penalty",
    "title": "Неожиданная проверка",
    "text": "Заплатите 90 ₽ штрафа.",
    "effect": {
      "money": -90
    }
  },
  {
    "id": "C11",
    "type": "move",
    "title": "Региональный форум",
    "text": "Перейдите на ближайшую клетку trial и выполните её эффект.",
    "effect": {
      "moveTo": 8
    }
  },
  {
    "id": "C12",
    "type": "money",
    "title": "Сезон туристов",
    "text": "Ваша курортная недвижимость приносит 130 ₽.",
    "effect": {
      "money": 130
    }
  },
  {
    "id": "C13",
    "type": "penalty",
    "title": "Протечка труб",
    "text": "Оплатите ремонт — 70 ₽.",
    "effect": {
      "money": -70
    }
  },
  {
    "id": "C14",
    "type": "money",
    "title": "Федеральная субсидия",
    "text": "Получите 180 ₽ на развитие инфраструктуры.",
    "effect": {
      "money": 180
    }
  },
  {
    "id": "C15",
    "type": "move",
    "title": "Скоростной поезд",
    "text": "Перейдите на клетку Аэроэкспресс (B13).",
    "effect": {
      "moveTo": 12
    }
  },
  {
    "id": "C16",
    "type": "penalty",
    "title": "Срыв контракта",
    "text": "Верните 110 ₽ инвестору.",
    "effect": {
      "money": -110
    }
  },
  {
    "id": "C17",
    "type": "money",
    "title": "Культурный сезон",
    "text": "Организация фестивалей приносит 90 ₽.",
    "effect": {
      "money": 90
    }
  },
  {
    "id": "C18",
    "type": "move",
    "title": "Дорожная развязка",
    "text": "Вернитесь на 2 клетки назад.",
    "effect": {
      "move": -2
    }
  },
  {
    "id": "C19",
    "type": "money",
    "title": "Инвесторы довольны",
    "text": "Получите премию 140 ₽.",
    "effect": {
      "money": 140
    }
  },
  {
    "id": "C20",
    "type": "penalty",
    "title": "Экологический сбор",
    "text": "Заплатите 80 ₽ за переработку отходов.",
    "effect": {
      "money": -80
    }
  }
]`);
    const trial = JSON.parse(`[
  {
    "id": "T01",
    "type": "money",
    "title": "Городской фестиваль",
    "text": "Вы помогли организовать праздник и получаете благодарность 100 ₽.",
    "effect": {
      "money": 100
    }
  },
  {
    "id": "T02",
    "type": "money",
    "title": "Бонусная стипендия",
    "text": "Получите 50 ₽ от университета.",
    "effect": {
      "money": 50
    }
  },
  {
    "id": "T03",
    "type": "penalty",
    "title": "Благотворительный взнос",
    "text": "Перечислите 60 ₽ в фонд помощи.",
    "effect": {
      "money": -60
    }
  },
  {
    "id": "T04",
    "type": "money",
    "title": "Грант на урбанистику",
    "text": "Получите 200 ₽ на развитие района.",
    "effect": {
      "money": 200
    }
  },
  {
    "id": "T05",
    "type": "move",
    "title": "Туристический маршрут",
    "text": "Продвиньтесь на 2 клетки вперёд.",
    "effect": {
      "move": 2
    }
  },
  {
    "id": "T06",
    "type": "money",
    "title": "Возврат налога",
    "text": "Казначейство возвращает 80 ₽.",
    "effect": {
      "money": 80
    }
  },
  {
    "id": "T07",
    "type": "penalty",
    "title": "Поддержка музея",
    "text": "Пожертвуйте 40 ₽ на обновление экспозиции.",
    "effect": {
      "money": -40
    }
  },
  {
    "id": "T08",
    "type": "release",
    "title": "Волонтёрская помощь",
    "text": "Волонтёры обеспечивают ваше освобождение из тюрьмы.",
    "effect": {
      "release": true
    }
  },
  {
    "id": "T09",
    "type": "money",
    "title": "Региональная субсидия",
    "text": "Получите 110 ₽ на развитие инфраструктуры.",
    "effect": {
      "money": 110
    }
  },
  {
    "id": "T10",
    "type": "penalty",
    "title": "Экологический сбор",
    "text": "Оплатите 50 ₽ за переработку отходов.",
    "effect": {
      "money": -50
    }
  },
  {
    "id": "T11",
    "type": "money",
    "title": "Выставка достижений",
    "text": "Продажа билетов приносит 90 ₽.",
    "effect": {
      "money": 90
    }
  },
  {
    "id": "T12",
    "type": "penalty",
    "title": "Техобслуживание",
    "text": "Оплатите 70 ₽ за проверку оборудования.",
    "effect": {
      "money": -70
    }
  },
  {
    "id": "T13",
    "type": "money",
    "title": "Выигрыш в викторине",
    "text": "Получите 60 ₽ призовых.",
    "effect": {
      "money": 60
    }
  },
  {
    "id": "T14",
    "type": "move",
    "title": "Социальный проект",
    "text": "Вернитесь на 1 клетку назад и выполните эффект новой клетки.",
    "effect": {
      "move": -1
    }
  },
  {
    "id": "T15",
    "type": "money",
    "title": "Найдена ошибка",
    "text": "Вы возвращаете излишне уплаченные 75 ₽.",
    "effect": {
      "money": 75
    }
  },
  {
    "id": "T16",
    "type": "penalty",
    "title": "Помощь библиотеке",
    "text": "Перечислите 45 ₽ на покупку книг.",
    "effect": {
      "money": -45
    }
  },
  {
    "id": "T17",
    "type": "money",
    "title": "Приз зрительских симпатий",
    "text": "Получите 85 ₽ за лучшую презентацию.",
    "effect": {
      "money": 85
    }
  },
  {
    "id": "T18",
    "type": "money",
    "title": "Благодарность губернатора",
    "text": "Вам вручают премию 150 ₽.",
    "effect": {
      "money": 150
    }
  },
  {
    "id": "T19",
    "type": "penalty",
    "title": "Срочный ремонт",
    "text": "Оплатите 95 ₽ за ремонт крыши.",
    "effect": {
      "money": -95
    }
  },
  {
    "id": "T20",
    "type": "move",
    "title": "Ночная смена",
    "text": "Продвиньтесь на 4 клетки вперёд, чтобы быстрее завершить задачу.",
    "effect": {
      "move": 4
    }
  }
]`);
    const presets = JSON.parse(`{
  "intl-friendly": {
    "name": "International Friendly",
    "description": "Упрощённый режим с мягкими налогами и быстрыми партиями.",
    "salary": 200,
    "taxRate": 0.08,
    "luxuryTax": 100,
    "jailFine": 80,
    "bailout": 180
  },
  "rus": {
    "name": "Русский Классик",
    "description": "Базовый баланс с акцентом на длинные партии.",
    "salary": 200,
    "taxRate": 0.1,
    "luxuryTax": 150,
    "jailFine": 100,
    "bailout": 240
  }
}`);
    const locales = {
      ru: JSON.parse(`{
  "app_title": "Русская Монополия",
  "badge_loading": "Загрузка данных...",
  "badge_loaded": "Данные загружены",
  "badge_fallback": "Загружены офлайн-данные",
  "badge_error_loading": "Не удалось загрузить",
  "badge_restored": "Сохранение восстановлено",
  "badge_restore_failed": "Не удалось восстановить сохранение",
  "badge_saved": "Игра сохранена",
  "badge_storage_error": "Не удалось сохранить игру",
  "setup_title": "Подготовка",
  "setup_help": "Заполните параметры и начните игру",
  "label_players": "Количество игроков (2–6)",
  "label_preset": "Пресет баланса",
  "label_language": "Язык интерфейса",
  "label_start_money": "Стартовый капитал",
  "btn_start": "Начать игру",
  "board_title": "Игровое поле",
  "btn_roll": "Бросить кубики",
  "btn_buy": "Купить / арендовать",
  "btn_end": "Завершить ход",
  "players_title": "Игроки",
  "log_title": "Журнал событий",
  "card_title": "Активная карта",
  "btn_close": "Закрыть",
  "footer_hint": "Сохранение происходит автоматически в локальном хранилище.",
  "player": "Игрок",
  "active": "активный",
  "status_in_jail": "В тюрьме",
  "status_free": "Свободен",
  "owned_by": "Принадлежит",
  "no_owner": "Без владельца",
  "cell_type": "Тип",
  "cell_price": "Цена",
  "cell_owner": "Владелец",
  "micro_event_label": "Микро-событие",
  "contract_label": "Контракт",
  "offer_purchase": "Доступно для покупки",
  "landed": "попал на",
  "landed_own_property": "Это ваша собственность",
  "landed_start": "Получите зарплату",
  "paid_rent": "Оплатил аренду игроку",
  "received_rent": "Получил аренду от",
  "paid_shared_event": "Участие в сборе",
  "received_shared_event": "Получил взнос",
  "passed_start": "Прошли старт и получили зарплату",
  "visit_jail": "Просто посетили тюрьму",
  "goto_jail": "Отправляйтесь в тюрьму",
  "jail_escape_doubles": "Дубль! Вы выходите из тюрьмы",
  "jail_fine_paid": "Оплата штрафа за тюрьму",
  "extra_turn_doubles": "Дубль! Вы получаете ещё один ход",
  "jail_three_doubles": "Три дубля подряд — тюрьма!",
  "card_to_jail": "Карта отправляет в тюрьму",
  "card_release": "Карта освобождает из тюрьмы",
  "not_enough_money": "Недостаточно денег",
  "not_enough_contract": "Недостаточно средств для контракта",
  "contract_bought": "Контракт активирован",
  "contract_owned": "Контракт уже оформлен",
  "effect_money": "Изменение баланса",
  "log_game_started": "Игра началась!",
  "must_roll_first": "Сначала бросьте кубики",
  "in_jail_prompt": "Вы в тюрьме — выбросите дубль или оплатите штраф",
  "rolled": "бросил",
  "purchased": "Приобретено",
  "bankrupted": "обанкротился",
  "free": "Бесплатно",
  "celltype_start": "Старт",
  "celltype_property": "Собственность",
  "celltype_transport": "Транспорт",
  "celltype_utility": "Коммунальное предприятие",
  "celltype_tax": "Налог",
  "celltype_chance": "Шанс",
  "celltype_trial": "Испытание",
  "celltype_jail": "Тюрьма",
  "celltype_goto-jail": "Отправка в тюрьму",
  "celltype_micro-event": "Микро-событие",
  "celltype_contract": "Контракт",
  "cell_B01": "Старт",
  "cell_B02": "Калининград",
  "cell_B03": "Псков",
  "cell_B04": "Шанс",
  "cell_B05": "Санкт-Петербург",
  "cell_B06": "Великий Новгород",
  "cell_B07": "Мурманск",
  "cell_B08": "Региональный налог",
  "cell_B09": "Грантовый конкурс",
  "cell_B10": "Тула",
  "cell_B11": "Коломна",
  "cell_B12": "Москва",
  "cell_B13": "Аэроэкспресс",
  "cell_B14": "Сочи",
  "cell_B15": "Владикавказ",
  "cell_B16": "Шанс",
  "cell_B17": "Казань",
  "cell_B18": "Нижний Новгород",
  "cell_B19": "Самара",
  "cell_B20": "ВолгаЭнерго",
  "cell_B21": "Екатеринбург",
  "cell_B22": "Пермь",
  "cell_B23": "Новосибирск",
  "cell_B24": "Красноярск",
  "cell_B25": "Иркутск",
  "cell_B26": "Владивосток",
  "cell_B27": "Хабаровск",
  "cell_B28": "Фестиваль варенья",
  "cell_B29": "Полярный исследователь",
  "cell_B30": "Северсвязь",
  "cell_B31": "Общественный совет",
  "cell_B32": "Следственный комитет",
  "error_player_count": "Введите от 2 до 6 игроков",
  "card_empty": "Нет активной карты",
  "confirm_contract": "Оформить за"
}`),
      en: JSON.parse(`{
  "app_title": "Russian Monopoly",
  "badge_loading": "Loading data...",
  "badge_loaded": "Data loaded",
  "badge_fallback": "Fallback data loaded",
  "badge_error_loading": "Could not load",
  "badge_restored": "Save restored",
  "badge_restore_failed": "Restore failed",
  "badge_saved": "Game saved",
  "badge_storage_error": "Storage error",
  "setup_title": "Setup",
  "setup_help": "Set the options and press Start to begin",
  "label_players": "Players (2–6)",
  "label_preset": "Preset",
  "label_language": "Language",
  "label_start_money": "Starting cash",
  "btn_start": "Start game",
  "board_title": "Board",
  "btn_roll": "Roll dice",
  "btn_buy": "Buy / rent",
  "btn_end": "End turn",
  "players_title": "Players",
  "log_title": "Game log",
  "card_title": "Active card",
  "btn_close": "Close",
  "footer_hint": "Auto-save is enabled in local storage.",
  "player": "Player",
  "active": "active",
  "status_in_jail": "In jail",
  "status_free": "Free",
  "owned_by": "Owned by",
  "no_owner": "No owner",
  "cell_type": "Type",
  "cell_price": "Price",
  "cell_owner": "Owner",
  "micro_event_label": "Micro-event",
  "contract_label": "Contract",
  "offer_purchase": "Available for purchase",
  "landed": "landed on",
  "landed_own_property": "You own this property",
  "landed_start": "Take your salary",
  "paid_rent": "Paid rent to",
  "received_rent": "Received rent from",
  "paid_shared_event": "Shared contribution",
  "received_shared_event": "Received contribution",
  "passed_start": "Passed start and received salary",
  "visit_jail": "Just visiting",
  "goto_jail": "Go directly to jail",
  "jail_escape_doubles": "Doubles! You escape jail",
  "jail_fine_paid": "Paid the jail fine",
  "extra_turn_doubles": "Doubles! Take another turn",
  "jail_three_doubles": "Three doubles in a row — jail!",
  "card_to_jail": "Card sends you to jail",
  "card_release": "Card frees you from jail",
  "not_enough_money": "Not enough money",
  "not_enough_contract": "Not enough money for the contract",
  "contract_bought": "Contract activated",
  "contract_owned": "Contract already owned",
  "effect_money": "Balance updated",
  "log_game_started": "Game started!",
  "must_roll_first": "Roll the dice first",
  "in_jail_prompt": "You are in jail — roll doubles or pay the fine",
  "rolled": "rolled",
  "purchased": "Purchased",
  "bankrupted": "went bankrupt",
  "free": "Free",
  "celltype_start": "Start",
  "celltype_property": "Property",
  "celltype_transport": "Transport",
  "celltype_utility": "Utility",
  "celltype_tax": "Tax",
  "celltype_chance": "Chance",
  "celltype_trial": "Trial",
  "celltype_jail": "Jail",
  "celltype_goto-jail": "Go to jail",
  "celltype_micro-event": "Micro-event",
  "celltype_contract": "Contract",
  "cell_B01": "Start",
  "cell_B02": "Kaliningrad",
  "cell_B03": "Pskov",
  "cell_B04": "Chance",
  "cell_B05": "Saint Petersburg",
  "cell_B06": "Veliky Novgorod",
  "cell_B07": "Murmansk",
  "cell_B08": "Regional tax",
  "cell_B09": "Grant contest",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moscow",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sochi",
  "cell_B15": "Vladikavkaz",
  "cell_B16": "Chance",
  "cell_B17": "Kazan",
  "cell_B18": "Nizhny Novgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Yekaterinburg",
  "cell_B22": "Perm",
  "cell_B23": "Novosibirsk",
  "cell_B24": "Krasnoyarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Vladivostok",
  "cell_B27": "Khabarovsk",
  "cell_B28": "Jam Festival",
  "cell_B29": "Polar Explorer",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Civic council",
  "cell_B32": "Investigative Committee",
  "error_player_count": "Enter from 2 to 6 players",
  "card_empty": "No active card",
  "confirm_contract": "Confirm contract for"
}`),
      de: JSON.parse(`{
  "app_title": "Russische Monopoly",
  "badge_loading": "Lade Daten...",
  "badge_loaded": "Daten geladen",
  "badge_fallback": "Offline-Daten geladen",
  "badge_error_loading": "Fehler beim Laden",
  "badge_restored": "Spielstand geladen",
  "badge_restore_failed": "Spielstand konnte nicht geladen werden",
  "badge_saved": "Spiel gespeichert",
  "badge_storage_error": "Speichern fehlgeschlagen",
  "setup_title": "Vorbereitung",
  "setup_help": "Wähle Einstellungen und starte das Spiel",
  "label_players": "Spieler (2–6)",
  "label_preset": "Preset",
  "label_language": "Sprache",
  "label_start_money": "Startkapital",
  "btn_start": "Spiel starten",
  "board_title": "Spielbrett",
  "btn_roll": "Würfeln",
  "btn_buy": "Kaufen / mieten",
  "btn_end": "Zug beenden",
  "players_title": "Spieler",
  "log_title": "Protokoll",
  "card_title": "Aktive Karte",
  "btn_close": "Schließen",
  "footer_hint": "Autospeicherung im lokalen Speicher aktiviert.",
  "player": "Spieler",
  "active": "aktiv",
  "status_in_jail": "Im Gefängnis",
  "status_free": "Frei",
  "owned_by": "Gehört",
  "no_owner": "Ohne Besitzer",
  "cell_type": "Typ",
  "cell_price": "Preis",
  "cell_owner": "Besitzer",
  "micro_event_label": "Mikro-Ereignis",
  "contract_label": "Auftrag",
  "offer_purchase": "Zum Kauf verfügbar",
  "landed": "landet auf",
  "landed_own_property": "Eigene Immobilie",
  "landed_start": "Ziehe dein Gehalt",
  "paid_rent": "Miete gezahlt an",
  "received_rent": "Miete erhalten von",
  "paid_shared_event": "Gemeinsamer Beitrag",
  "received_shared_event": "Beitrag erhalten",
  "passed_start": "Start überquert und Gehalt erhalten",
  "visit_jail": "Nur zu Besuch",
  "goto_jail": "Gehe direkt ins Gefängnis",
  "jail_escape_doubles": "Pasch! Du kommst frei",
  "jail_fine_paid": "Strafe für Gefängnis bezahlt",
  "extra_turn_doubles": "Pasch! Noch ein Zug",
  "jail_three_doubles": "Drei Pasch in Folge – Gefängnis!",
  "card_to_jail": "Karte schickt dich ins Gefängnis",
  "card_release": "Karte befreit dich",
  "not_enough_money": "Zu wenig Geld",
  "not_enough_contract": "Nicht genug Geld für den Auftrag",
  "contract_bought": "Auftrag aktiviert",
  "contract_owned": "Auftrag bereits vorhanden",
  "effect_money": "Kontostand aktualisiert",
  "log_game_started": "Spiel gestartet!",
  "must_roll_first": "Bitte zuerst würfeln",
  "in_jail_prompt": "Du bist im Gefängnis – würfle einen Pasch oder zahle",
  "rolled": "würfelte",
  "purchased": "Gekauft",
  "bankrupted": "ist bankrott",
  "free": "Kostenlos",
  "celltype_start": "Start",
  "celltype_property": "Immobilie",
  "celltype_transport": "Transport",
  "celltype_utility": "Versorgung",
  "celltype_tax": "Steuer",
  "celltype_chance": "Chance",
  "celltype_trial": "Gemeinschaft",
  "celltype_jail": "Gefängnis",
  "celltype_goto-jail": "Ins Gefängnis",
  "celltype_micro-event": "Mikro-Ereignis",
  "celltype_contract": "Auftrag",
  "cell_B01": "Start",
  "cell_B02": "Kaliningrad",
  "cell_B03": "Pskow",
  "cell_B04": "Chance",
  "cell_B05": "Sankt Petersburg",
  "cell_B06": "Weliki Nowgorod",
  "cell_B07": "Murmansk",
  "cell_B08": "Regionalsteuer",
  "cell_B09": "Grant-Wettbewerb",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moskau",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sotschi",
  "cell_B15": "Wladikawkas",
  "cell_B16": "Chance",
  "cell_B17": "Kasan",
  "cell_B18": "Nischni Nowgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Jekaterinburg",
  "cell_B22": "Perm",
  "cell_B23": "Nowosibirsk",
  "cell_B24": "Krasnojarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Wladiwostok",
  "cell_B27": "Chabarowsk",
  "cell_B28": "Marmeladenfest",
  "cell_B29": "Polar-Forscher",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Bürger-Rat",
  "cell_B32": "Ermittlungs-Komitee",
  "error_player_count": "Bitte 2 bis 6 Spieler eingeben",
  "card_empty": "Keine aktive Karte",
  "confirm_contract": "Auftrag für"
}`),
      es: JSON.parse(`{
  "app_title": "Monopolio Ruso",
  "badge_loading": "Cargando datos...",
  "badge_loaded": "Datos cargados",
  "badge_fallback": "Datos locales cargados",
  "badge_error_loading": "No se pudo cargar",
  "badge_restored": "Partida restaurada",
  "badge_restore_failed": "No se pudo restaurar",
  "badge_saved": "Partida guardada",
  "badge_storage_error": "Error al guardar",
  "setup_title": "Configuración",
  "setup_help": "Elige opciones y pulsa Iniciar",
  "label_players": "Jugadores (2–6)",
  "label_preset": "Preajuste",
  "label_language": "Idioma",
  "label_start_money": "Capital inicial",
  "btn_start": "Iniciar juego",
  "board_title": "Tablero",
  "btn_roll": "Lanzar dados",
  "btn_buy": "Comprar / alquilar",
  "btn_end": "Terminar turno",
  "players_title": "Jugadores",
  "log_title": "Registro",
  "card_title": "Carta activa",
  "btn_close": "Cerrar",
  "footer_hint": "Guardado automático en el almacenamiento local.",
  "player": "Jugador",
  "active": "activo",
  "status_in_jail": "En la cárcel",
  "status_free": "Libre",
  "owned_by": "Propiedad de",
  "no_owner": "Sin propietario",
  "cell_type": "Tipo",
  "cell_price": "Precio",
  "cell_owner": "Propietario",
  "micro_event_label": "Microevento",
  "contract_label": "Contrato",
  "offer_purchase": "Disponible para compra",
  "landed": "cayó en",
  "landed_own_property": "Es tu propiedad",
  "landed_start": "Recibe salario",
  "paid_rent": "Pagó renta a",
  "received_rent": "Recibió renta de",
  "paid_shared_event": "Contribución compartida",
  "received_shared_event": "Recibió contribución",
  "passed_start": "Pasaste por inicio y cobraste salario",
  "visit_jail": "Solo de visita",
  "goto_jail": "Ir directo a la cárcel",
  "jail_escape_doubles": "¡Doble! Sales de la cárcel",
  "jail_fine_paid": "Pagaste la multa de la cárcel",
  "extra_turn_doubles": "¡Doble! Tira otra vez",
  "jail_three_doubles": "Tres dobles seguidos — a la cárcel",
  "card_to_jail": "La carta te envía a la cárcel",
  "card_release": "La carta te libera",
  "not_enough_money": "No tienes suficiente dinero",
  "not_enough_contract": "No tienes dinero para el contrato",
  "contract_bought": "Contrato activado",
  "contract_owned": "Contrato ya adquirido",
  "effect_money": "Saldo actualizado",
  "log_game_started": "¡Comienza la partida!",
  "must_roll_first": "Lanza los dados primero",
  "in_jail_prompt": "Estás en la cárcel — saca dobles o paga la multa",
  "rolled": "lanzó",
  "purchased": "Comprado",
  "bankrupted": "se declaró en quiebra",
  "free": "Gratis",
  "celltype_start": "Inicio",
  "celltype_property": "Propiedad",
  "celltype_transport": "Transporte",
  "celltype_utility": "Servicio",
  "celltype_tax": "Impuesto",
  "celltype_chance": "Suerte",
  "celltype_trial": "Comunidad",
  "celltype_jail": "Cárcel",
  "celltype_goto-jail": "Ir a la cárcel",
  "celltype_micro-event": "Microevento",
  "celltype_contract": "Contrato",
  "cell_B01": "Inicio",
  "cell_B02": "Kaliningrado",
  "cell_B03": "Pskov",
  "cell_B04": "Suerte",
  "cell_B05": "San Petersburgo",
  "cell_B06": "Veliky Novgorod",
  "cell_B07": "Múrmansk",
  "cell_B08": "Impuesto regional",
  "cell_B09": "Concurso de becas",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moscú",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sochi",
  "cell_B15": "Vladikavkaz",
  "cell_B16": "Suerte",
  "cell_B17": "Kazán",
  "cell_B18": "Nizhni Nóvgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Ekaterimburgo",
  "cell_B22": "Perm",
  "cell_B23": "Novosibirsk",
  "cell_B24": "Krasnoyarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Vladivostok",
  "cell_B27": "Jabárovsk",
  "cell_B28": "Festival de mermelada",
  "cell_B29": "Explorador polar",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Consejo cívico",
  "cell_B32": "Comité de Investigación",
  "error_player_count": "Introduce entre 2 y 6 jugadores",
  "card_empty": "Sin carta activa",
  "confirm_contract": "Confirmar contrato por"
}`),
    };
    return { board, chance, trial, presets, locales };
  }
    }
  },
  {
    "id": "B29",
    "name": "Полярный исследователь",
    "type": "contract",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 29,
    "contract": {
      "id": "CT01",
      "name": "Полярный исследователь",
      "type": "expedition",
      "description": "Нанимает команду для экспедиции на Север и приносит премию.",
      "cost": 150,
      "effect": {
        "money": 220
      }
    }
  },
  {
    "id": "B31",
    "name": "Общественный совет",
    "type": "trial",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 31
  },
  {
    "id": "B32",
    "name": "Следственный комитет",
    "type": "goto-jail",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 32
  }
]`);
    const chance = JSON.parse(`[
  {
    "id": "C01",
    "type": "money",
    "title": "Грант на инновации",
    "text": "Вы побеждаете в конкурсе технологических проектов и получаете 200 ₽.",
    "effect": {
      "money": 200
    }
  },
  {
    "id": "C02",
    "type": "move",
    "title": "Экспресс до Москвы",
    "text": "Отправляйтесь на клетку Москва (B12). Если проходите старт, получите зарплату.",
    "effect": {
      "moveTo": 11
    }
  },
  {
    "id": "C03",
    "type": "penalty",
    "title": "Штраф за парковку",
    "text": "Оплатите 100 ₽ в городской бюджет.",
    "effect": {
      "money": -100
    }
  },
  {
    "id": "C04",
    "type": "money",
    "title": "Дивиденды по акциям",
    "text": "Вам начислены дивиденды — получите 160 ₽.",
    "effect": {
      "money": 160
    }
  },
  {
    "id": "C05",
    "type": "move",
    "title": "Северный ветер",
    "text": "Переместитесь вперёд на 3 клетки.",
    "effect": {
      "move": 3
    }
  },
  {
    "id": "C06",
    "type": "jail",
    "title": "Проверка документов",
    "text": "Отправляйтесь напрямую в тюрьму (B09).",
    "effect": {
      "jail": true
    }
  },
  {
    "id": "C07",
    "type": "release",
    "title": "Лучший адвокат",
    "text": "Сохраните карту и используйте, чтобы выйти из тюрьмы. В прототипе эффект применяется сразу.",
    "effect": {
      "release": true
    }
  },
  {
    "id": "C08",
    "type": "collect",
    "title": "Сбор на реставрацию",
    "text": "Каждый игрок перечисляет вам по 60 ₽.",
    "effect": {
      "collectEach": 60
    }
  },
  {
    "id": "C09",
    "type": "money",
    "title": "Налоговая льгота",
    "text": "Получите компенсацию 120 ₽ от государства.",
    "effect": {
      "money": 120
    }
  },
  {
    "id": "C10",
    "type": "penalty",
    "title": "Неожиданная проверка",
    "text": "Заплатите 90 ₽ штрафа.",
    "effect": {
      "money": -90
    }
  },
  {
    "id": "C11",
    "type": "move",
    "title": "Региональный форум",
    "text": "Перейдите на ближайшую клетку trial и выполните её эффект.",
    "effect": {
      "moveTo": 8
    }
  },
  {
    "id": "C12",
    "type": "money",
    "title": "Сезон туристов",
    "text": "Ваша курортная недвижимость приносит 130 ₽.",
    "effect": {
      "money": 130
    }
  },
  {
    "id": "C13",
    "type": "penalty",
    "title": "Протечка труб",
    "text": "Оплатите ремонт — 70 ₽.",
    "effect": {
      "money": -70
    }
  },
  {
    "id": "C14",
    "type": "money",
    "title": "Федеральная субсидия",
    "text": "Получите 180 ₽ на развитие инфраструктуры.",
    "effect": {
      "money": 180
    }
  },
  {
    "id": "C15",
    "type": "move",
    "title": "Скоростной поезд",
    "text": "Перейдите на клетку Аэроэкспресс (B13).",
    "effect": {
      "moveTo": 12
    }
  },
  {
    "id": "C16",
    "type": "penalty",
    "title": "Срыв контракта",
    "text": "Верните 110 ₽ инвестору.",
    "effect": {
      "money": -110
    }
  },
  {
    "id": "C17",
    "type": "money",
    "title": "Культурный сезон",
    "text": "Организация фестивалей приносит 90 ₽.",
    "effect": {
      "money": 90
    }
  },
  {
    "id": "C18",
    "type": "move",
    "title": "Дорожная развязка",
    "text": "Вернитесь на 2 клетки назад.",
    "effect": {
      "move": -2
    }
  },
  {
    "id": "C19",
    "type": "money",
    "title": "Инвесторы довольны",
    "text": "Получите премию 140 ₽.",
    "effect": {
      "money": 140
    }
  },
  {
    "id": "C20",
    "type": "penalty",
    "title": "Экологический сбор",
    "text": "Заплатите 80 ₽ за переработку отходов.",
    "effect": {
      "money": -80
    }
  }
]`);
    const trial = JSON.parse(`[
  {
    "id": "T01",
    "type": "money",
    "title": "Городской фестиваль",
    "text": "Вы помогли организовать праздник и получаете благодарность 100 ₽.",
    "effect": {
      "money": 100
    }
  },
  {
    "id": "T02",
    "type": "money",
    "title": "Бонусная стипендия",
    "text": "Получите 50 ₽ от университета.",
    "effect": {
      "money": 50
    }
  },
  {
    "id": "T03",
    "type": "penalty",
    "title": "Благотворительный взнос",
    "text": "Перечислите 60 ₽ в фонд помощи.",
    "effect": {
      "money": -60
    }
  },
  {
    "id": "T04",
    "type": "money",
    "title": "Грант на урбанистику",
    "text": "Получите 200 ₽ на развитие района.",
    "effect": {
      "money": 200
    }
  },
  {
    "id": "T05",
    "type": "move",
    "title": "Туристический маршрут",
    "text": "Продвиньтесь на 2 клетки вперёд.",
    "effect": {
      "move": 2
    }
  },
  {
    "id": "T06",
    "type": "money",
    "title": "Возврат налога",
    "text": "Казначейство возвращает 80 ₽.",
    "effect": {
      "money": 80
    }
  },
  {
    "id": "T07",
    "type": "penalty",
    "title": "Поддержка музея",
    "text": "Пожертвуйте 40 ₽ на обновление экспозиции.",
    "effect": {
      "money": -40
    }
  },
  {
    "id": "T08",
    "type": "release",
    "title": "Волонтёрская помощь",
    "text": "Волонтёры обеспечивают ваше освобождение из тюрьмы.",
    "effect": {
      "release": true
    }
  },
  {
    "id": "T09",
    "type": "money",
    "title": "Региональная субсидия",
    "text": "Получите 110 ₽ на развитие инфраструктуры.",
    "effect": {
      "money": 110
    }
  },
  {
    "id": "T10",
    "type": "penalty",
    "title": "Экологический сбор",
    "text": "Оплатите 50 ₽ за переработку отходов.",
    "effect": {
      "money": -50
    }
  },
  {
    "id": "T11",
    "type": "money",
    "title": "Выставка достижений",
    "text": "Продажа билетов приносит 90 ₽.",
    "effect": {
      "money": 90
    }
  },
  {
    "id": "T12",
    "type": "penalty",
    "title": "Техобслуживание",
    "text": "Оплатите 70 ₽ за проверку оборудования.",
    "effect": {
      "money": -70
    }
  },
  {
    "id": "T13",
    "type": "money",
    "title": "Выигрыш в викторине",
    "text": "Получите 60 ₽ призовых.",
    "effect": {
      "money": 60
    }
  },
  {
    "id": "T14",
    "type": "move",
    "title": "Социальный проект",
    "text": "Вернитесь на 1 клетку назад и выполните эффект новой клетки.",
    "effect": {
      "move": -1
    }
  },
  {
    "id": "T15",
    "type": "money",
    "title": "Найдена ошибка",
    "text": "Вы возвращаете излишне уплаченные 75 ₽.",
    "effect": {
      "money": 75
    }
  },
  {
    "id": "T16",
    "type": "penalty",
    "title": "Помощь библиотеке",
    "text": "Перечислите 45 ₽ на покупку книг.",
    "effect": {
      "money": -45
    }
  },
  {
    "id": "T17",
    "type": "money",
    "title": "Приз зрительских симпатий",
    "text": "Получите 85 ₽ за лучшую презентацию.",
    "effect": {
      "money": 85
    }
  },
  {
    "id": "T18",
    "type": "money",
    "title": "Благодарность губернатора",
    "text": "Вам вручают премию 150 ₽.",
    "effect": {
      "money": 150
    }
  },
  {
    "id": "T19",
    "type": "penalty",
    "title": "Срочный ремонт",
    "text": "Оплатите 95 ₽ за ремонт крыши.",
    "effect": {
      "money": -95
    }
  },
  {
    "id": "T20",
    "type": "move",
    "title": "Ночная смена",
    "text": "Продвиньтесь на 4 клетки вперёд, чтобы быстрее завершить задачу.",
    "effect": {
      "move": 4
    }
  }
]`);
    const presets = JSON.parse(`{
  "intl-friendly": {
    "name": "International Friendly",
    "description": "Упрощённый режим с мягкими налогами и быстрыми партиями.",
    "salary": 200,
    "taxRate": 0.08,
    "luxuryTax": 100,
    "jailFine": 80,
    "bailout": 180
  },
  "rus": {
    "name": "Русский Классик",
    "description": "Базовый баланс с акцентом на длинные партии.",
    "salary": 200,
    "taxRate": 0.1,
    "luxuryTax": 150,
    "jailFine": 100,
    "bailout": 240
  }
}`);
    const locales = {
      ru: JSON.parse(`{
  "app_title": "Русская Монополия",
  "badge_loading": "Загрузка данных...",
  "badge_loaded": "Данные загружены",
  "badge_fallback": "Загружены офлайн-данные",
  "badge_error_loading": "Не удалось загрузить",
  "badge_restored": "Сохранение восстановлено",
  "badge_restore_failed": "Не удалось восстановить сохранение",
  "badge_saved": "Игра сохранена",
  "badge_storage_error": "Не удалось сохранить игру",
  "setup_title": "Подготовка",
  "setup_help": "Заполните параметры и начните игру",
  "label_players": "Количество игроков (2–6)",
  "label_preset": "Пресет баланса",
  "label_language": "Язык интерфейса",
  "label_start_money": "Стартовый капитал",
  "btn_start": "Начать игру",
  "board_title": "Игровое поле",
  "btn_roll": "Бросить кубики",
  "btn_buy": "Купить / арендовать",
  "btn_end": "Завершить ход",
  "players_title": "Игроки",
  "log_title": "Журнал событий",
  "card_title": "Активная карта",
  "btn_close": "Закрыть",
  "footer_hint": "Сохранение происходит автоматически в локальном хранилище.",
  "player": "Игрок",
  "active": "активный",
  "status_in_jail": "В тюрьме",
  "status_free": "Свободен",
  "owned_by": "Принадлежит",
  "no_owner": "Без владельца",
  "cell_type": "Тип",
  "cell_price": "Цена",
  "cell_owner": "Владелец",
  "micro_event_label": "Микро-событие",
  "contract_label": "Контракт",
  "offer_purchase": "Доступно для покупки",
  "landed": "попал на",
  "landed_own_property": "Это ваша собственность",
  "landed_start": "Получите зарплату",
  "paid_rent": "Оплатил аренду игроку",
  "received_rent": "Получил аренду от",
  "paid_shared_event": "Участие в сборе",
  "received_shared_event": "Получил взнос",
  "passed_start": "Прошли старт и получили зарплату",
  "visit_jail": "Просто посетили тюрьму",
  "goto_jail": "Отправляйтесь в тюрьму",
  "jail_escape_doubles": "Дубль! Вы выходите из тюрьмы",
  "jail_fine_paid": "Оплата штрафа за тюрьму",
  "extra_turn_doubles": "Дубль! Вы получаете ещё один ход",
  "jail_three_doubles": "Три дубля подряд — тюрьма!",
  "card_to_jail": "Карта отправляет в тюрьму",
  "card_release": "Карта освобождает из тюрьмы",
  "not_enough_money": "Недостаточно денег",
  "not_enough_contract": "Недостаточно средств для контракта",
  "contract_bought": "Контракт активирован",
  "contract_owned": "Контракт уже оформлен",
  "effect_money": "Изменение баланса",
  "log_game_started": "Игра началась!",
  "must_roll_first": "Сначала бросьте кубики",
  "in_jail_prompt": "Вы в тюрьме — выбросите дубль или оплатите штраф",
  "rolled": "бросил",
  "purchased": "Приобретено",
  "bankrupted": "обанкротился",
  "free": "Бесплатно",
  "celltype_start": "Старт",
  "celltype_property": "Собственность",
  "celltype_transport": "Транспорт",
  "celltype_utility": "Коммунальное предприятие",
  "celltype_tax": "Налог",
  "celltype_chance": "Шанс",
  "celltype_trial": "Испытание",
  "celltype_jail": "Тюрьма",
  "celltype_goto-jail": "Отправка в тюрьму",
  "celltype_micro-event": "Микро-событие",
  "celltype_contract": "Контракт",
  "cell_B01": "Старт",
  "cell_B02": "Калининград",
  "cell_B03": "Псков",
  "cell_B04": "Шанс",
  "cell_B05": "Санкт-Петербург",
  "cell_B06": "Великий Новгород",
  "cell_B07": "Мурманск",
  "cell_B08": "Региональный налог",
  "cell_B09": "Грантовый конкурс",
  "cell_B10": "Тула",
  "cell_B11": "Коломна",
  "cell_B12": "Москва",
  "cell_B13": "Аэроэкспресс",
  "cell_B14": "Сочи",
  "cell_B15": "Владикавказ",
  "cell_B16": "Шанс",
  "cell_B17": "Казань",
  "cell_B18": "Нижний Новгород",
  "cell_B19": "Самара",
  "cell_B20": "ВолгаЭнерго",
  "cell_B21": "Екатеринбург",
  "cell_B22": "Пермь",
  "cell_B23": "Новосибирск",
  "cell_B24": "Красноярск",
  "cell_B25": "Иркутск",
  "cell_B26": "Владивосток",
  "cell_B27": "Хабаровск",
  "cell_B28": "Фестиваль варенья",
  "cell_B29": "Полярный исследователь",
  "cell_B30": "Северсвязь",
  "cell_B31": "Общественный совет",
  "cell_B32": "Следственный комитет",
  "error_player_count": "Введите от 2 до 6 игроков",
  "card_empty": "Нет активной карты"
}`),
      en: JSON.parse(`{
  "app_title": "Russian Monopoly",
  "badge_loading": "Loading data...",
  "badge_loaded": "Data loaded",
  "badge_fallback": "Fallback data loaded",
  "badge_error_loading": "Could not load",
  "badge_restored": "Save restored",
  "badge_restore_failed": "Restore failed",
  "badge_saved": "Game saved",
  "badge_storage_error": "Storage error",
  "setup_title": "Setup",
  "setup_help": "Set the options and press Start to begin",
  "label_players": "Players (2–6)",
  "label_preset": "Preset",
  "label_language": "Language",
  "label_start_money": "Starting cash",
  "btn_start": "Start game",
  "board_title": "Board",
  "btn_roll": "Roll dice",
  "btn_buy": "Buy / rent",
  "btn_end": "End turn",
  "players_title": "Players",
  "log_title": "Game log",
  "card_title": "Active card",
  "btn_close": "Close",
  "footer_hint": "Auto-save is enabled in local storage.",
  "player": "Player",
  "active": "active",
  "status_in_jail": "In jail",
  "status_free": "Free",
  "owned_by": "Owned by",
  "no_owner": "No owner",
  "cell_type": "Type",
  "cell_price": "Price",
  "cell_owner": "Owner",
  "micro_event_label": "Micro-event",
  "contract_label": "Contract",
  "offer_purchase": "Available for purchase",
  "landed": "landed on",
  "landed_own_property": "You own this property",
  "landed_start": "Take your salary",
  "paid_rent": "Paid rent to",
  "received_rent": "Received rent from",
  "paid_shared_event": "Shared contribution",
  "received_shared_event": "Received contribution",
  "passed_start": "Passed start and received salary",
  "visit_jail": "Just visiting",
  "goto_jail": "Go directly to jail",
  "jail_escape_doubles": "Doubles! You escape jail",
  "jail_fine_paid": "Paid the jail fine",
  "extra_turn_doubles": "Doubles! Take another turn",
  "jail_three_doubles": "Three doubles in a row — jail!",
  "card_to_jail": "Card sends you to jail",
  "card_release": "Card frees you from jail",
  "not_enough_money": "Not enough money",
  "not_enough_contract": "Not enough money for the contract",
  "contract_bought": "Contract activated",
  "contract_owned": "Contract already owned",
  "effect_money": "Balance updated",
  "log_game_started": "Game started!",
  "must_roll_first": "Roll the dice first",
  "in_jail_prompt": "You are in jail — roll doubles or pay the fine",
  "rolled": "rolled",
  "purchased": "Purchased",
  "bankrupted": "went bankrupt",
  "free": "Free",
  "celltype_start": "Start",
  "celltype_property": "Property",
  "celltype_transport": "Transport",
  "celltype_utility": "Utility",
  "celltype_tax": "Tax",
  "celltype_chance": "Chance",
  "celltype_trial": "Trial",
  "celltype_jail": "Jail",
  "celltype_goto-jail": "Go to jail",
  "celltype_micro-event": "Micro-event",
  "celltype_contract": "Contract",
  "cell_B01": "Start",
  "cell_B02": "Kaliningrad",
  "cell_B03": "Pskov",
  "cell_B04": "Chance",
  "cell_B05": "Saint Petersburg",
  "cell_B06": "Veliky Novgorod",
  "cell_B07": "Murmansk",
  "cell_B08": "Regional tax",
  "cell_B09": "Grant contest",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moscow",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sochi",
  "cell_B15": "Vladikavkaz",
  "cell_B16": "Chance",
  "cell_B17": "Kazan",
  "cell_B18": "Nizhny Novgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Yekaterinburg",
  "cell_B22": "Perm",
  "cell_B23": "Novosibirsk",
  "cell_B24": "Krasnoyarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Vladivostok",
  "cell_B27": "Khabarovsk",
  "cell_B28": "Jam Festival",
  "cell_B29": "Polar Explorer",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Civic council",
  "cell_B32": "Investigative Committee",
  "error_player_count": "Enter from 2 to 6 players",
  "card_empty": "No active card"
}`),
      de: JSON.parse(`{
  "app_title": "Russische Monopoly",
  "badge_loading": "Lade Daten...",
  "badge_loaded": "Daten geladen",
  "badge_fallback": "Offline-Daten geladen",
  "badge_error_loading": "Fehler beim Laden",
  "badge_restored": "Spielstand geladen",
  "badge_restore_failed": "Spielstand konnte nicht geladen werden",
  "badge_saved": "Spiel gespeichert",
  "badge_storage_error": "Speichern fehlgeschlagen",
  "setup_title": "Vorbereitung",
  "setup_help": "Wähle Einstellungen und starte das Spiel",
  "label_players": "Spieler (2–6)",
  "label_preset": "Preset",
  "label_language": "Sprache",
  "label_start_money": "Startkapital",
  "btn_start": "Spiel starten",
  "board_title": "Spielbrett",
  "btn_roll": "Würfeln",
  "btn_buy": "Kaufen / mieten",
  "btn_end": "Zug beenden",
  "players_title": "Spieler",
  "log_title": "Protokoll",
  "card_title": "Aktive Karte",
  "btn_close": "Schließen",
  "footer_hint": "Autospeicherung im lokalen Speicher aktiviert.",
  "player": "Spieler",
  "active": "aktiv",
  "status_in_jail": "Im Gefängnis",
  "status_free": "Frei",
  "owned_by": "Gehört",
  "no_owner": "Ohne Besitzer",
  "cell_type": "Typ",
  "cell_price": "Preis",
  "cell_owner": "Besitzer",
  "micro_event_label": "Mikro-Ereignis",
  "contract_label": "Auftrag",
  "offer_purchase": "Zum Kauf verfügbar",
  "landed": "landet auf",
  "landed_own_property": "Eigene Immobilie",
  "landed_start": "Ziehe dein Gehalt",
  "paid_rent": "Miete gezahlt an",
  "received_rent": "Miete erhalten von",
  "paid_shared_event": "Gemeinsamer Beitrag",
  "received_shared_event": "Beitrag erhalten",
  "passed_start": "Start überquert und Gehalt erhalten",
  "visit_jail": "Nur zu Besuch",
  "goto_jail": "Gehe direkt ins Gefängnis",
  "jail_escape_doubles": "Pasch! Du kommst frei",
  "jail_fine_paid": "Strafe für Gefängnis bezahlt",
  "extra_turn_doubles": "Pasch! Noch ein Zug",
  "jail_three_doubles": "Drei Pasch in Folge – Gefängnis!",
  "card_to_jail": "Karte schickt dich ins Gefängnis",
  "card_release": "Karte befreit dich",
  "not_enough_money": "Zu wenig Geld",
  "not_enough_contract": "Nicht genug Geld für den Auftrag",
  "contract_bought": "Auftrag aktiviert",
  "contract_owned": "Auftrag bereits vorhanden",
  "effect_money": "Kontostand aktualisiert",
  "log_game_started": "Spiel gestartet!",
  "must_roll_first": "Bitte zuerst würfeln",
  "in_jail_prompt": "Du bist im Gefängnis – würfle einen Pasch oder zahle",
  "rolled": "würfelte",
  "purchased": "Gekauft",
  "bankrupted": "ist bankrott",
  "free": "Kostenlos",
  "celltype_start": "Start",
  "celltype_property": "Immobilie",
  "celltype_transport": "Transport",
  "celltype_utility": "Versorgung",
  "celltype_tax": "Steuer",
  "celltype_chance": "Chance",
  "celltype_trial": "Gemeinschaft",
  "celltype_jail": "Gefängnis",
  "celltype_goto-jail": "Ins Gefängnis",
  "celltype_micro-event": "Mikro-Ereignis",
  "celltype_contract": "Auftrag",
  "cell_B01": "Start",
  "cell_B02": "Kaliningrad",
  "cell_B03": "Pskow",
  "cell_B04": "Chance",
  "cell_B05": "Sankt Petersburg",
  "cell_B06": "Weliki Nowgorod",
  "cell_B07": "Murmansk",
  "cell_B08": "Regionalsteuer",
  "cell_B09": "Grant-Wettbewerb",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moskau",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sotschi",
  "cell_B15": "Wladikawkas",
  "cell_B16": "Chance",
  "cell_B17": "Kasan",
  "cell_B18": "Nischni Nowgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Jekaterinburg",
  "cell_B22": "Perm",
  "cell_B23": "Nowosibirsk",
  "cell_B24": "Krasnojarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Wladiwostok",
  "cell_B27": "Chabarowsk",
  "cell_B28": "Marmeladenfest",
  "cell_B29": "Polar-Forscher",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Bürger-Rat",
  "cell_B32": "Ermittlungs-Komitee",
  "error_player_count": "Bitte 2 bis 6 Spieler eingeben",
  "card_empty": "Keine aktive Karte"
}`),
      es: JSON.parse(`{
  "app_title": "Monopolio Ruso",
  "badge_loading": "Cargando datos...",
  "badge_loaded": "Datos cargados",
  "badge_fallback": "Datos locales cargados",
  "badge_error_loading": "No se pudo cargar",
  "badge_restored": "Partida restaurada",
  "badge_restore_failed": "No se pudo restaurar",
  "badge_saved": "Partida guardada",
  "badge_storage_error": "Error al guardar",
  "setup_title": "Configuración",
  "setup_help": "Elige opciones y pulsa Iniciar",
  "label_players": "Jugadores (2–6)",
  "label_preset": "Preajuste",
  "label_language": "Idioma",
  "label_start_money": "Capital inicial",
  "btn_start": "Iniciar juego",
  "board_title": "Tablero",
  "btn_roll": "Lanzar dados",
  "btn_buy": "Comprar / alquilar",
  "btn_end": "Terminar turno",
  "players_title": "Jugadores",
  "log_title": "Registro",
  "card_title": "Carta activa",
  "btn_close": "Cerrar",
  "footer_hint": "Guardado automático en el almacenamiento local.",
  "player": "Jugador",
  "active": "activo",
  "status_in_jail": "En la cárcel",
  "status_free": "Libre",
  "owned_by": "Propiedad de",
  "no_owner": "Sin propietario",
  "cell_type": "Tipo",
  "cell_price": "Precio",
  "cell_owner": "Propietario",
  "micro_event_label": "Microevento",
  "contract_label": "Contrato",
  "offer_purchase": "Disponible para compra",
  "landed": "cayó en",
  "landed_own_property": "Es tu propiedad",
  "landed_start": "Recibe salario",
  "paid_rent": "Pagó renta a",
  "received_rent": "Recibió renta de",
  "paid_shared_event": "Contribución compartida",
  "received_shared_event": "Recibió contribución",
  "passed_start": "Pasaste por inicio y cobraste salario",
  "visit_jail": "Solo de visita",
  "goto_jail": "Ir directo a la cárcel",
  "jail_escape_doubles": "¡Doble! Sales de la cárcel",
  "jail_fine_paid": "Pagaste la multa de la cárcel",
  "extra_turn_doubles": "¡Doble! Tira otra vez",
  "jail_three_doubles": "Tres dobles seguidos — a la cárcel",
  "card_to_jail": "La carta te envía a la cárcel",
  "card_release": "La carta te libera",
  "not_enough_money": "No tienes suficiente dinero",
  "not_enough_contract": "No tienes dinero para el contrato",
  "contract_bought": "Contrato activado",
  "contract_owned": "Contrato ya adquirido",
  "effect_money": "Saldo actualizado",
  "log_game_started": "¡Comienza la partida!",
  "must_roll_first": "Lanza los dados primero",
  "in_jail_prompt": "Estás en la cárcel — saca dobles o paga la multa",
  "rolled": "lanzó",
  "purchased": "Comprado",
  "bankrupted": "se declaró en quiebra",
  "free": "Gratis",
  "celltype_start": "Inicio",
  "celltype_property": "Propiedad",
  "celltype_transport": "Transporte",
  "celltype_utility": "Servicio",
  "celltype_tax": "Impuesto",
  "celltype_chance": "Suerte",
  "celltype_trial": "Comunidad",
  "celltype_jail": "Cárcel",
  "celltype_goto-jail": "Ir a la cárcel",
  "celltype_micro-event": "Microevento",
  "celltype_contract": "Contrato",
  "cell_B01": "Inicio",
  "cell_B02": "Kaliningrado",
  "cell_B03": "Pskov",
  "cell_B04": "Suerte",
  "cell_B05": "San Petersburgo",
  "cell_B06": "Veliky Novgorod",
  "cell_B07": "Múrmansk",
  "cell_B08": "Impuesto regional",
  "cell_B09": "Concurso de becas",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moscú",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sochi",
  "cell_B15": "Vladikavkaz",
  "cell_B16": "Suerte",
  "cell_B17": "Kazán",
  "cell_B18": "Nizhni Nóvgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Ekaterimburgo",
  "cell_B22": "Perm",
  "cell_B23": "Novosibirsk",
  "cell_B24": "Krasnoyarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Vladivostok",
  "cell_B27": "Jabárovsk",
  "cell_B28": "Festival de mermelada",
  "cell_B29": "Explorador polar",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Consejo cívico",
  "cell_B32": "Comité de Investigación",
  "error_player_count": "Introduce entre 2 y 6 jugadores",
  "card_empty": "Sin carta activa"
}`),
    };
    return { board, chance, trial, presets, locales };
  }
    }
  },
  {
    "id": "B29",
    "name": "Полярный исследователь",
    "type": "contract",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 29,
    "contract": {
      "id": "CT01",
      "name": "Полярный исследователь",
      "type": "expedition",
      "description": "Нанимает команду для экспедиции на Север и приносит премию.",
      "cost": 150,
      "effect": {
        "money": 220
      }
    }
  },
  {
    "id": "B31",
    "name": "Общественный совет",
    "type": "trial",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 31
  },
  {
    "id": "B32",
    "name": "Следственный комитет",
    "type": "goto-jail",
    "price": 0,
    "rent": 0,
    "category": "Особые",
    "order": 32
  }
]`);
    const chance = JSON.parse(`[
  {
    "id": "C01",
    "type": "money",
    "title": "Грант на инновации",
    "text": "Вы побеждаете в конкурсе технологических проектов и получаете 200 ₽.",
    "effect": {
      "money": 200
    }
  },
  {
    "id": "C02",
    "type": "move",
    "title": "Экспресс до Москвы",
    "text": "Отправляйтесь на клетку Москва (B12). Если проходите старт, получите зарплату.",
    "effect": {
      "moveTo": 11
    }
  },
  {
    "id": "C03",
    "type": "penalty",
    "title": "Штраф за парковку",
    "text": "Оплатите 100 ₽ в городской бюджет.",
    "effect": {
      "money": -100
    }
  },
  {
    "id": "C04",
    "type": "money",
    "title": "Дивиденды по акциям",
    "text": "Вам начислены дивиденды — получите 160 ₽.",
    "effect": {
      "money": 160
    }
  },
  {
    "id": "C05",
    "type": "move",
    "title": "Северный ветер",
    "text": "Переместитесь вперёд на 3 клетки.",
    "effect": {
      "move": 3
    }
  },
  {
    "id": "C06",
    "type": "jail",
    "title": "Проверка документов",
    "text": "Отправляйтесь напрямую в тюрьму (B09).",
    "effect": {
      "jail": true
    }
  },
  {
    "id": "C07",
    "type": "release",
    "title": "Лучший адвокат",
    "text": "Сохраните карту и используйте, чтобы выйти из тюрьмы. В прототипе эффект применяется сразу.",
    "effect": {
      "release": true
    }
  },
  {
    "id": "C08",
    "type": "collect",
    "title": "Сбор на реставрацию",
    "text": "Каждый игрок перечисляет вам по 60 ₽.",
    "effect": {
      "collectEach": 60
    }
  },
  {
    "id": "C09",
    "type": "money",
    "title": "Налоговая льгота",
    "text": "Получите компенсацию 120 ₽ от государства.",
    "effect": {
      "money": 120
    }
  },
  {
    "id": "C10",
    "type": "penalty",
    "title": "Неожиданная проверка",
    "text": "Заплатите 90 ₽ штрафа.",
    "effect": {
      "money": -90
    }
  },
  {
    "id": "C11",
    "type": "move",
    "title": "Региональный форум",
    "text": "Перейдите на ближайшую клетку trial и выполните её эффект.",
    "effect": {
      "moveTo": 8
    }
  },
  {
    "id": "C12",
    "type": "money",
    "title": "Сезон туристов",
    "text": "Ваша курортная недвижимость приносит 130 ₽.",
    "effect": {
      "money": 130
    }
  },
  {
    "id": "C13",
    "type": "penalty",
    "title": "Протечка труб",
    "text": "Оплатите ремонт — 70 ₽.",
    "effect": {
      "money": -70
    }
  },
  {
    "id": "C14",
    "type": "money",
    "title": "Федеральная субсидия",
    "text": "Получите 180 ₽ на развитие инфраструктуры.",
    "effect": {
      "money": 180
    }
  },
  {
    "id": "C15",
    "type": "move",
    "title": "Скоростной поезд",
    "text": "Перейдите на клетку Аэроэкспресс (B13).",
    "effect": {
      "moveTo": 12
    }
  },
  {
    "id": "C16",
    "type": "penalty",
    "title": "Срыв контракта",
    "text": "Верните 110 ₽ инвестору.",
    "effect": {
      "money": -110
    }
  },
  {
    "id": "C17",
    "type": "money",
    "title": "Культурный сезон",
    "text": "Организация фестивалей приносит 90 ₽.",
    "effect": {
      "money": 90
    }
  },
  {
    "id": "C18",
    "type": "move",
    "title": "Дорожная развязка",
    "text": "Вернитесь на 2 клетки назад.",
    "effect": {
      "move": -2
    }
  },
  {
    "id": "C19",
    "type": "money",
    "title": "Инвесторы довольны",
    "text": "Получите премию 140 ₽.",
    "effect": {
      "money": 140
    }
  },
  {
    "id": "C20",
    "type": "penalty",
    "title": "Экологический сбор",
    "text": "Заплатите 80 ₽ за переработку отходов.",
    "effect": {
      "money": -80
    }
  }
]`);
    const trial = JSON.parse(`[
  {
    "id": "T01",
    "type": "money",
    "title": "Городской фестиваль",
    "text": "Вы помогли организовать праздник и получаете благодарность 100 ₽.",
    "effect": {
      "money": 100
    }
  },
  {
    "id": "T02",
    "type": "money",
    "title": "Бонусная стипендия",
    "text": "Получите 50 ₽ от университета.",
    "effect": {
      "money": 50
    }
  },
  {
    "id": "T03",
    "type": "penalty",
    "title": "Благотворительный взнос",
    "text": "Перечислите 60 ₽ в фонд помощи.",
    "effect": {
      "money": -60
    }
  },
  {
    "id": "T04",
    "type": "money",
    "title": "Грант на урбанистику",
    "text": "Получите 200 ₽ на развитие района.",
    "effect": {
      "money": 200
    }
  },
  {
    "id": "T05",
    "type": "move",
    "title": "Туристический маршрут",
    "text": "Продвиньтесь на 2 клетки вперёд.",
    "effect": {
      "move": 2
    }
  },
  {
    "id": "T06",
    "type": "money",
    "title": "Возврат налога",
    "text": "Казначейство возвращает 80 ₽.",
    "effect": {
      "money": 80
    }
  },
  {
    "id": "T07",
    "type": "penalty",
    "title": "Поддержка музея",
    "text": "Пожертвуйте 40 ₽ на обновление экспозиции.",
    "effect": {
      "money": -40
    }
  },
  {
    "id": "T08",
    "type": "release",
    "title": "Волонтёрская помощь",
    "text": "Волонтёры обеспечивают ваше освобождение из тюрьмы.",
    "effect": {
      "release": true
    }
  },
  {
    "id": "T09",
    "type": "money",
    "title": "Региональная субсидия",
    "text": "Получите 110 ₽ на развитие инфраструктуры.",
    "effect": {
      "money": 110
    }
  },
  {
    "id": "T10",
    "type": "penalty",
    "title": "Экологический сбор",
    "text": "Оплатите 50 ₽ за переработку отходов.",
    "effect": {
      "money": -50
    }
  },
  {
    "id": "T11",
    "type": "money",
    "title": "Выставка достижений",
    "text": "Продажа билетов приносит 90 ₽.",
    "effect": {
      "money": 90
    }
  },
  {
    "id": "T12",
    "type": "penalty",
    "title": "Техобслуживание",
    "text": "Оплатите 70 ₽ за проверку оборудования.",
    "effect": {
      "money": -70
    }
  },
  {
    "id": "T13",
    "type": "money",
    "title": "Выигрыш в викторине",
    "text": "Получите 60 ₽ призовых.",
    "effect": {
      "money": 60
    }
  },
  {
    "id": "T14",
    "type": "move",
    "title": "Социальный проект",
    "text": "Вернитесь на 1 клетку назад и выполните эффект новой клетки.",
    "effect": {
      "move": -1
    }
  },
  {
    "id": "T15",
    "type": "money",
    "title": "Найдена ошибка",
    "text": "Вы возвращаете излишне уплаченные 75 ₽.",
    "effect": {
      "money": 75
    }
  },
  {
    "id": "T16",
    "type": "penalty",
    "title": "Помощь библиотеке",
    "text": "Перечислите 45 ₽ на покупку книг.",
    "effect": {
      "money": -45
    }
  },
  {
    "id": "T17",
    "type": "money",
    "title": "Приз зрительских симпатий",
    "text": "Получите 85 ₽ за лучшую презентацию.",
    "effect": {
      "money": 85
    }
  },
  {
    "id": "T18",
    "type": "money",
    "title": "Благодарность губернатора",
    "text": "Вам вручают премию 150 ₽.",
    "effect": {
      "money": 150
    }
  },
  {
    "id": "T19",
    "type": "penalty",
    "title": "Срочный ремонт",
    "text": "Оплатите 95 ₽ за ремонт крыши.",
    "effect": {
      "money": -95
    }
  },
  {
    "id": "T20",
    "type": "move",
    "title": "Ночная смена",
    "text": "Продвиньтесь на 4 клетки вперёд, чтобы быстрее завершить задачу.",
    "effect": {
      "move": 4
    }
  }
]`);
    const presets = JSON.parse(`{
  "intl-friendly": {
    "name": "International Friendly",
    "description": "Упрощённый режим с мягкими налогами и быстрыми партиями.",
    "salary": 200,
    "taxRate": 0.08,
    "luxuryTax": 100,
    "jailFine": 80,
    "bailout": 180
  },
  "rus": {
    "name": "Русский Классик",
    "description": "Базовый баланс с акцентом на длинные партии.",
    "salary": 200,
    "taxRate": 0.1,
    "luxuryTax": 150,
    "jailFine": 100,
    "bailout": 240
  }
}`);
    const locales = {
      ru: JSON.parse(`{
  "app_title": "Русская Монополия",
  "badge_loading": "Загрузка данных...",
  "badge_loaded": "Данные загружены",
  "badge_fallback": "Загружены офлайн-данные",
  "badge_error_loading": "Не удалось загрузить",
  "badge_restored": "Сохранение восстановлено",
  "badge_restore_failed": "Не удалось восстановить сохранение",
  "badge_saved": "Игра сохранена",
  "badge_storage_error": "Не удалось сохранить игру",
  "setup_title": "Подготовка",
  "setup_help": "Заполните параметры и начните игру",
  "label_players": "Количество игроков (2–6)",
  "label_preset": "Пресет баланса",
  "label_language": "Язык интерфейса",
  "label_start_money": "Стартовый капитал",
  "btn_start": "Начать игру",
  "board_title": "Игровое поле",
  "btn_roll": "Бросить кубики",
  "btn_buy": "Купить / арендовать",
  "btn_end": "Завершить ход",
  "players_title": "Игроки",
  "log_title": "Журнал событий",
  "card_title": "Активная карта",
  "btn_close": "Закрыть",
  "footer_hint": "Сохранение происходит автоматически в локальном хранилище.",
  "player": "Игрок",
  "active": "активный",
  "status_in_jail": "В тюрьме",
  "status_free": "Свободен",
  "owned_by": "Принадлежит",
  "no_owner": "Без владельца",
  "cell_type": "Тип",
  "cell_price": "Цена",
  "cell_owner": "Владелец",
  "micro_event_label": "Микро-событие",
  "contract_label": "Контракт",
  "offer_purchase": "Доступно для покупки",
  "landed": "попал на",
  "landed_own_property": "Это ваша собственность",
  "landed_start": "Получите зарплату",
  "paid_rent": "Оплатил аренду игроку",
  "received_rent": "Получил аренду от",
  "paid_shared_event": "Участие в сборе",
  "received_shared_event": "Получил взнос",
  "passed_start": "Прошли старт и получили зарплату",
  "visit_jail": "Просто посетили тюрьму",
  "goto_jail": "Отправляйтесь в тюрьму",
  "jail_escape_doubles": "Дубль! Вы выходите из тюрьмы",
  "jail_fine_paid": "Оплата штрафа за тюрьму",
  "extra_turn_doubles": "Дубль! Вы получаете ещё один ход",
  "jail_three_doubles": "Три дубля подряд — тюрьма!",
  "card_to_jail": "Карта отправляет в тюрьму",
  "card_release": "Карта освобождает из тюрьмы",
  "not_enough_money": "Недостаточно денег",
  "not_enough_contract": "Недостаточно средств для контракта",
  "contract_bought": "Контракт активирован",
  "contract_owned": "Контракт уже оформлен",
  "effect_money": "Изменение баланса",
  "log_game_started": "Игра началась!",
  "must_roll_first": "Сначала бросьте кубики",
  "in_jail_prompt": "Вы в тюрьме — выбросите дубль или оплатите штраф",
  "rolled": "бросил",
  "purchased": "Приобретено",
  "bankrupted": "обанкротился",
  "free": "Бесплатно",
  "celltype_start": "Старт",
  "celltype_property": "Собственность",
  "celltype_transport": "Транспорт",
  "celltype_utility": "Коммунальное предприятие",
  "celltype_tax": "Налог",
  "celltype_chance": "Шанс",
  "celltype_trial": "Испытание",
  "celltype_jail": "Тюрьма",
  "celltype_goto-jail": "Отправка в тюрьму",
  "celltype_micro-event": "Микро-событие",
  "celltype_contract": "Контракт",
  "cell_B01": "Старт",
  "cell_B02": "Калининград",
  "cell_B03": "Псков",
  "cell_B04": "Шанс",
  "cell_B05": "Санкт-Петербург",
  "cell_B06": "Великий Новгород",
  "cell_B07": "Мурманск",
  "cell_B08": "Региональный налог",
  "cell_B09": "Грантовый конкурс",
  "cell_B10": "Тула",
  "cell_B11": "Коломна",
  "cell_B12": "Москва",
  "cell_B13": "Аэроэкспресс",
  "cell_B14": "Сочи",
  "cell_B15": "Владикавказ",
  "cell_B16": "Шанс",
  "cell_B17": "Казань",
  "cell_B18": "Нижний Новгород",
  "cell_B19": "Самара",
  "cell_B20": "ВолгаЭнерго",
  "cell_B21": "Екатеринбург",
  "cell_B22": "Пермь",
  "cell_B23": "Новосибирск",
  "cell_B24": "Красноярск",
  "cell_B25": "Иркутск",
  "cell_B26": "Владивосток",
  "cell_B27": "Хабаровск",
  "cell_B28": "Фестиваль варенья",
  "cell_B29": "Полярный исследователь",
  "cell_B30": "Северсвязь",
  "cell_B31": "Общественный совет",
  "cell_B32": "Следственный комитет",
  "error_player_count": "Введите от 2 до 6 игроков"
}`),
      en: JSON.parse(`{
  "app_title": "Russian Monopoly",
  "badge_loading": "Loading data...",
  "badge_loaded": "Data loaded",
  "badge_fallback": "Fallback data loaded",
  "badge_error_loading": "Could not load",
  "badge_restored": "Save restored",
  "badge_restore_failed": "Restore failed",
  "badge_saved": "Game saved",
  "badge_storage_error": "Storage error",
  "setup_title": "Setup",
  "setup_help": "Set the options and press Start to begin",
  "label_players": "Players (2–6)",
  "label_preset": "Preset",
  "label_language": "Language",
  "label_start_money": "Starting cash",
  "btn_start": "Start game",
  "board_title": "Board",
  "btn_roll": "Roll dice",
  "btn_buy": "Buy / rent",
  "btn_end": "End turn",
  "players_title": "Players",
  "log_title": "Game log",
  "card_title": "Active card",
  "btn_close": "Close",
  "footer_hint": "Auto-save is enabled in local storage.",
  "player": "Player",
  "active": "active",
  "status_in_jail": "In jail",
  "status_free": "Free",
  "owned_by": "Owned by",
  "no_owner": "No owner",
  "cell_type": "Type",
  "cell_price": "Price",
  "cell_owner": "Owner",
  "micro_event_label": "Micro-event",
  "contract_label": "Contract",
  "offer_purchase": "Available for purchase",
  "landed": "landed on",
  "landed_own_property": "You own this property",
  "landed_start": "Take your salary",
  "paid_rent": "Paid rent to",
  "received_rent": "Received rent from",
  "paid_shared_event": "Shared contribution",
  "received_shared_event": "Received contribution",
  "passed_start": "Passed start and received salary",
  "visit_jail": "Just visiting",
  "goto_jail": "Go directly to jail",
  "jail_escape_doubles": "Doubles! You escape jail",
  "jail_fine_paid": "Paid the jail fine",
  "extra_turn_doubles": "Doubles! Take another turn",
  "jail_three_doubles": "Three doubles in a row — jail!",
  "card_to_jail": "Card sends you to jail",
  "card_release": "Card frees you from jail",
  "not_enough_money": "Not enough money",
  "not_enough_contract": "Not enough money for the contract",
  "contract_bought": "Contract activated",
  "contract_owned": "Contract already owned",
  "effect_money": "Balance updated",
  "log_game_started": "Game started!",
  "must_roll_first": "Roll the dice first",
  "in_jail_prompt": "You are in jail — roll doubles or pay the fine",
  "rolled": "rolled",
  "purchased": "Purchased",
  "bankrupted": "went bankrupt",
  "free": "Free",
  "celltype_start": "Start",
  "celltype_property": "Property",
  "celltype_transport": "Transport",
  "celltype_utility": "Utility",
  "celltype_tax": "Tax",
  "celltype_chance": "Chance",
  "celltype_trial": "Trial",
  "celltype_jail": "Jail",
  "celltype_goto-jail": "Go to jail",
  "celltype_micro-event": "Micro-event",
  "celltype_contract": "Contract",
  "cell_B01": "Start",
  "cell_B02": "Kaliningrad",
  "cell_B03": "Pskov",
  "cell_B04": "Chance",
  "cell_B05": "Saint Petersburg",
  "cell_B06": "Veliky Novgorod",
  "cell_B07": "Murmansk",
  "cell_B08": "Regional tax",
  "cell_B09": "Grant contest",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moscow",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sochi",
  "cell_B15": "Vladikavkaz",
  "cell_B16": "Chance",
  "cell_B17": "Kazan",
  "cell_B18": "Nizhny Novgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Yekaterinburg",
  "cell_B22": "Perm",
  "cell_B23": "Novosibirsk",
  "cell_B24": "Krasnoyarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Vladivostok",
  "cell_B27": "Khabarovsk",
  "cell_B28": "Jam Festival",
  "cell_B29": "Polar Explorer",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Civic council",
  "cell_B32": "Investigative Committee",
  "error_player_count": "Enter from 2 to 6 players"
}`),
      de: JSON.parse(`{
  "app_title": "Russische Monopoly",
  "badge_loading": "Lade Daten...",
  "badge_loaded": "Daten geladen",
  "badge_fallback": "Offline-Daten geladen",
  "badge_error_loading": "Fehler beim Laden",
  "badge_restored": "Spielstand geladen",
  "badge_restore_failed": "Spielstand konnte nicht geladen werden",
  "badge_saved": "Spiel gespeichert",
  "badge_storage_error": "Speichern fehlgeschlagen",
  "setup_title": "Vorbereitung",
  "setup_help": "Wähle Einstellungen und starte das Spiel",
  "label_players": "Spieler (2–6)",
  "label_preset": "Preset",
  "label_language": "Sprache",
  "label_start_money": "Startkapital",
  "btn_start": "Spiel starten",
  "board_title": "Spielbrett",
  "btn_roll": "Würfeln",
  "btn_buy": "Kaufen / mieten",
  "btn_end": "Zug beenden",
  "players_title": "Spieler",
  "log_title": "Protokoll",
  "card_title": "Aktive Karte",
  "btn_close": "Schließen",
  "footer_hint": "Autospeicherung im lokalen Speicher aktiviert.",
  "player": "Spieler",
  "active": "aktiv",
  "status_in_jail": "Im Gefängnis",
  "status_free": "Frei",
  "owned_by": "Gehört",
  "no_owner": "Ohne Besitzer",
  "cell_type": "Typ",
  "cell_price": "Preis",
  "cell_owner": "Besitzer",
  "micro_event_label": "Mikro-Ereignis",
  "contract_label": "Auftrag",
  "offer_purchase": "Zum Kauf verfügbar",
  "landed": "landet auf",
  "landed_own_property": "Eigene Immobilie",
  "landed_start": "Ziehe dein Gehalt",
  "paid_rent": "Miete gezahlt an",
  "received_rent": "Miete erhalten von",
  "paid_shared_event": "Gemeinsamer Beitrag",
  "received_shared_event": "Beitrag erhalten",
  "passed_start": "Start überquert und Gehalt erhalten",
  "visit_jail": "Nur zu Besuch",
  "goto_jail": "Gehe direkt ins Gefängnis",
  "jail_escape_doubles": "Pasch! Du kommst frei",
  "jail_fine_paid": "Strafe für Gefängnis bezahlt",
  "extra_turn_doubles": "Pasch! Noch ein Zug",
  "jail_three_doubles": "Drei Pasch in Folge – Gefängnis!",
  "card_to_jail": "Karte schickt dich ins Gefängnis",
  "card_release": "Karte befreit dich",
  "not_enough_money": "Zu wenig Geld",
  "not_enough_contract": "Nicht genug Geld für den Auftrag",
  "contract_bought": "Auftrag aktiviert",
  "contract_owned": "Auftrag bereits vorhanden",
  "effect_money": "Kontostand aktualisiert",
  "log_game_started": "Spiel gestartet!",
  "must_roll_first": "Bitte zuerst würfeln",
  "in_jail_prompt": "Du bist im Gefängnis – würfle einen Pasch oder zahle",
  "rolled": "würfelte",
  "purchased": "Gekauft",
  "bankrupted": "ist bankrott",
  "free": "Kostenlos",
  "celltype_start": "Start",
  "celltype_property": "Immobilie",
  "celltype_transport": "Transport",
  "celltype_utility": "Versorgung",
  "celltype_tax": "Steuer",
  "celltype_chance": "Chance",
  "celltype_trial": "Gemeinschaft",
  "celltype_jail": "Gefängnis",
  "celltype_goto-jail": "Ins Gefängnis",
  "celltype_micro-event": "Mikro-Ereignis",
  "celltype_contract": "Auftrag",
  "cell_B01": "Start",
  "cell_B02": "Kaliningrad",
  "cell_B03": "Pskow",
  "cell_B04": "Chance",
  "cell_B05": "Sankt Petersburg",
  "cell_B06": "Weliki Nowgorod",
  "cell_B07": "Murmansk",
  "cell_B08": "Regionalsteuer",
  "cell_B09": "Grant-Wettbewerb",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moskau",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sotschi",
  "cell_B15": "Wladikawkas",
  "cell_B16": "Chance",
  "cell_B17": "Kasan",
  "cell_B18": "Nischni Nowgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Jekaterinburg",
  "cell_B22": "Perm",
  "cell_B23": "Nowosibirsk",
  "cell_B24": "Krasnojarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Wladiwostok",
  "cell_B27": "Chabarowsk",
  "cell_B28": "Marmeladenfest",
  "cell_B29": "Polar-Forscher",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Bürger-Rat",
  "cell_B32": "Ermittlungs-Komitee",
  "error_player_count": "Bitte 2 bis 6 Spieler eingeben"
}`),
      es: JSON.parse(`{
  "app_title": "Monopolio Ruso",
  "badge_loading": "Cargando datos...",
  "badge_loaded": "Datos cargados",
  "badge_fallback": "Datos locales cargados",
  "badge_error_loading": "No se pudo cargar",
  "badge_restored": "Partida restaurada",
  "badge_restore_failed": "No se pudo restaurar",
  "badge_saved": "Partida guardada",
  "badge_storage_error": "Error al guardar",
  "setup_title": "Configuración",
  "setup_help": "Elige opciones y pulsa Iniciar",
  "label_players": "Jugadores (2–6)",
  "label_preset": "Preajuste",
  "label_language": "Idioma",
  "label_start_money": "Capital inicial",
  "btn_start": "Iniciar juego",
  "board_title": "Tablero",
  "btn_roll": "Lanzar dados",
  "btn_buy": "Comprar / alquilar",
  "btn_end": "Terminar turno",
  "players_title": "Jugadores",
  "log_title": "Registro",
  "card_title": "Carta activa",
  "btn_close": "Cerrar",
  "footer_hint": "Guardado automático en el almacenamiento local.",
  "player": "Jugador",
  "active": "activo",
  "status_in_jail": "En la cárcel",
  "status_free": "Libre",
  "owned_by": "Propiedad de",
  "no_owner": "Sin propietario",
  "cell_type": "Tipo",
  "cell_price": "Precio",
  "cell_owner": "Propietario",
  "micro_event_label": "Microevento",
  "contract_label": "Contrato",
  "offer_purchase": "Disponible para compra",
  "landed": "cayó en",
  "landed_own_property": "Es tu propiedad",
  "landed_start": "Recibe salario",
  "paid_rent": "Pagó renta a",
  "received_rent": "Recibió renta de",
  "paid_shared_event": "Contribución compartida",
  "received_shared_event": "Recibió contribución",
  "passed_start": "Pasaste por inicio y cobraste salario",
  "visit_jail": "Solo de visita",
  "goto_jail": "Ir directo a la cárcel",
  "jail_escape_doubles": "¡Doble! Sales de la cárcel",
  "jail_fine_paid": "Pagaste la multa de la cárcel",
  "extra_turn_doubles": "¡Doble! Tira otra vez",
  "jail_three_doubles": "Tres dobles seguidos — a la cárcel",
  "card_to_jail": "La carta te envía a la cárcel",
  "card_release": "La carta te libera",
  "not_enough_money": "No tienes suficiente dinero",
  "not_enough_contract": "No tienes dinero para el contrato",
  "contract_bought": "Contrato activado",
  "contract_owned": "Contrato ya adquirido",
  "effect_money": "Saldo actualizado",
  "log_game_started": "¡Comienza la partida!",
  "must_roll_first": "Lanza los dados primero",
  "in_jail_prompt": "Estás en la cárcel — saca dobles o paga la multa",
  "rolled": "lanzó",
  "purchased": "Comprado",
  "bankrupted": "se declaró en quiebra",
  "free": "Gratis",
  "celltype_start": "Inicio",
  "celltype_property": "Propiedad",
  "celltype_transport": "Transporte",
  "celltype_utility": "Servicio",
  "celltype_tax": "Impuesto",
  "celltype_chance": "Suerte",
  "celltype_trial": "Comunidad",
  "celltype_jail": "Cárcel",
  "celltype_goto-jail": "Ir a la cárcel",
  "celltype_micro-event": "Microevento",
  "celltype_contract": "Contrato",
  "cell_B01": "Inicio",
  "cell_B02": "Kaliningrado",
  "cell_B03": "Pskov",
  "cell_B04": "Suerte",
  "cell_B05": "San Petersburgo",
  "cell_B06": "Veliky Novgorod",
  "cell_B07": "Múrmansk",
  "cell_B08": "Impuesto regional",
  "cell_B09": "Concurso de becas",
  "cell_B10": "Tula",
  "cell_B11": "Kolomna",
  "cell_B12": "Moscú",
  "cell_B13": "Aeroexpress",
  "cell_B14": "Sochi",
  "cell_B15": "Vladikavkaz",
  "cell_B16": "Suerte",
  "cell_B17": "Kazán",
  "cell_B18": "Nizhni Nóvgorod",
  "cell_B19": "Samara",
  "cell_B20": "VolgaEnergo",
  "cell_B21": "Ekaterimburgo",
  "cell_B22": "Perm",
  "cell_B23": "Novosibirsk",
  "cell_B24": "Krasnoyarsk",
  "cell_B25": "Irkutsk",
  "cell_B26": "Vladivostok",
  "cell_B27": "Jabárovsk",
  "cell_B28": "Festival de mermelada",
  "cell_B29": "Explorador polar",
  "cell_B30": "Seversvyaz",
  "cell_B31": "Consejo cívico",
  "cell_B32": "Comité de Investigación",
  "error_player_count": "Introduce entre 2 y 6 jugadores"
}`),
    };
    return { board, chance, trial, presets, locales };
  }
})();
