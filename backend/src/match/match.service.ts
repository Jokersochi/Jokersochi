import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GameConfig } from '../config/game.config';
import { BOARD_TRACK, BOARD_LENGTH, BoardCell } from '../data/board';
import { EconomyService, RentCalculationResult } from '../economy/economy.service';
import { AuctionService, AuctionState } from '../auction/auction.service';
import { DealsService, ContractProposal } from '../deals/deals.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { LobbyState } from '../lobby/lobby.types';

interface MatchPlayerState {
  id: string;
  externalPlayerId: string;
  displayName: string;
  seat: number;
  cash: number;
  position: number;
  driveCounter: number;
  reputation: number;
  trust: number;
  ownedBrands: string[];
  isBot: boolean;
}

type MatchMode = 'CLASSIC' | 'ADVANCED' | 'BLITZ';

interface MatchState {
  id: string;
  mode: MatchMode;
  round: number;
  activeTurn: number;
  turnOrder: string[];
  players: Record<string, MatchPlayerState>;
  brandOwnership: Record<string, string>;
  auctions: Record<string, AuctionState>;
  boardLength: number;
  lastDice?: [number, number];
}

export interface TurnOutcome {
  playerId: string;
  newPosition: number;
  cell: BoardCell;
  cashDelta: number;
  rent?: RentCalculationResult;
  auctionId?: string;
  eventSummary?: string;
}

export interface MatchSnapshot {
  id: string;
  mode: MatchMode;
  round: number;
  activeTurn: string;
  players: MatchPlayerState[];
  brandOwnership: Record<string, string>;
  auctions: Record<string, AuctionState>;
  boardLength: number;
  lastDice?: [number, number];
}

@Injectable()
export class MatchService {
  private readonly config: GameConfig;
  private readonly matches = new Map<string, MatchState>();

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
    private readonly economy: EconomyService,
    private readonly auctionService: AuctionService,
    private readonly dealsService: DealsService,
    private readonly antiCheat: AntiCheatService,
    private readonly telemetry: TelemetryService,
  ) {
    this.config = configService.get<GameConfig>('game')!;
  }

  async createFromLobby(lobby: LobbyState): Promise<MatchSnapshot> {
    const mode: MatchMode = lobby.settings.fastMode ? 'BLITZ' : 'ADVANCED';
    const startingCapital = lobby.settings.fastMode
      ? this.config.economy.blitzCapital
      : this.config.economy.baseCapital;

    const matchRecord = await this.prisma.match.create({
      data: {
        mode,
        status: 'ACTIVE',
        config: lobby.settings as unknown,
        state: {},
        players: {
          create: lobby.players.map((player, index) => ({
            displayName: player.displayName,
            seat: index,
            cash: startingCapital,
            trust: player.trust,
            reputation: 1,
            isBot: false,
            meta: { externalPlayerId: player.playerId },
          })),
        },
      },
      include: { players: true },
    });

    const matchState: MatchState = {
      id: matchRecord.id,
      mode,
      round: 1,
      activeTurn: 0,
      turnOrder: (matchRecord as any).players.map((p: any) => p.id),
      players: {},
      brandOwnership: {},
      auctions: {},
      boardLength: lobby.settings.fastMode ? this.config.board.fastModeLength : this.config.board.length,
    };

    ((matchRecord as any).players as any[]).forEach((playerRecord: any) => {
      const meta = (playerRecord.meta ?? {}) as Record<string, unknown>;
      const externalId = (meta['externalPlayerId'] as string) ?? playerRecord.id;
      matchState.players[playerRecord.id] = {
        id: playerRecord.id,
        externalPlayerId: externalId,
        displayName: playerRecord.displayName,
        seat: playerRecord.seat,
        cash: playerRecord.cash,
        position: 0,
        driveCounter: 0,
        reputation: playerRecord.reputation,
        trust: playerRecord.trust,
        ownedBrands: [],
        isBot: playerRecord.isBot,
      };
    });

    this.matches.set(matchState.id, matchState);
    this.telemetry.recordGameEvent('match_created', { matchId: matchState.id, mode });
    await this.persistState(matchState);
    return this.snapshot(matchState.id);
  }

  snapshot(matchId: string): MatchSnapshot {
    const state = this.getMatch(matchId);
    return {
      id: state.id,
      mode: state.mode,
      round: state.round,
      activeTurn: state.turnOrder[state.activeTurn],
      players: Object.values(state.players),
      brandOwnership: state.brandOwnership,
      auctions: state.auctions,
      boardLength: state.boardLength,
      lastDice: state.lastDice,
    };
  }

  async takeTurn(matchId: string, matchPlayerId: string): Promise<{ outcome: TurnOutcome; snapshot: MatchSnapshot }> {
    const state = this.getMatch(matchId);
    const activePlayerId = state.turnOrder[state.activeTurn];
    if (activePlayerId !== matchPlayerId) {
      throw new ForbiddenException('Not your turn');
    }
    const player = state.players[matchPlayerId];
    const dice: [number, number] = [this.rollDie(), this.rollDie()];
    const moveBy = dice[0] + dice[1];
    state.lastDice = dice;

    player.position = (player.position + moveBy) % state.boardLength;
    if (player.position === 0) {
      player.cash += Math.round(this.config.economy.baseCapital * 0.1);
    }

    const cell = this.resolveBoardCell(player.position);
    const outcome = this.resolveCell(state, player, cell);
    outcome.playerId = matchPlayerId;
    outcome.newPosition = player.position;

    this.advanceTurn(state);
    await this.persistState(state);
    this.telemetry.recordGameEvent('turn_completed', {
      matchId,
      playerId: player.externalPlayerId,
      dice,
      cash: player.cash,
    });

    return { outcome, snapshot: this.snapshot(matchId) };
  }

  startAuction(matchId: string, brandSlug: string, isBlitz: boolean): AuctionState {
    const state = this.getMatch(matchId);
    const auction = this.auctionService.startAuction(brandSlug, isBlitz || state.mode === 'BLITZ');
    state.auctions[auction.id] = auction;
    return auction;
  }

  placeBid(matchId: string, auctionId: string, playerId: string, amount: number): AuctionState {
    const state = this.getMatch(matchId);
    const auction = this.auctionService.placeBid(auctionId, playerId, amount);
    state.auctions[auctionId] = auction;
    this.recordAntiCheat(matchId, playerId, 'auction-bid', amount);
    return auction;
  }

  pryOpen(matchId: string, auctionId: string, playerId: string, targetId: string) {
    const bid = this.auctionService.pryOpenBid(auctionId, playerId, targetId);
    this.recordAntiCheat(matchId, playerId, 'auction-pry', bid.revealedAmount ?? bid.sealedAmount);
    return bid;
  }

  finalizeAuction(matchId: string, auctionId: string) {
    const state = this.getMatch(matchId);
    const auction = this.auctionService.finalize(auctionId);
    state.auctions[auctionId] = auction;
    if (auction.winnerId && auction.price) {
      const winner = state.players[auction.winnerId];
      if (winner) {
        winner.cash -= auction.price;
        if (this.config.brands.some((brand) => brand.slug === auction.brandSlug)) {
          winner.ownedBrands.push(auction.brandSlug);
          state.brandOwnership[auction.brandSlug] = winner.id;
        }
        this.telemetry.recordGameEvent('brand_acquired', {
          matchId,
          playerId: winner.externalPlayerId,
          brand: auction.brandSlug,
          price: auction.price,
        });
      }
    }
    return auction;
  }

  async proposeContract(
    matchId: string,
    proposerId: string,
    counterpartyId: string | null,
    proposal: ContractProposal,
  ) {
    const contract = await this.dealsService.proposeContract(matchId, proposerId, counterpartyId, proposal);
    await this.prisma.gameplayEvent.create({
      data: {
        matchId,
        matchPlayerId: proposerId,
        type: 'contract_proposed',
        payload: proposal as unknown as Record<string, unknown>,
      },
    });
    return contract;
  }

  async respondToContract(matchId: string, contractId: string, actorId: string, accept: boolean) {
    const contract = await this.dealsService.respond(contractId, actorId, accept);
    await this.prisma.gameplayEvent.create({
      data: {
        matchId,
        matchPlayerId: actorId,
        type: 'contract_response',
        payload: { contractId, accept } as unknown as Record<string, unknown>,
      },
    });
    return contract;
  }

  getMatch(matchId: string): MatchState {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  private resolveBoardCell(position: number): BoardCell {
    const index = position % BOARD_LENGTH;
    return BOARD_TRACK[index];
  }

  private resolveCell(state: MatchState, player: MatchPlayerState, cell: BoardCell): TurnOutcome {
    let cashDelta = 0;
    let rent: RentCalculationResult | undefined;
    let auctionId: string | undefined;
    let eventSummary: string | undefined;

    switch (cell.type) {
      case 'brand': {
        const ownerId = state.brandOwnership[cell.brandSlug!];
        if (!ownerId) {
          const auction = this.startAuction(state.id, cell.brandSlug!, state.mode === 'BLITZ');
          auctionId = auction.id;
          eventSummary = 'auction-started';
        } else if (ownerId !== player.id) {
          const owner = state.players[ownerId];
          rent = this.economy.calculateRent({
            brandSlug: cell.brandSlug!,
            ownedInSynergy: owner.ownedBrands.filter((brand) => this.economy.getBrand(brand).synergyKey === this.economy.getBrand(cell.brandSlug!).synergyKey).length,
            reputation: owner.reputation,
            driveCounter: owner.driveCounter,
            innovationLevel: 1,
            allianceShare: undefined,
          });
          player.cash -= rent.totalRent;
          owner.cash += rent.totalRent;
          cashDelta -= rent.totalRent;
          this.recordAntiCheat(state.id, player.id, 'rent-paid', rent.totalRent);
        } else {
          player.driveCounter += 1;
          eventSummary = 'owner-bonus';
        }
        break;
      }
      case 'event':
        ({ cashDelta, eventSummary } = this.applyEvent(state, player, cell.action ?? 'event'));
        player.cash += cashDelta;
        break;
      case 'infrastructure':
        player.driveCounter += 1;
        eventSummary = 'infrastructure-boost';
        break;
      case 'special':
        if (cell.action === 'startupGrant') {
          cashDelta = Math.round(this.config.economy.baseCapital * 0.12);
          player.cash += cashDelta;
          eventSummary = 'startup-grant';
        } else if (cell.action === 'stockRoll') {
          const swing = (Math.random() - 0.5) * 0.1;
          const delta = Math.round(player.cash * swing);
          player.cash += delta;
          cashDelta = delta;
          eventSummary = 'stock-variance';
        } else if (cell.action === 'globalShowcase') {
          player.reputation = Math.min(player.reputation + 0.05, this.config.economy.reputationBounds.max);
          eventSummary = 'reputation-boost';
        } else if (cell.action === 'complianceCheck') {
          player.reputation = Math.max(player.reputation - 0.1, this.config.economy.reputationBounds.min);
          eventSummary = 'compliance-penalty';
        }
        break;
      case 'contract':
        eventSummary = 'contract-window';
        break;
      case 'auction':
        auctionId = this.startAuction(state.id, cell.brandSlug ?? 'special-bundle', cell.action === 'startBlitzAuction').id;
        eventSummary = 'auction-trigger';
        break;
      default:
        break;
    }

    return {
      playerId: player.id,
      newPosition: player.position,
      cell,
      cashDelta,
      rent,
      auctionId,
      eventSummary,
    };
  }

  private applyEvent(state: MatchState, player: MatchPlayerState, action: string) {
    switch (action) {
      case 'prBoost':
        player.reputation = Math.min(player.reputation + 0.1, this.config.economy.reputationBounds.max);
        return { cashDelta: 0, eventSummary: 'pr-boost' };
      case 'regulationCheck':
        player.reputation = Math.max(player.reputation - 0.05, this.config.economy.reputationBounds.min);
        return { cashDelta: 0, eventSummary: 'regulation-check' };
      case 'drawInnovation':
        player.driveCounter += 2;
        return { cashDelta: 0, eventSummary: 'innovation-card' };
      case 'insiderCrackdown':
        player.cash -= 15000;
        return { cashDelta: -15000, eventSummary: 'insider-crackdown' };
      case 'reputationAudit':
        player.reputation = Math.max(player.reputation - 0.1, this.config.economy.reputationBounds.min);
        return { cashDelta: 0, eventSummary: 'reputation-audit' };
      case 'fairPlayBoost':
        const boostMultiplier = this.economy.getFairPlayBoost(2);
        const boost = Math.round(this.config.economy.baseCapital * (boostMultiplier - 1));
        return { cashDelta: boost, eventSummary: 'fairplay' };
      case 'driveSurge':
        player.driveCounter += 3;
        return { cashDelta: 0, eventSummary: 'drive-surge' };
      default:
        return { cashDelta: 0, eventSummary: action };
    }
  }

  private advanceTurn(state: MatchState): void {
    state.activeTurn = (state.activeTurn + 1) % state.turnOrder.length;
    if (state.activeTurn === 0) {
      state.round += 1;
    }
  }

  private rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  private recordAntiCheat(matchId: string, matchPlayerId: string, action: string, value?: number): void {
    const state = this.getMatch(matchId);
    const player = state.players[matchPlayerId];
    const verdict = this.antiCheat.evaluate({
      playerId: player.externalPlayerId,
      matchId,
      action,
      latencyMs: 100,
      value,
      timestamp: Date.now(),
    });
    if (verdict.flagged) {
      this.telemetry.recordGameEvent('anti_cheat_trigger', {
        matchId,
        playerId: player.externalPlayerId,
        risk: verdict.riskScore,
        reasons: verdict.reasons,
      });
    }
  }

  private async persistState(state: MatchState): Promise<void> {
    await this.prisma.match.update({
      where: { id: state.id },
      data: {
        state: state as unknown as Record<string, unknown>,
      },
    });
  }
}
