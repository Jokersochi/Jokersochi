import create from 'zustand';

interface GameState {
  players: string[];
  setPlayers: (p: string[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: [],
  setPlayers: (p) => set({ players: p }),
}));
