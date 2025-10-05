import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { BoardCell, GamePreset } from '../config/types';

const preset: GamePreset = {
  name: 'Тестовый',
  description: 'Тестовая экономика',
  salary: 200,
  taxRate: 0.1,
  luxuryTax: 75,
  jailFine: 50,
  bailout: 150
};

const baseBoard: BoardCell[] = [
  { id: 'start', name: 'Старт', type: 'start' },
  { id: 'rest', name: 'Стоянка', type: 'parking' },
  { id: 'tax', name: 'Налог', type: 'tax', tax: 50 },
  { id: 'city', name: 'Город', type: 'property', price: 120, rent: 20 }
];

beforeEach(() => {
  useGameStore.setState((state) => {
    state.board = baseBoard;
    state.chanceDeck = [];
    state.trialDeck = [];
    state.microEvents = [];
    state.contracts = [];
    state.presets = { test: preset };
    state.locales = {};
    state.players = [
      {
        id: 'player-1',
        name: 'Игрок 1',
        token: 'balalaika',
        position: 0,
        balance: 500,
        inJail: false,
        jailTurns: 0,
        freeJailCards: 0,
        properties: [],
        contracts: []
      }
    ];
    state.currentPlayerIndex = 0;
    state.dice = [0, 0];
    state.turnPhase = 'idle';
    state.log = [];
    state.isGameStarted = true;
    state.selectedPreset = 'test';
    state.selectedLocale = 'ru';
    state.pendingPurchase = undefined;
    state.pendingCard = undefined;
    state.activeCell = undefined;
    state.warnings = [];
    state.gameConfig = preset;
    state.nextMicroEventIndex = 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.setState({ pendingPurchase: undefined, pendingCard: undefined, log: [], turnPhase: 'idle' });
});

describe('gameStore mechanics', () => {
  it('subtracts tax when landing on tax cell', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
    useGameStore.getState().rollDice();

    const state = useGameStore.getState();
    expect(state.players[0].balance).toBe(450);
    expect(state.players[0].position).toBe(2);
    expect(state.turnPhase).toBe('idle');
  });

  it('allows purchasing unowned property', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.2);
    useGameStore.getState().rollDice();

    const pending = useGameStore.getState().pendingPurchase;
    expect(pending).toBeDefined();
    expect(pending?.cellId).toBe('city');

    useGameStore.getState().purchaseProperty();

    const state = useGameStore.getState();
    expect(state.players[0].balance).toBe(380);
    expect(state.players[0].properties).toContain('city');
    expect(state.turnPhase).toBe('idle');
  });

  it('moves player to target cell when resolving moveTo card', () => {
    useGameStore.setState((state) => {
      state.board = [
        { id: 'start', name: 'Старт', type: 'start' },
        { id: 'alpha', name: 'Альфа', type: 'property', price: 150, rent: { multiplier: 0.5 } },
        { id: 'trial', name: 'Испытание', type: 'trial' },
        { id: 'beta', name: 'Бета', type: 'property', price: 200, rent: { multiplier: 0.5 } }
      ];
      state.players[0].position = 0;
      state.players[0].properties = [];
      state.pendingCard = {
        id: 'move-card',
        type: 'move',
        title: 'Перейдите на Бета',
        text: 'Переместитесь на клетку Бета.',
        effect: { moveTo: 3 }
      };
      state.turnPhase = 'card';
      state.pendingPurchase = undefined;
    });

    useGameStore.getState().resolveCard();

    const state = useGameStore.getState();
    expect(state.players[0].position).toBe(3);
    expect(state.pendingPurchase?.cellId).toBe('beta');
    expect(state.turnPhase).toBe('purchase');
  });
});
