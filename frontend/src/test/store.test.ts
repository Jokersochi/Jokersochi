import { describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';

describe('useGameStore', () => {
  it('updates match view state', () => {
    const initial = useGameStore.getState();
    expect(initial.view).toBe('lobby');
    useGameStore.getState().setMatch({
      id: 'match-1',
      round: 1,
      activeTurn: 'p1',
      boardLength: 10,
      players: [
        {
          id: 'p1',
          displayName: 'Player One',
          cash: 100,
          driveCounter: 1,
          reputation: 1,
          trust: 50,
          position: 0,
          externalId: 'ext-1',
          isLocal: true,
        },
      ],
      brandOwnership: {},
      auctions: {},
    });
    const next = useGameStore.getState();
    expect(next.view).toBe('game');
    expect(next.match?.players[0].displayName).toBe('Player One');
  });
});
