import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyGateway } from './lobby.gateway';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { MatchModule } from '../match/match.module';

@Module({
  imports: [TelemetryModule, MatchModule],
  providers: [LobbyService, LobbyGateway],
  exports: [LobbyService],
})
export class LobbyModule {}
