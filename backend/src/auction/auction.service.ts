import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { GameConfig } from '../config/game.config';
import { TelemetryService } from '../telemetry/telemetry.service';

export interface AuctionParticipantBid {
  playerId: string;
  sealedAmount: number;
  revealedAmount?: number;
  revealed: boolean;
}

export interface AuctionState {
  id: string;
  brandSlug: string;
  isBlitz: boolean;
  startedAt: number;
  expiresAt: number;
  bids: AuctionParticipantBid[];
  resolved: boolean;
  winnerId?: string;
  price?: number;
}

@Injectable()
export class AuctionService {
  private readonly config: GameConfig;
  private readonly auctions = new Map<string, AuctionState>();

  constructor(configService: ConfigService, private readonly telemetry: TelemetryService) {
    this.config = configService.get<GameConfig>('game')!;
  }

  startAuction(brandSlug: string, isBlitz = false): AuctionState {
    const duration = isBlitz
      ? this.config.auction.blitzDurationSeconds
      : this.config.auction.baseDurationSeconds;
    const now = Date.now();
    const auction: AuctionState = {
      id: uuid(),
      brandSlug,
      isBlitz,
      startedAt: now,
      expiresAt: now + duration * 1000,
      bids: [],
      resolved: false,
    };
    this.auctions.set(auction.id, auction);
    this.telemetry.recordGameEvent('auction_started', { auctionId: auction.id, brandSlug, isBlitz });
    return auction;
  }

  placeBid(auctionId: string, playerId: string, sealedAmount: number): AuctionState {
    const auction = this.getAuction(auctionId);
    const existing = auction.bids.find((bid) => bid.playerId === playerId);
    if (existing) {
      existing.sealedAmount = sealedAmount;
      existing.revealed = false;
      existing.revealedAmount = undefined;
    } else {
      auction.bids.push({ playerId, sealedAmount, revealed: false });
    }
    this.telemetry.recordGameEvent('auction_bid', { auctionId, playerId, sealedAmount });
    return auction;
  }

  pryOpenBid(auctionId: string, byPlayer: string, targetPlayer: string): AuctionParticipantBid {
    const auction = this.getAuction(auctionId);
    const bid = auction.bids.find((item) => item.playerId === targetPlayer);
    if (!bid) {
      throw new NotFoundException('Bid not found');
    }
    const premium = 1 + this.config.auction.pryOpenPremium;
    bid.revealedAmount = Math.round(bid.sealedAmount * premium);
    bid.revealed = true;
    this.telemetry.recordGameEvent('auction_pry_open', {
      auctionId,
      byPlayer,
      targetPlayer,
      premium,
    });
    return bid;
  }

  finalize(auctionId: string): AuctionState {
    const auction = this.getAuction(auctionId);
    if (auction.resolved) {
      return auction;
    }

    const effectiveBids = auction.bids.map((bid) => ({
      playerId: bid.playerId,
      amount: bid.revealed ? bid.revealedAmount ?? bid.sealedAmount : bid.sealedAmount,
      revealed: bid.revealed,
    }));

    effectiveBids.sort((a, b) => b.amount - a.amount);
    const winner = effectiveBids[0];
    const runnerUp = effectiveBids[1];

    if (!winner) {
      auction.resolved = true;
      return auction;
    }

    let finalPrice = winner.amount;
    if (runnerUp) {
      finalPrice = Math.ceil(runnerUp.amount * (1 + this.config.auction.bluffPenalty));
    }

    auction.resolved = true;
    auction.winnerId = winner.playerId;
    auction.price = finalPrice;

    this.telemetry.recordGameEvent('auction_resolved', {
      auctionId,
      winner: winner.playerId,
      price: finalPrice,
      brandSlug: auction.brandSlug,
    });

    return auction;
  }

  cleanupExpired(now = Date.now()): void {
    for (const auction of this.auctions.values()) {
      if (!auction.resolved && auction.expiresAt <= now) {
        this.finalize(auction.id);
      }
      if (auction.resolved && auction.expiresAt + 60_000 < now) {
        this.auctions.delete(auction.id);
      }
    }
  }

  private getAuction(auctionId: string): AuctionState {
    const auction = this.auctions.get(auctionId);
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }
    return auction;
  }
}
