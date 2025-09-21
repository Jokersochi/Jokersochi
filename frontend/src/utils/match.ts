import { MatchViewState, PlayerState } from '@/store/useGameStore';

interface RawMatchSnapshot {
  id: string;
  mode: string;
  round: number;
  activeTurn: string;
  players: Array<{
    id: string;
    displayName: string;
    cash: number;
    driveCounter: number;
    reputation: number;
    trust: number;
    position: number;
    externalPlayerId: string;
  }>;
  boardLength: number;
  lastDice?: [number, number];
  brandOwnership: Record<string, string>;
  auctions: Record<string, { id: string; brandSlug: string; isBlitz: boolean; expiresAt: number; price?: number; winnerId?: string }>;
}

export const transformMatchSnapshot = (
  snapshot: RawMatchSnapshot,
  localMatchPlayerId?: string,
): MatchViewState => {
  const players: PlayerState[] = snapshot.players.map((player) => ({
    id: player.id,
    displayName: player.displayName,
    cash: player.cash,
    driveCounter: player.driveCounter,
    reputation: player.reputation,
    trust: player.trust,
    position: player.position,
    externalId: player.externalPlayerId,
    isLocal: localMatchPlayerId === player.id || localMatchPlayerId === player.externalPlayerId,
  }));

  return {
    id: snapshot.id,
    round: snapshot.round,
    activeTurn: snapshot.activeTurn,
    boardLength: snapshot.boardLength,
    players,
    lastDice: snapshot.lastDice,
    brandOwnership: snapshot.brandOwnership,
    auctions: snapshot.auctions,
  };
};
