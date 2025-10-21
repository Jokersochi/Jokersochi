import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import gameConfig from './config/game.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LobbyModule } from './lobby/lobby.module';
import { MatchModule } from './match/match.module';
import { EconomyModule } from './economy/economy.module';
import { AuctionModule } from './auction/auction.module';
import { DealsModule } from './deals/deals.module';
import { AntiCheatModule } from './anti-cheat/anti-cheat.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [gameConfig],
    }),
    PrismaModule,
    TelemetryModule,
    AuthModule,
    EconomyModule,
    AuctionModule,
    DealsModule,
    AntiCheatModule,
    MatchModule,
    LobbyModule,
  ],
})
export class AppModule {}
