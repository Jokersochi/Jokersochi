import { ConfigService } from '@nestjs/config';
import gameConfig from '../src/config/game.config';
import { AuctionService } from '../src/auction/auction.service';

class TelemetryStub {
  recordGameEvent() {}
}

describe('AuctionService', () => {
  const config = new ConfigService({ game: gameConfig() });
  const telemetry = new TelemetryStub();
  const service = new AuctionService(config, telemetry as any);

  it('resolves sealed bids with bluff penalty', () => {
    const auction = service.startAuction('tech-giant-apple');
    service.placeBid(auction.id, 'playerA', 100000);
    service.placeBid(auction.id, 'playerB', 95000);
    const resolved = service.finalize(auction.id);
    expect(resolved.resolved).toBe(true);
    expect(resolved.winnerId).toBe('playerA');
    expect(resolved.price).toBeGreaterThan(95000);
  });

  it('allows pry open premium', () => {
    const auction = service.startAuction('commerce-amazon');
    service.placeBid(auction.id, 'playerA', 50000);
    service.placeBid(auction.id, 'playerB', 48000);
    const pry = service.pryOpenBid(auction.id, 'playerC', 'playerA');
    expect(pry.revealed).toBe(true);
    expect(pry.revealedAmount).toBeGreaterThan(50000);
  });
});
