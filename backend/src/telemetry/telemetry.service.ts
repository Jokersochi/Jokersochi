import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { PrismaService } from '../prisma/prisma.service';

export interface TelemetryContext {
  matchId?: string;
  playerId?: string;
}

@Injectable()
export class TelemetryService {
  private readonly tracer = trace.getTracer('brandopoly-telemetry');
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  recordGameEvent(event: string, payload: Record<string, unknown>, context: TelemetryContext = {}): void {
    this.tracer.startActiveSpan(event, (span) => {
      try {
        if (context.matchId) span.setAttribute('match.id', context.matchId);
        if (context.playerId) span.setAttribute('player.id', context.playerId);
        span.setAttribute('payload.keys', Object.keys(payload).join(','));
        void this.persist(event, payload, context);
      } catch (error) {
        this.logger.warn(`Telemetry span error for event ${event}: ${String(error)}`);
      } finally {
        span.end();
      }
    });
  }

  async persist(
    event: string,
    payload: Record<string, unknown>,
    context: TelemetryContext,
  ): Promise<void> {
    try {
      await this.prisma.telemetryEvent.create({
        data: {
          event,
          payload,
          matchId: context.matchId,
          playerId: context.playerId,
        },
      });
    } catch (error) {
      this.logger.debug(`Telemetry persistence skipped: ${String(error)}`);
    }
  }
}
