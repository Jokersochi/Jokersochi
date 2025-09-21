import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [TelemetryModule, EconomyModule],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
