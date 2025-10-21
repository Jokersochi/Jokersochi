export type LobbyMode = 'casual' | 'ranked' | 'blitz';

export interface LobbySettings {
  mode: LobbyMode;
  maxPlayers: number;
  allowSpectators: boolean;
  fastMode: boolean;
}

export interface LobbyPlayerState {
  playerId: string;
  displayName: string;
  ready: boolean;
  elo: number;
  trust: number;
  isHost: boolean;
}

export interface LobbyState {
  id: string;
  hostId: string;
  createdAt: number;
  settings: LobbySettings;
  players: LobbyPlayerState[];
  spectators: LobbyPlayerState[];
}
