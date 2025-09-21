import { registerAs } from '@nestjs/config';
import { BOARD_LENGTH, BOARD_TRACK } from '../data/board';
import { BRAND_DEFINITIONS, INDUSTRY_SYNERGY } from '../data/brands';

export interface AuctionConfig {
  baseDurationSeconds: number;
  blitzDurationSeconds: number;
  pryOpenPremium: number;
  bluffPenalty: number;
}

export interface EconomyConfig {
  baseCapital: number;
  blitzCapital: number;
  reputationBounds: { min: number; max: number };
  fairPlayBoost: number;
  driveBonusPerAction: number;
}

export interface DealConfig {
  defaultBuybackRounds: number;
  defaultRevenueShare: number;
}

export interface MetaProgressionConfig {
  baseElo: number;
  kFactor: number;
  seasonLengthDays: number;
}

export interface GameConfig {
  board: {
    track: typeof BOARD_TRACK;
    length: number;
    fastModeLength: number;
  };
  brands: typeof BRAND_DEFINITIONS;
  industries: typeof INDUSTRY_SYNERGY;
  auction: AuctionConfig;
  economy: EconomyConfig;
  deals: DealConfig;
  meta: MetaProgressionConfig;
}

export default registerAs('game', (): GameConfig => ({
  board: {
    track: BOARD_TRACK,
    length: BOARD_LENGTH,
    fastModeLength: Math.floor(BOARD_LENGTH * 0.75),
  },
  brands: BRAND_DEFINITIONS,
  industries: INDUSTRY_SYNERGY,
  auction: {
    baseDurationSeconds: 15,
    blitzDurationSeconds: 8,
    pryOpenPremium: 0.1,
    bluffPenalty: 0.05,
  },
  economy: {
    baseCapital: 1_000_000,
    blitzCapital: 500_000,
    reputationBounds: { min: 0.4, max: 1.6 },
    fairPlayBoost: 0.18,
    driveBonusPerAction: 0.05,
  },
  deals: {
    defaultBuybackRounds: 5,
    defaultRevenueShare: 0.2,
  },
  meta: {
    baseElo: 1200,
    kFactor: 32,
    seasonLengthDays: 90,
  },
}));
