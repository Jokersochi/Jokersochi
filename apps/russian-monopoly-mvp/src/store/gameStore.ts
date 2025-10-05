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

export type TurnPhase = 'setup' | 'idle' | 'rolled' | 'purchase' | 'card';

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

const getRentValue = (cell: BoardCell): number => {
  if (typeof cell.rent === 'number') {
    return cell.rent;
  }
  if (cell.rent && typeof cell.rent === 'object') {
    return cell.rent.base;
  }
  return 0;
};

const applyCardEffect = (
  effect: CardEffect,
  state: GameStoreState,
  player: PlayerState,
  board: BoardCell[]
) => {
  if (effect.money) {
    player.balance += effect.money;
    state.log.push(
      `${player.name} ${effect.money > 0 ? 'получил' : 'заплатил'} ${Math.abs(effect.money)}₽ по эффекту карты.`
    );
  }

  if (effect.move) {
    const nextPosition = (player.position + effect.move + board.length) % board.length;
    player.position = nextPosition;
    state.activeCell = board[nextPosition];
    state.log.push(`${player.name} переместился на клетку ${board[nextPosition].name}.`);
  }

  if (effect.goTo) {
    const destinationIndex = board.findIndex((cell) => cell.id === effect.goTo);
    if (destinationIndex >= 0) {
      const passedStart = destinationIndex < player.position;
      player.position = destinationIndex;
      state.activeCell = board[destinationIndex];
      if (passedStart) {
        player.balance += state.gameConfig.salary;
        state.log.push(`${player.name} получил ${state.gameConfig.salary}₽ за проход через старт.`);
      }
      state.log.push(`${player.name} перемещён на клетку ${board[destinationIndex].name}.`);
    }
  }

  if (effect.jail) {
    const jailIndex = board.findIndex((cell) => cell.type === 'jail');
    if (jailIndex >= 0) {
      player.position = jailIndex;
      player.inJail = true;
      player.jailTurns = 2;
      state.activeCell = board[jailIndex];
      state.log.push(`${player.name} отправлен в тюрьму.`);
    }
  }

  if (effect.freeJail) {
    player.freeJailCards += 1;
    state.log.push(`${player.name} получил карту выхода из тюрьмы.`);
  }
};

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

      loadData: ({ data, warnings }) =>
        set((state) => {
          state.board = data.board;
          state.chanceDeck = data.chance;
          state.trialDeck = data.trial;
          state.microEvents = data.microEvents;
          state.contracts = data.contracts;
          state.presets = data.presets;
          state.locales = data.locales;
          state.warnings = warnings;
          const preset = data.presets[state.selectedPreset] ?? Object.values(data.presets)[0];
          state.gameConfig = preset ?? emptyPreset;
        }),

      setPreset: (presetKey) =>
        set((state) => {
          state.selectedPreset = presetKey;
          const preset = state.presets[presetKey];
          if (preset) {
            state.gameConfig = preset;
            state.log.push(`Выбран пресет ${preset.name}.`);
          }
          state.log = clampLog(state.log);
        }),

      setLocale: (locale) =>
        set((state) => {
          state.selectedLocale = locale;
        }),

      setupGame: (playerConfigs, presetKey) =>
        set((state) => {
          const preset = state.presets[presetKey] ?? state.gameConfig;
          state.selectedPreset = presetKey;
          state.gameConfig = preset;
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
          const steps = die1 + die2;
          const board = state.board;
          if (board.length === 0) {
            state.log.push('Поле не загружено.');
            return;
          }
          const startPosition = player.position;
          const newPosition = (startPosition + steps) % board.length;
          const passedStart = startPosition + steps >= board.length;
          player.position = newPosition;
          state.activeCell = board[newPosition];
          state.turnPhase = 'rolled';
          state.log.push(`${player.name} бросил ${die1} и ${die2} и перешёл на ${board[newPosition].name}.`);
          if (passedStart) {
            player.balance += state.gameConfig.salary;
            state.log.push(`${player.name} получил ${state.gameConfig.salary}₽ за проход через старт.`);
          }

          const cell = board[newPosition];
          if (cell.type === 'property' || cell.type === 'railway' || cell.type === 'utility') {
            const owner = state.players.find((candidate) =>
              candidate.properties.includes(cell.id)
            );
            if (!owner) {
              if (cell.price) {
                state.pendingPurchase = { cellId: cell.id, price: cell.price };
                state.turnPhase = 'purchase';
                state.log.push(`${player.name} может купить ${cell.name} за ${cell.price}₽.`);
              }
            } else if (owner.id !== player.id) {
              const rent = getRentValue(cell);
              player.balance -= rent;
              owner.balance += rent;
              state.log.push(`${player.name} заплатил ${rent}₽ игроку ${owner.name}.`);
              state.turnPhase = 'idle';
            }
          } else if (cell.type === 'tax') {
            const tax = cell.tax ?? Math.round(player.balance * state.gameConfig.taxRate);
            player.balance -= tax;
            state.log.push(`${player.name} уплатил налог ${tax}₽.`);
            state.turnPhase = 'idle';
          } else if (cell.type === 'chance' || cell.type === 'trial') {
            const isChance = cell.type === 'chance';
            const deck = isChance ? state.chanceDeck : state.trialDeck;
            if (deck.length > 0) {
              const card = deck.shift()!;
              deck.push(card);
              state.pendingCard = card;
              state.turnPhase = 'card';
              state.log.push(`${player.name} тянет карту ${isChance ? 'Шанс' : 'Испытание'}.`);
            } else {
              state.turnPhase = 'idle';
              state.log.push('Колода пуста.');
            }
          } else if (cell.type === 'gotojail') {
            const jailIndex = board.findIndex((item) => item.type === 'jail');
            if (jailIndex >= 0) {
              player.position = jailIndex;
              player.inJail = true;
              player.jailTurns = 2;
              state.activeCell = board[jailIndex];
              state.log.push(`${player.name} отправлен в тюрьму.`);
            }
            state.turnPhase = 'idle';
          } else {
            state.turnPhase = 'idle';
          }

          state.log = clampLog(state.log);
        }),

      purchaseProperty: () =>
        set((state) => {
          if (!state.pendingPurchase) return;
          const player = state.players[state.currentPlayerIndex];
          const { cellId, price } = state.pendingPurchase;
          if (player.balance < price) {
            state.log.push(`${player.name} не хватает средств на покупку.`);
            state.pendingPurchase = undefined;
            state.turnPhase = 'idle';
            state.log = clampLog(state.log);
            return;
          }
          player.balance -= price;
          player.properties.push(cellId);
          state.log.push(`${player.name} приобрёл ${state.board.find((cell) => cell.id === cellId)?.name ?? 'актив'}.`);
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
          if (!state.pendingCard) return;
          const player = state.players[state.currentPlayerIndex];
          applyCardEffect(state.pendingCard.effect, state, player, state.board);
          state.pendingCard = undefined;
          state.turnPhase = 'idle';
          state.log = clampLog(state.log);
        }),

      endTurn: () =>
        set((state) => {
          if (!state.isGameStarted || state.turnPhase === 'card') return;
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
          state.log.push(`Ход переходит к игроку ${nextPlayer.name}.`);
          state.log = clampLog(state.log);
        }),

      resetGame: () =>
        set((state) => {
          state.players = [];
          state.currentPlayerIndex = 0;
          state.turnPhase = 'setup';
          state.isGameStarted = false;
          state.log.push('Партия сброшена.');
          state.pendingPurchase = undefined;
          state.pendingCard = undefined;
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
