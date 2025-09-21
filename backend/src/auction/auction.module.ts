import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuctionService } from './auction.service';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [ConfigModule, TelemetryModule],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
