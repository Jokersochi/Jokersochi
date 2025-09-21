import { ConfigService } from '@nestjs/config';
import gameConfig from '../src/config/game.config';
import { EconomyService } from '../src/economy/economy.service';

class TelemetryStub {
  public events: { event: string; payload: Record<string, unknown> }[] = [];
  recordGameEvent(event: string, payload: Record<string, unknown>) {
    this.events.push({ event, payload });
  }
}

describe('EconomyService', () => {
  const config = new ConfigService({ game: gameConfig() });
  const telemetry = new TelemetryStub();
  const service = new EconomyService(config, telemetry as any);

  it('calculates rent with synergy and reputation', () => {
    const result = service.calculateRent({
      brandSlug: 'tech-giant-apple',
      ownedInSynergy: 2,
      reputation: 1.4,
      driveCounter: 2,
      innovationLevel: 1,
      eventModifiers: [1.1],
    });

    expect(result.totalRent).toBeGreaterThan(30000);
    expect(result.synergyMultiplier).toBeGreaterThan(1);
    expect(result.reputationMultiplier).toBeCloseTo(1.4, 1);
  });

  it('clamps fair play boost', () => {
    expect(service.getFairPlayBoost(0)).toBe(1);
    expect(service.getFairPlayBoost(10)).toBeLessThanOrEqual(1.4);
  });
});
