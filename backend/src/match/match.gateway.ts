import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ForbiddenException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MatchService, MatchSnapshot } from './match.service';
import { ContractProposal } from '../deals/deals.service';

interface MatchHandshake {
  matchId: string;
  matchPlayerId: string;
  playerId: string;
}

@WebSocketGateway({ namespace: '/match', cors: { origin: '*' } })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly matchService: MatchService) {}

  handleConnection(client: Socket): void {
    const handshake = this.getHandshake(client);
    client.data.handshake = handshake;
    client.join(this.matchRoom(handshake.matchId));
    client.emit('match_state', this.matchService.snapshot(handshake.matchId));
  }

  handleDisconnect(client: Socket): void {
    const handshake = client.data.handshake as MatchHandshake | undefined;
    if (handshake) {
      client.leave(this.matchRoom(handshake.matchId));
    }
  }

  @SubscribeMessage('sync_state')
  handleSync(@ConnectedSocket() client: Socket): MatchSnapshot {
    const handshake = this.getHandshake(client);
    return this.matchService.snapshot(handshake.matchId);
  }

  @SubscribeMessage('take_turn')
  async handleTakeTurn(@ConnectedSocket() client: Socket) {
    const handshake = this.getHandshake(client);
    const result = await this.matchService.takeTurn(handshake.matchId, handshake.matchPlayerId);
    this.server.to(this.matchRoom(handshake.matchId)).emit('turn_result', result.outcome);
    this.server
      .to(this.matchRoom(handshake.matchId))
      .emit('match_state', result.snapshot);
    return result.outcome;
  }

  @SubscribeMessage('auction_bid')
  handleBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { auctionId: string; amount: number },
  ) {
    const handshake = this.getHandshake(client);
    const auction = this.matchService.placeBid(handshake.matchId, payload.auctionId, handshake.matchPlayerId, payload.amount);
    this.server.to(this.matchRoom(handshake.matchId)).emit('auction_update', auction);
    return auction;
  }

  @SubscribeMessage('auction_pry')
  handlePry(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { auctionId: string; targetId: string },
  ) {
    const handshake = this.getHandshake(client);
    const bid = this.matchService.pryOpen(handshake.matchId, payload.auctionId, handshake.matchPlayerId, payload.targetId);
    this.server.to(this.matchRoom(handshake.matchId)).emit('auction_pry_result', bid);
    return bid;
  }

  @SubscribeMessage('auction_finalize')
  handleFinalize(@ConnectedSocket() client: Socket, @MessageBody() payload: { auctionId: string }) {
    const handshake = this.getHandshake(client);
    const auction = this.matchService.finalizeAuction(handshake.matchId, payload.auctionId);
    this.server.to(this.matchRoom(handshake.matchId)).emit('auction_update', auction);
    this.server.to(this.matchRoom(handshake.matchId)).emit('match_state', this.matchService.snapshot(handshake.matchId));
    return auction;
  }

  @SubscribeMessage('contract_offer')
  async handleContractOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { counterpartyId: string | null; proposal: ContractProposal },
  ) {
    const handshake = this.getHandshake(client);
    const contract = await this.matchService.proposeContract(
      handshake.matchId,
      handshake.matchPlayerId,
      payload.counterpartyId,
      payload.proposal,
    );
    this.server.to(this.matchRoom(handshake.matchId)).emit('contract_created', contract);
    return contract;
  }

  @SubscribeMessage('contract_response')
  async handleContractResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { contractId: string; accept: boolean },
  ) {
    const handshake = this.getHandshake(client);
    const contract = await this.matchService.respondToContract(
      handshake.matchId,
      payload.contractId,
      handshake.matchPlayerId,
      payload.accept,
    );
    this.server.to(this.matchRoom(handshake.matchId)).emit('contract_updated', contract);
    return contract;
  }

  private getHandshake(client: Socket): MatchHandshake {
    const handshake = client.data.handshake as MatchHandshake | undefined;
    if (handshake) {
      return handshake;
    }
    const auth = client.handshake.auth as Partial<MatchHandshake>;
    if (!auth?.matchId || !auth.matchPlayerId || !auth.playerId) {
      throw new ForbiddenException('Invalid handshake payload');
    }
    const derived: MatchHandshake = {
      matchId: auth.matchId,
      matchPlayerId: auth.matchPlayerId,
      playerId: auth.playerId,
    };
    client.data.handshake = derived;
    return derived;
  }

  private matchRoom(matchId: string): string {
    return `match:${matchId}`;
  }
}
