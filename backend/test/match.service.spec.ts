import { ConfigService } from '@nestjs/config';
import gameConfig from '../src/config/game.config';
import { MatchService } from '../src/match/match.service';
import { EconomyService } from '../src/economy/economy.service';
import { AuctionService } from '../src/auction/auction.service';
import { DealsService } from '../src/deals/deals.service';
import { AntiCheatService } from '../src/anti-cheat/anti-cheat.service';

class TelemetryStub {
  recordGameEvent() {}
}

class PrismaStub {
  public match = {
    create: jest.fn(),
    update: jest.fn(),
  };
  public gameplayEvent = {
    create: jest.fn(),
  };
}

describe('MatchService', () => {
  const config = new ConfigService({ game: gameConfig() });
  const telemetry = new TelemetryStub();
  const economy = new EconomyService(config, telemetry as any);
  const auction = new AuctionService(config, telemetry as any);
  const prisma = new PrismaStub();
  const deals = {
    proposeContract: jest.fn(),
    respond: jest.fn(),
  } as unknown as DealsService;
  const antiCheat = {
    evaluate: jest.fn().mockReturnValue({ flagged: false, riskScore: 0, reasons: [] }),
  } as unknown as AntiCheatService;

  const service = new MatchService(
    prisma as any,
    config,
    economy,
    auction,
    deals,
    antiCheat,
    telemetry as any,
  );

  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // always roll ones
    prisma.match.create.mockResolvedValue({
      id: 'match-1',
      mode: 'ADVANCED',
      players: [
        {
          id: 'mp1',
          displayName: 'Player One',
          seat: 0,
          cash: 1_000_000,
          trust: 50,
          reputation: 1,
          isBot: false,
          meta: { externalPlayerId: 'player-1' },
        },
        {
          id: 'mp2',
          displayName: 'Player Two',
          seat: 1,
          cash: 1_000_000,
          trust: 50,
          reputation: 1,
          isBot: false,
          meta: { externalPlayerId: 'player-2' },
        },
      ],
    });
    prisma.match.update.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates match snapshot from lobby and handles turn', async () => {
    const snapshot = await service.createFromLobby({
      id: 'lobby-1',
      hostId: 'player-1',
      createdAt: Date.now(),
      settings: { mode: 'casual', maxPlayers: 4, allowSpectators: true, fastMode: false },
      players: [
        { playerId: 'player-1', displayName: 'Player One', ready: true, elo: 1200, trust: 50, isHost: true },
        { playerId: 'player-2', displayName: 'Player Two', ready: true, elo: 1200, trust: 50, isHost: false },
      ],
      spectators: [],
    });

    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.round).toBe(1);

    const turn = await service.takeTurn(snapshot.id, snapshot.activeTurn);
    expect(turn.outcome.cell.id).toBe('event-pr-burst');
    expect(service.snapshot(snapshot.id).round).toBe(1);
  });
});
