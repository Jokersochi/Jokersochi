import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ViewState = 'lobby' | 'game' | 'auction' | 'contracts' | 'tutorial';

export interface LobbySummary {
  id: string;
  mode: string;
  players: number;
  maxPlayers: number;
  fastMode: boolean;
}

export interface PlayerState {
  id: string;
  displayName: string;
  externalId: string;
  cash: number;
  position: number;
  driveCounter: number;
  reputation: number;
  trust: number;
  isLocal: boolean;
}

export interface AuctionStateView {
  id: string;
  brandSlug: string;
  isBlitz: boolean;
  expiresAt: number;
  price?: number;
  winnerId?: string;
}

export interface MatchViewState {
  id: string;
  round: number;
  activeTurn: string;
  boardLength: number;
  players: PlayerState[];
  lastDice?: [number, number];
  brandOwnership: Record<string, string>;
  auctions: Record<string, AuctionStateView>;
}

interface GameStoreState {
  view: ViewState;
  lobbies: LobbySummary[];
  match?: MatchViewState;
  localMatchPlayerId?: string;
  tutorialStep: number;
  setView(view: ViewState): void;
  setLobbies(lobbies: LobbySummary[]): void;
  setMatch(match: MatchViewState): void;
  updateMatch(match: MatchViewState): void;
  advanceTutorial(): void;
}

export const useGameStore = create<GameStoreState>()(
  immer((set) => ({
    view: 'lobby',
    lobbies: [],
    tutorialStep: 0,
    setView: (view) => set((state) => void (state.view = view)),
    setLobbies: (lobbies) => set((state) => void (state.lobbies = lobbies)),
    setMatch: (match) =>
      set((state) => {
        state.match = match;
        state.view = 'game';
        state.localMatchPlayerId = match.players.find((p) => p.isLocal)?.id;
      }),
    updateMatch: (match) =>
      set((state) => {
        state.match = match;
      }),
    advanceTutorial: () =>
      set((state) => {
        state.tutorialStep = (state.tutorialStep + 1) % 3;
      }),
  })),
);
