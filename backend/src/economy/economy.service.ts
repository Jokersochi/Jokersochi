import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameConfig } from '../config/game.config';
import { TelemetryService } from '../telemetry/telemetry.service';

export interface RentCalculationInput {
  brandSlug: string;
  ownedInSynergy: number;
  reputation: number;
  driveCounter: number;
  innovationLevel: number;
  eventModifiers?: number[];
  allianceShare?: number;
}

export interface RentCalculationResult {
  totalRent: number;
  baseRent: number;
  synergyMultiplier: number;
  reputationMultiplier: number;
  driveBonus: number;
  innovationBonus: number;
  eventMultiplier: number;
  allianceShare?: number;
}

@Injectable()
export class EconomyService {
  private readonly config: GameConfig;

  constructor(
    configService: ConfigService,
    private readonly telemetry: TelemetryService,
  ) {
    this.config = configService.get<GameConfig>('game')!;
  }

  getBrand(slug: string) {
    const brand = this.config.brands.find((b) => b.slug === slug);
    if (!brand) {
      throw new Error(`Unknown brand ${slug}`);
    }
    return brand;
  }

  calculateRent(input: RentCalculationInput): RentCalculationResult {
    const brand = this.getBrand(input.brandSlug);
    const synergy = this.getSynergyMultiplier(brand.synergyKey, input.ownedInSynergy);
    const reputationMultiplier = this.clamp(
      input.reputation,
      this.config.economy.reputationBounds.min,
      this.config.economy.reputationBounds.max,
    );
    const driveBonus = 1 + input.driveCounter * this.config.economy.driveBonusPerAction;
    const innovationBonus = 1 + input.innovationLevel * 0.1;
    const eventMultiplier = (input.eventModifiers ?? [1]).reduce((acc, value) => acc * value, 1);

    let rent =
      brand.baseRent *
      brand.marketPower *
      synergy *
      reputationMultiplier *
      driveBonus *
      innovationBonus *
      eventMultiplier;

    let allianceShare = input.allianceShare;
    if (allianceShare && allianceShare > 0 && allianceShare < 1) {
      rent = rent * allianceShare;
    } else {
      allianceShare = undefined;
    }

    const roundedRent = Math.round(rent);

    this.telemetry.recordGameEvent(
      'rent_calculated',
      {
        brand: brand.slug,
        rent: roundedRent,
        synergy,
        reputationMultiplier,
        driveBonus,
        innovationBonus,
        eventMultiplier,
        allianceShare,
      },
    );

    return {
      totalRent: roundedRent,
      baseRent: brand.baseRent,
      synergyMultiplier: Number(synergy.toFixed(2)),
      reputationMultiplier: Number(reputationMultiplier.toFixed(2)),
      driveBonus: Number(driveBonus.toFixed(2)),
      innovationBonus: Number(innovationBonus.toFixed(2)),
      eventMultiplier: Number(eventMultiplier.toFixed(2)),
      allianceShare,
    };
  }

  getFairPlayBoost(positionDelta: number): number {
    if (positionDelta <= 0) {
      return 1;
    }
    return 1 + Math.min(positionDelta * this.config.economy.fairPlayBoost, 0.4);
  }

  private getSynergyMultiplier(key: string, owned: number): number {
    const synergy = this.config.industries[key];
    if (!synergy) {
      return 1;
    }
    const cappedOwned = Math.min(Math.max(owned, 0), 4);
    const multiplier = 1 + synergy.synergyBonus * (cappedOwned / 2);
    return multiplier;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
