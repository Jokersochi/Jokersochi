import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EconomyService } from './economy.service';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [ConfigModule, TelemetryModule],
  providers: [EconomyService],
  exports: [EconomyService],
})
export class EconomyModule {}
