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
  useGameStore.setState({
    board: baseBoard,
    chanceDeck: [],
    trialDeck: [],
    microEvents: [],
    contracts: [],
    presets: { test: preset },
    locales: {},
    players: [
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
    ],
    currentPlayerIndex: 0,
    dice: [0, 0],
    turnPhase: 'idle',
    log: [],
    isGameStarted: true,
    selectedPreset: 'test',
    selectedLocale: 'ru',
    pendingPurchase: undefined,
    pendingCard: undefined,
    warnings: [],
    gameConfig: preset
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
});
