import { Injectable } from '@nestjs/common';
import { TelemetryService } from '../telemetry/telemetry.service';

export interface PlayerActionRecord {
  playerId: string;
  matchId: string;
  action: string;
  latencyMs: number;
  value?: number;
  timestamp: number;
}

export interface AntiCheatVerdict {
  flagged: boolean;
  riskScore: number;
  reasons: string[];
}

@Injectable()
export class AntiCheatService {
  private readonly recentActions = new Map<string, PlayerActionRecord[]>();

  constructor(private readonly telemetry: TelemetryService) {}

  evaluate(action: PlayerActionRecord): AntiCheatVerdict {
    const history = this.recentActions.get(action.playerId) ?? [];
    history.push(action);
    const cutoff = Date.now() - 60_000;
    const filtered = history.filter((item) => item.timestamp >= cutoff);
    this.recentActions.set(action.playerId, filtered);

    let riskScore = 0;
    const reasons: string[] = [];

    if (action.latencyMs < 80) {
      riskScore += 0.4;
      reasons.push('latency-too-low');
    }

    const auctionSnipes = filtered.filter((item) => item.action === 'auction-win');
    if (auctionSnipes.length >= 3) {
      riskScore += 0.3;
      reasons.push('excessive-auction-snipes');
    }

    const repeatedBids = filtered.filter((item) => item.action === 'auction-bid' && item.value === action.value);
    if (repeatedBids.length >= 5) {
      riskScore += 0.2;
      reasons.push('repeated-identical-bids');
    }

    if (riskScore > 0) {
      this.telemetry.recordGameEvent('anti_cheat_flag', {
        playerId: action.playerId,
        matchId: action.matchId,
        riskScore,
        reasons,
      });
    }

    return {
      flagged: riskScore >= 0.5,
      riskScore: Number(riskScore.toFixed(2)),
      reasons,
    };
  }

  shouldThrottle(playerId: string): boolean {
    const history = this.recentActions.get(playerId) ?? [];
    const now = Date.now();
    const window = history.filter((item) => now - item.timestamp < 10_000);
    return window.length > 20;
  }
}
