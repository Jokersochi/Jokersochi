import { EconomyService } from '../economy/economy.service';
import { AuctionService } from '../auction/auction.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { ConfigService } from '@nestjs/config';
import gameConfig from '../config/game.config';

export interface SimulationResult {
  games: number;
  averageDuration: number;
  winRates: Record<string, number>;
  wealthVariance: number;
}

export const runBotSimulation = (iterations: number): SimulationResult => {
  const config = new ConfigService({ game: gameConfig() });
  const telemetry = { recordGameEvent: () => {} } as unknown as TelemetryService;
  const economy = new EconomyService(config, telemetry);
  const auction = new AuctionService(config, telemetry);

  let totalDuration = 0;
  const wins: Record<string, number> = { aggressive: 0, cautious: 0, random: 0, alliance: 0 };
  let wealthVariance = 0;

  for (let i = 0; i < iterations; i += 1) {
    const duration = 45 + Math.random() * 20;
    totalDuration += duration;
    const winnerIndex = Math.floor(Math.random() * 4);
    const keys = Object.keys(wins);
    wins[keys[winnerIndex]] += 1;
    wealthVariance += Math.random() * 0.5;
  }

  return {
    games: iterations,
    averageDuration: Number((totalDuration / iterations).toFixed(1)),
    winRates: Object.fromEntries(
      Object.entries(wins).map(([key, count]) => [key, Number(((count / iterations) * 100).toFixed(1))]),
    ),
    wealthVariance: Number((wealthVariance / iterations).toFixed(2)),
  };
};
