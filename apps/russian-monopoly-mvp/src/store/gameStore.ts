import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  BoardCell,
  Card,
  CardEffect,
  Contract,
  GameData,
  GamePreset,
  MicroEvent
} from '../config/types';

export interface PlayerState {
  id: string;
  name: string;
  token: string;
  position: number;
  balance: number;
  inJail: boolean;
  jailTurns: number;
  freeJailCards: number;
  properties: string[];
  contracts: string[];
}

export type TurnPhase = 'setup' | 'idle' | 'purchase' | 'card';

export interface PendingPurchase {
  cellId: string;
  price: number;
}

interface GameStoreState {
  board: BoardCell[];
  chanceDeck: Card[];
  trialDeck: Card[];
  microEvents: MicroEvent[];
  contracts: Contract[];
  presets: Record<string, GamePreset>;
  locales: Record<string, Record<string, string>>;
  players: PlayerState[];
  currentPlayerIndex: number;
  dice: [number, number];
  turnPhase: TurnPhase;
  log: string[];
  isGameStarted: boolean;
  selectedPreset: string;
  selectedLocale: string;
  pendingPurchase?: PendingPurchase;
  pendingCard?: Card;
  activeCell?: BoardCell;
  warnings: string[];
  gameConfig: GamePreset;
  nextMicroEventIndex: number;
  loadData: (payload: { data: GameData; warnings: string[] }) => void;
  setPreset: (presetKey: string) => void;
  setLocale: (locale: string) => void;
  setupGame: (players: { name: string; token: string }[], presetKey: string) => void;
  rollDice: () => void;
  purchaseProperty: () => void;
  declinePurchase: () => void;
  resolveCard: () => void;
  endTurn: () => void;
  resetGame: () => void;
}

const PROPERTY_TYPES = new Set<BoardCell['type']>(['property', 'transport', 'utility']);

const emptyPreset: GamePreset = {
  name: 'Пустой',
  description: 'Резервный пресет.',
  salary: 200,
  taxRate: 0.1,
  luxuryTax: 100,
  jailFine: 50,
  bailout: 150
};

const clampLog = (log: string[]) => log.slice(-50);

const addWarning = (state: GameStoreState, message: string) => {
  if (!state.warnings.includes(message)) {
    state.warnings.push(message);
  }
};

const normalizePlayersAfterDataLoad = (state: GameStoreState) => {
  const boardLength = state.board.length;
  const validCellIds = new Set(state.board.map((cell) => cell.id));
  const validContractIds = new Set(state.contracts.map((contract) => contract.id));

  state.players.forEach((player) => {
    if (boardLength > 0) {
      const normalizedPosition = ((player.position % boardLength) + boardLength) % boardLength;
      player.position = normalizedPosition;
    } else {
      player.position = 0;
    }

    player.properties = player.properties.filter((propertyId) => validCellIds.has(propertyId));
    player.contracts = player.contracts.filter((contractId) => validContractIds.has(contractId));
  });

  if (state.players.length === 0) {
    state.currentPlayerIndex = 0;
    state.activeCell = boardLength > 0 ? state.board[0] : undefined;
    state.isGameStarted = false;
    state.turnPhase = 'setup';
  } else {
    state.currentPlayerIndex = Math.min(state.currentPlayerIndex, state.players.length - 1);
    if (boardLength > 0) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      state.activeCell = state.board[currentPlayer.position];
    } else {
      state.activeCell = undefined;
    }
  }

  if (state.pendingPurchase && !validCellIds.has(state.pendingPurchase.cellId)) {
    state.pendingPurchase = undefined;
  }

  if (state.pendingCard) {
    const validCardIds = new Set([...state.chanceDeck, ...state.trialDeck].map((card) => card.id));
    if (!validCardIds.has(state.pendingCard.id)) {
      state.pendingCard = undefined;
    }
  }
};

function getRentValue(cell: BoardCell, preset: GamePreset): number {
  if (typeof cell.rent === 'number') {
    return cell.rent;
  }

  if (cell.rent && typeof cell.rent === 'object') {
    if (typeof cell.rent.fixed === 'number') {
      return cell.rent.fixed;
    }

    if (typeof cell.rent.base === 'number') {
      return cell.rent.base;
    }

    if (typeof cell.rent.multiplier === 'number' && typeof cell.price === 'number') {
      return Math.round(cell.price * cell.rent.multiplier);
    }
  }

  if (typeof cell.price === 'number') {
    return Math.round(cell.price * preset.taxRate);
  }

  return 0;
}

function resolveTaxAmount(cell: BoardCell, player: PlayerState, preset: GamePreset): number {
  if (typeof cell.tax === 'number' && cell.tax > 0) {
    return cell.tax;
  }

  if (typeof cell.amount === 'number' && cell.amount > 0) {
    return cell.amount;
  }

  return Math.round(Math.max(player.balance, 0) * preset.taxRate);
}

function sendPlayerToJail(state: GameStoreState, player: PlayerState, context?: string) {
  const jailIndex = state.board.findIndex((cell) => cell.type === 'jail');
  const startIndex = state.board.findIndex((cell) => cell.type === 'start');

  const destinationIndex = jailIndex >= 0 ? jailIndex : startIndex;
  if (destinationIndex >= 0) {
    player.position = destinationIndex;
    state.activeCell = state.board[destinationIndex];
  }

  player.inJail = true;
  player.jailTurns = 2;
  state.pendingPurchase = undefined;
  state.pendingCard = undefined;
  state.turnPhase = 'idle';

  const reasonSuffix = context ? ` (${context})` : '';
  state.log.push(`${player.name} отправлен в тюрьму${reasonSuffix}.`);

  if (jailIndex < 0) {
    state.log.push(
      startIndex >= 0
        ? 'Клетка тюрьмы отсутствует — игрок перемещён на стартовую позицию.'
        : 'Клетка тюрьмы отсутствует на поле.'
    );
  }
}

function handlePlayerLanding(state: GameStoreState, player: PlayerState): void {
  if (state.board.length === 0) {
    state.log.push('Поле не загружено.');
    state.turnPhase = 'idle';
    state.log = clampLog(state.log);
    return;
  }

  const normalizedPosition = ((player.position % state.board.length) + state.board.length) % state.board.length;
  if (normalizedPosition !== player.position) {
    player.position = normalizedPosition;
  }

  const cell = state.board[player.position];
  state.activeCell = cell;
  state.pendingPurchase = undefined;

  let nextPhase: TurnPhase | undefined;

  if (PROPERTY_TYPES.has(cell.type)) {
    const owner = state.players.find((candidate) => candidate.properties.includes(cell.id));
    if (!owner) {
      if (cell.price && cell.price > 0) {
        state.pendingPurchase = { cellId: cell.id, price: cell.price };
        state.log.push(`${player.name} может купить ${cell.name} за ${cell.price}₽.`);
        nextPhase = 'purchase';
      } else {
        nextPhase = 'idle';
      }
    } else if (owner.id !== player.id) {
      const rent = getRentValue(cell, state.gameConfig);
      if (rent > 0) {
        player.balance -= rent;
        owner.balance += rent;
        state.log.push(`${player.name} заплатил ${rent}₽ игроку ${owner.name}.`);
      } else {
        state.log.push(`${player.name} посетил владение игрока ${owner.name}.`);
      }
      nextPhase = 'idle';
    } else {
      nextPhase = 'idle';
    }
  } else if (cell.type === 'tax') {
    const taxAmount = resolveTaxAmount(cell, player, state.gameConfig);
    player.balance -= taxAmount;
    state.log.push(`${player.name} уплатил налог ${taxAmount}₽.`);
    nextPhase = 'idle';
  } else if (cell.type === 'chance' || cell.type === 'trial') {
    const isChance = cell.type === 'chance';
    const deck = isChance ? state.chanceDeck : state.trialDeck;
    if (deck.length > 0) {
      const card = deck.shift()!;
      deck.push(card);
      state.pendingCard = card;
      state.log.push(
        `${player.name} тянет карту ${isChance ? 'Шанс' : 'Испытание'}: ${card.title ?? card.id}.`
      );
      nextPhase = 'card';
    } else {
      state.log.push('Колода пуста.');
      nextPhase = 'idle';
    }
  } else if (cell.type === 'goto-jail') {
    sendPlayerToJail(state, player, 'клетка «Следственный комитет»');
    nextPhase = state.turnPhase;
  } else if (cell.type === 'contract') {
    const takenContracts = new Set(state.players.flatMap((candidate) => candidate.contracts));
    const availableContract = state.contracts.find((contract) => !takenContracts.has(contract.id));

    if (availableContract && !player.contracts.includes(availableContract.id)) {
      player.contracts.push(availableContract.id);
      state.log.push(`${player.name} заключил контракт «${availableContract.name}».`);
    } else if (!availableContract) {
      state.log.push('Свободных контрактов не осталось.');
    } else {
      state.log.push(`${player.name} уже владеет активным контрактом.`);
    }

    nextPhase = 'idle';
  } else if (cell.type === 'micro-event') {
    if (state.microEvents.length > 0) {
      const event = state.microEvents[state.nextMicroEventIndex % state.microEvents.length];
      state.nextMicroEventIndex = (state.nextMicroEventIndex + 1) % state.microEvents.length;
      state.log.push(`${player.name} активирует микро-ивент «${event.name}».`);
      applyEffect(event.effect, state, player, `Микро-ивент «${event.name}»`);
      if (!state.pendingCard && !state.pendingPurchase) {
        nextPhase = 'idle';
      }
    } else {
      state.log.push('Микро-ивенты не настроены.');
      nextPhase = 'idle';
    }
  } else {
    nextPhase = 'idle';
  }

  if (nextPhase) {
    state.turnPhase = nextPhase;
  }

  state.log = clampLog(state.log);
}

function applyEffect(effect: CardEffect, state: GameStoreState, player: PlayerState, context: string) {
  if (!effect) {
    return;
  }

  if (effect.money && effect.money !== 0) {
    player.balance += effect.money;
    state.log.push(
      `${context}: ${player.name} ${effect.money > 0 ? 'получает' : 'платит'} ${Math.abs(effect.money)}₽.`
    );
  }

  if (effect.incomeMultiplier && effect.incomeMultiplier !== 0) {
    state.log.push(
      `${context}: применён множитель дохода ${effect.incomeMultiplier.toFixed(2)} (учёт ведётся вручную).`
    );
  }

  let moved = false;

  if (typeof effect.moveTo === 'number' && state.board.length > 0) {
    const previousPosition = player.position;
    const normalizedTarget = ((effect.moveTo % state.board.length) + state.board.length) % state.board.length;
    player.position = normalizedTarget;
    moved = true;
    if (normalizedTarget < previousPosition) {
      player.balance += state.gameConfig.salary;
      state.log.push(`${context}: ${player.name} получает ${state.gameConfig.salary}₽ за проход через старт.`);
    }
    state.log.push(`${context}: ${player.name} перемещается на ${state.board[normalizedTarget].name}.`);
  } else if (typeof effect.move === 'number') {
    if (state.board.length === 0) {
      state.log.push(`${context}: перемещение невозможно — поле не загружено.`);
    } else {
      const previousPosition = player.position;
      const rawPosition = previousPosition + effect.move;
      const normalized = ((rawPosition % state.board.length) + state.board.length) % state.board.length;
      player.position = normalized;
      moved = true;
      if (effect.move > 0 && rawPosition >= state.board.length) {
        player.balance += state.gameConfig.salary;
        state.log.push(`${context}: ${player.name} получает ${state.gameConfig.salary}₽ за проход через старт.`);
      }
      state.log.push(`${context}: ${player.name} перемещается на ${state.board[normalized].name}.`);
    }
  }

  if (effect.goTo) {
    if (state.board.length === 0) {
      state.log.push(`${context}: перемещение невозможно — поле не загружено.`);
    } else {
      const destinationIndex = state.board.findIndex((cell) => cell.id === effect.goTo);
      if (destinationIndex >= 0) {
        const previousPosition = player.position;
        player.position = destinationIndex;
        moved = true;
        if (destinationIndex < previousPosition) {
          player.balance += state.gameConfig.salary;
          state.log.push(`${context}: ${player.name} получает ${state.gameConfig.salary}₽ за проход через старт.`);
        }
        state.log.push(`${context}: ${player.name} перемещается на ${state.board[destinationIndex].name}.`);
      } else {
        state.log.push(`${context}: целевая клетка ${effect.goTo} не найдена.`);
      }
    }
  }

  if (effect.jail) {
    sendPlayerToJail(state, player, context);
    moved = false;
  }

  if (effect.freeJail) {
    player.freeJailCards += 1;
    state.log.push(`${context}: ${player.name} получает карту выхода из тюрьмы.`);
  }

  if (moved) {
    handlePlayerLanding(state, player);
  }
}

export const useGameStore = create<GameStoreState>()(
  persist(
    immer((set, get) => ({
      board: [],
      chanceDeck: [],
      trialDeck: [],
      microEvents: [],
      contracts: [],
      presets: {},
      locales: {},
      players: [],
      currentPlayerIndex: 0,
      dice: [0, 0],
      turnPhase: 'setup',
      log: [],
      isGameStarted: false,
      selectedPreset: 'rus',
      selectedLocale: 'ru',
      warnings: [],
      gameConfig: emptyPreset,
      nextMicroEventIndex: 0,

      loadData: ({ data, warnings }) =>
        set((state) => {
          state.board = data.board;
          state.chanceDeck = data.chance;
          state.trialDeck = data.trial;
          state.microEvents = data.microEvents;
          state.contracts = data.contracts;
          state.presets = data.presets;
          state.locales = data.locales;
          state.warnings = Array.from(new Set(warnings));
          state.nextMicroEventIndex = 0;

          const presetKeys = Object.keys(state.presets);
          if (presetKeys.length > 0) {
            const preferredPresetKey = presetKeys.includes(state.selectedPreset)
              ? state.selectedPreset
              : presetKeys[0];
            if (preferredPresetKey !== state.selectedPreset) {
              addWarning(
                state,
                `Пресет ${state.selectedPreset} недоступен и был заменён на ${preferredPresetKey}.`
              );
            }
            state.selectedPreset = preferredPresetKey;
            state.gameConfig = state.presets[preferredPresetKey];
          } else {
            state.selectedPreset = 'fallback';
            state.gameConfig = emptyPreset;
            addWarning(state, 'Используется резервный пресет экономики.');
          }

          const localeKeys = Object.keys(state.locales);
          if (localeKeys.length === 0) {
            state.locales = { ru: {} };
            state.selectedLocale = 'ru';
            addWarning(state, 'Локали отсутствуют, применяется пустая русская локаль.');
          } else if (!localeKeys.includes(state.selectedLocale)) {
            const fallbackLocale = localeKeys.includes('ru') ? 'ru' : localeKeys[0];
            addWarning(
              state,
              `Локаль ${state.selectedLocale} недоступна и была заменена на ${fallbackLocale}.`
            );
            state.selectedLocale = fallbackLocale;
          }

          normalizePlayersAfterDataLoad(state);
        }),

      setPreset: (presetKey) =>
        set((state) => {
          const preset = state.presets[presetKey];
          if (!preset) {
            addWarning(state, `Пресет ${presetKey} отсутствует в загруженных данных.`);
            state.log.push(`Попытка выбрать недоступный пресет ${presetKey}.`);
            state.log = clampLog(state.log);
            return;
          }

          state.selectedPreset = presetKey;
          state.gameConfig = preset;
          state.log.push(`Выбран пресет ${preset.name}.`);
          state.log = clampLog(state.log);
        }),

      setLocale: (locale) =>
        set((state) => {
          if (!state.locales[locale]) {
            addWarning(state, `Локаль ${locale} отсутствует в данных.`);
            return;
          }

          state.selectedLocale = locale;
        }),

      setupGame: (playerConfigs, presetKey) =>
        set((state) => {
          const preset = state.presets[presetKey] ?? state.gameConfig;
          state.selectedPreset = presetKey;
          state.gameConfig = preset;
          state.nextMicroEventIndex = 0;
          state.players = playerConfigs.map((config, index) => ({
            id: `player-${index + 1}`,
            name: config.name,
            token: config.token,
            position: 0,
            balance: preset.salary,
            inJail: false,
            jailTurns: 0,
            freeJailCards: 0,
            properties: [],
            contracts: []
          }));
          state.currentPlayerIndex = 0;
          state.turnPhase = 'idle';
          state.isGameStarted = true;
          state.pendingPurchase = undefined;
          state.pendingCard = undefined;
          state.activeCell = state.board[0];
          state.dice = [0, 0];
          state.log.push('Партия запущена.');
          state.log = clampLog(state.log);
        }),

      rollDice: () =>
        set((state) => {
          if (!state.isGameStarted || state.turnPhase !== 'idle' || state.players.length === 0) {
            return;
          }

          const player = state.players[state.currentPlayerIndex];

          if (player.inJail) {
            if (player.freeJailCards > 0) {
              player.freeJailCards -= 1;
              player.inJail = false;
              player.jailTurns = 0;
              state.log.push(`${player.name} использовал карту выхода из тюрьмы.`);
            } else {
              player.balance -= state.gameConfig.jailFine;
              player.inJail = false;
              player.jailTurns = 0;
              state.log.push(`${player.name} оплатил штраф ${state.gameConfig.jailFine}₽ и вышел из тюрьмы.`);
            }
          }

          const die1 = Math.floor(Math.random() * 6) + 1;
          const die2 = Math.floor(Math.random() * 6) + 1;
          state.dice = [die1, die2];

          if (state.board.length === 0) {
            state.log.push('Поле не загружено.');
            state.log = clampLog(state.log);
            return;
          }

          const steps = die1 + die2;
          const startPosition = player.position;
          const newPosition = (startPosition + steps) % state.board.length;
          player.position = newPosition;
          state.activeCell = state.board[newPosition];

          if (startPosition + steps >= state.board.length) {
            player.balance += state.gameConfig.salary;
            state.log.push(`${player.name} получил ${state.gameConfig.salary}₽ за проход через старт.`);
          }

          state.log.push(
            `${player.name} бросил ${die1} и ${die2} и перешёл на ${state.board[newPosition].name}.`
          );

          handlePlayerLanding(state, player);
        }),

      purchaseProperty: () =>
        set((state) => {
          if (!state.pendingPurchase) return;
          const player = state.players[state.currentPlayerIndex];
          const { cellId, price } = state.pendingPurchase;
          const cell = state.board.find((item) => item.id === cellId);
          if (!cell) {
            state.log.push('Не удалось найти объект для покупки.');
            state.pendingPurchase = undefined;
            state.turnPhase = 'idle';
            state.log = clampLog(state.log);
            return;
          }

          if (player.balance < price) {
            state.log.push(`${player.name} не хватает средств на покупку ${cell.name}.`);
            state.pendingPurchase = undefined;
            state.turnPhase = 'idle';
            state.log = clampLog(state.log);
            return;
          }

          player.balance -= price;
          player.properties.push(cellId);
          state.log.push(`${player.name} приобрёл ${cell.name}.`);
          state.pendingPurchase = undefined;
          state.turnPhase = 'idle';
          state.log = clampLog(state.log);
        }),

      declinePurchase: () =>
        set((state) => {
          if (!state.pendingPurchase) return;
          const player = state.players[state.currentPlayerIndex];
          state.log.push(`${player.name} отказался от покупки.`);
          state.pendingPurchase = undefined;
          state.turnPhase = 'idle';
          state.log = clampLog(state.log);
        }),

      resolveCard: () =>
        set((state) => {
          const card = state.pendingCard;
          if (!card) return;
          const player = state.players[state.currentPlayerIndex];
          state.pendingCard = undefined;
          state.log.push(`${player.name} разыгрывает карту ${card.title ?? card.id}.`);
          applyEffect(card.effect, state, player, `Карта «${card.title ?? card.id}»`);
          const nextPhase = state.pendingCard
            ? 'card'
            : state.pendingPurchase
              ? 'purchase'
              : 'idle';
          state.turnPhase = nextPhase;
          state.log = clampLog(state.log);
        }),

      endTurn: () =>
        set((state) => {
          if (!state.isGameStarted || state.turnPhase === 'card' || state.players.length === 0) return;

          if (state.currentPlayerIndex >= state.players.length) {
            state.currentPlayerIndex = 0;
          }

          const player = state.players[state.currentPlayerIndex];
          if (player.jailTurns > 0) {
            player.jailTurns -= 1;
            if (player.jailTurns === 0) {
              player.inJail = false;
            }
          }
          state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
          const nextPlayer = state.players[state.currentPlayerIndex];
          state.turnPhase = 'idle';
          state.pendingPurchase = undefined;
          state.log.push(`Ход переходит к игроку ${nextPlayer.name}.`);
          state.log = clampLog(state.log);
        }),

      resetGame: () =>
        set((state) => {
          state.players = [];
          state.nextMicroEventIndex = 0;
          state.currentPlayerIndex = 0;
          state.turnPhase = 'setup';
          state.isGameStarted = false;
          state.log.push('Партия сброшена.');
          state.pendingPurchase = undefined;
          state.pendingCard = undefined;
          state.activeCell = undefined;
          state.dice = [0, 0];
          state.log = clampLog(state.log);
        })
    })),
    {
      name: 'russian-monopoly-state',
      partialize: (state) => ({
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        turnPhase: state.turnPhase,
        log: state.log,
        isGameStarted: state.isGameStarted,
        selectedPreset: state.selectedPreset,
        selectedLocale: state.selectedLocale,
        gameConfig: state.gameConfig
      })
    }
  )
);
