import { Module } from '@nestjs/common';
import { AntiCheatService } from './anti-cheat.service';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [TelemetryModule],
  providers: [AntiCheatService],
  exports: [AntiCheatService],
})
export class AntiCheatModule {}
