import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { LobbyMode, LobbyPlayerState, LobbySettings, LobbyState } from './lobby.types';
import { TelemetryService } from '../telemetry/telemetry.service';

interface UpsertPlayerInput {
  playerId: string;
  displayName: string;
  elo: number;
  trust: number;
  isHost?: boolean;
}

@Injectable()
export class LobbyService {
  private readonly lobbies = new Map<string, LobbyState>();

  constructor(private readonly telemetry: TelemetryService) {}

  createLobby(host: UpsertPlayerInput, settings?: Partial<LobbySettings>): LobbyState {
    const lobbyId = uuid();
    const now = Date.now();
    const defaultSettings: LobbySettings = {
      mode: 'casual',
      maxPlayers: 6,
      allowSpectators: true,
      fastMode: false,
    };

    const lobby: LobbyState = {
      id: lobbyId,
      hostId: host.playerId,
      createdAt: now,
      settings: { ...defaultSettings, ...settings },
      players: [this.createPlayerState(host, true)],
      spectators: [],
    };

    this.lobbies.set(lobbyId, lobby);
    this.telemetry.recordGameEvent('lobby_created', { lobbyId, mode: lobby.settings.mode });
    return lobby;
  }

  listLobbies(): LobbyState[] {
    return [...this.lobbies.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  getLobby(lobbyId: string): LobbyState {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new NotFoundException('Lobby not found');
    }
    return lobby;
  }

  joinLobby(lobbyId: string, player: UpsertPlayerInput, asSpectator = false): LobbyState {
    const lobby = this.getLobby(lobbyId);

    const targetArray = asSpectator ? lobby.spectators : lobby.players;
    const alreadyJoined = targetArray.find((p) => p.playerId === player.playerId);
    if (alreadyJoined) {
      return lobby;
    }

    if (!asSpectator && lobby.players.length >= lobby.settings.maxPlayers) {
      throw new ForbiddenException('Lobby is full');
    }

    targetArray.push(this.createPlayerState(player, false));
    this.telemetry.recordGameEvent('lobby_joined', {
      lobbyId,
      playerId: player.playerId,
      spectator: asSpectator,
    });
    return lobby;
  }

  leaveLobby(lobbyId: string, playerId: string): LobbyState | undefined {
    const lobby = this.getLobby(lobbyId);
    lobby.players = lobby.players.filter((p) => p.playerId !== playerId);
    lobby.spectators = lobby.spectators.filter((p) => p.playerId !== playerId);

    if (lobby.players.length === 0) {
      this.lobbies.delete(lobbyId);
      this.telemetry.recordGameEvent('lobby_closed', { lobbyId });
      return undefined;
    }

    if (lobby.hostId === playerId) {
      const newHost = lobby.players[0];
      newHost.isHost = true;
      lobby.hostId = newHost.playerId;
    }

    this.telemetry.recordGameEvent('lobby_left', { lobbyId, playerId });
    return lobby;
  }

  toggleReady(lobbyId: string, playerId: string, ready: boolean): LobbyState {
    const lobby = this.getLobby(lobbyId);
    lobby.players = lobby.players.map((p) =>
      p.playerId === playerId
        ? {
            ...p,
            ready,
          }
        : p,
    );
    return lobby;
  }

  updateSettings(lobbyId: string, actorId: string, settings: Partial<LobbySettings>): LobbyState {
    const lobby = this.getLobby(lobbyId);
    if (lobby.hostId !== actorId) {
      throw new ForbiddenException('Only the host can update settings');
    }
    lobby.settings = { ...lobby.settings, ...settings };
    this.telemetry.recordGameEvent('lobby_updated', { lobbyId, settings });
    return lobby;
  }

  isReadyToStart(lobbyId: string): boolean {
    const lobby = this.getLobby(lobbyId);
    return lobby.players.length >= 2 && lobby.players.every((player) => player.ready);
  }

  removeLobby(lobbyId: string): void {
    this.lobbies.delete(lobbyId);
    this.telemetry.recordGameEvent('lobby_closed', { lobbyId });
  }

  private createPlayerState(input: UpsertPlayerInput, isHost: boolean): LobbyPlayerState {
    return {
      playerId: input.playerId,
      displayName: input.displayName,
      ready: isHost,
      elo: input.elo,
      trust: input.trust,
      isHost,
    };
  }
}
