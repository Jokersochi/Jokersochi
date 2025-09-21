import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';
import { LobbySettings, LobbyState } from './lobby.types';
import { MatchService } from '../match/match.service';
import { TelemetryService } from '../telemetry/telemetry.service';

interface HandshakeData {
  playerId: string;
  displayName: string;
  elo?: number;
  trust?: number;
}

@WebSocketGateway({ namespace: '/lobby', cors: { origin: '*' } })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly matchService: MatchService,
    private readonly telemetry: TelemetryService,
  ) {}

  handleConnection(client: Socket): void {
    const handshake = this.extractHandshake(client);
    client.data.player = handshake;
    this.telemetry.recordGameEvent('lobby_connection', { playerId: handshake.playerId });
  }

  handleDisconnect(client: Socket): void {
    const { lobbyId } = client.data;
    const player = client.data.player as HandshakeData | undefined;
    if (lobbyId && player) {
      this.lobbyService.leaveLobby(lobbyId, player.playerId);
      this.emitLobby(lobbyId);
    }
  }

  @SubscribeMessage('list_lobbies')
  handleList(@ConnectedSocket() client: Socket): LobbyState[] {
    client.join('browser:lobbies');
    return this.lobbyService.listLobbies();
  }

  @SubscribeMessage('create_lobby')
  handleCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() settings: Partial<LobbySettings>,
  ): LobbyState {
    const player = client.data.player as HandshakeData;
    const lobby = this.lobbyService.createLobby(
      {
        playerId: player.playerId,
        displayName: player.displayName,
        elo: player.elo ?? 1200,
        trust: player.trust ?? 50,
        isHost: true,
      },
      settings,
    );
    client.join(lobby.id);
    client.data.lobbyId = lobby.id;
    this.emitLobby(lobby.id);
    return lobby;
  }

  @SubscribeMessage('join_lobby')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lobbyId: string; spectator?: boolean },
  ): LobbyState {
    const player = client.data.player as HandshakeData;
    const lobby = this.lobbyService.joinLobby(
      payload.lobbyId,
      {
        playerId: player.playerId,
        displayName: player.displayName,
        elo: player.elo ?? 1200,
        trust: player.trust ?? 50,
      },
      payload.spectator,
    );
    client.join(payload.lobbyId);
    client.data.lobbyId = payload.lobbyId;
    this.emitLobby(payload.lobbyId);
    return lobby;
  }

  @SubscribeMessage('leave_lobby')
  handleLeave(@ConnectedSocket() client: Socket): void {
    const { lobbyId } = client.data;
    const player = client.data.player as HandshakeData | undefined;
    if (lobbyId && player) {
      this.lobbyService.leaveLobby(lobbyId, player.playerId);
      client.leave(lobbyId);
      delete client.data.lobbyId;
      this.emitLobby(lobbyId);
    }
  }

  @SubscribeMessage('toggle_ready')
  handleToggleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() ready: boolean,
  ): LobbyState {
    const { lobbyId } = client.data;
    const player = client.data.player as HandshakeData;
    if (!lobbyId) {
      throw new Error('No lobby joined');
    }
    const lobby = this.lobbyService.toggleReady(lobbyId, player.playerId, ready);
    this.emitLobby(lobbyId);
    return lobby;
  }

  @SubscribeMessage('update_settings')
  handleUpdateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() settings: Partial<LobbySettings>,
  ): LobbyState {
    const { lobbyId } = client.data;
    const player = client.data.player as HandshakeData;
    if (!lobbyId) {
      throw new Error('No lobby joined');
    }
    const lobby = this.lobbyService.updateSettings(lobbyId, player.playerId, settings);
    this.emitLobby(lobbyId);
    return lobby;
  }

  @SubscribeMessage('start_match')
  async handleStart(@ConnectedSocket() client: Socket): Promise<void> {
    const { lobbyId } = client.data;
    const player = client.data.player as HandshakeData;
    if (!lobbyId) {
      throw new Error('No lobby joined');
    }
    const lobby = this.lobbyService.getLobby(lobbyId);
    if (lobby.hostId !== player.playerId) {
      throw new Error('Only the host can start the match');
    }
    if (!this.lobbyService.isReadyToStart(lobbyId)) {
      throw new Error('All players must be ready');
    }
    const match = await this.matchService.createFromLobby(lobby);
    this.lobbyService.removeLobby(lobbyId);
    this.server.to(lobbyId).emit('match_started', match);
  }

  private extractHandshake(client: Socket): HandshakeData {
    const auth = client.handshake.auth as Partial<HandshakeData>;
    if (!auth?.playerId || !auth.displayName) {
      throw new Error('Invalid handshake payload');
    }
    return {
      playerId: auth.playerId,
      displayName: auth.displayName,
      elo: auth.elo,
      trust: auth.trust,
    };
  }

  private emitLobby(lobbyId: string): void {
    const lobby = this.lobbyService.getLobby(lobbyId);
    this.server.to(lobbyId).emit('lobby_state', lobby);
    this.server.to('browser:lobbies').emit('lobbies_snapshot', this.lobbyService.listLobbies());
  }
}
