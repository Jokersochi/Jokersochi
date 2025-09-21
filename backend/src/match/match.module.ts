import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchGateway } from './match.gateway';
import { EconomyModule } from '../economy/economy.module';
import { AuctionModule } from '../auction/auction.module';
import { DealsModule } from '../deals/deals.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [EconomyModule, AuctionModule, DealsModule, AntiCheatModule, TelemetryModule],
  providers: [MatchService, MatchGateway],
  exports: [MatchService],
})
export class MatchModule {}
