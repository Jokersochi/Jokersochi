import { failure, getRequestId, success } from "../../../../lib/api/response";
import { sendTelegramMessage } from "../../../../lib/adapters/telegram-adapter";
import { log } from "../../../../lib/observability/logger";
import { getIdempotentResponse, saveIdempotentResponse } from "../../../../lib/services/idempotency-service";
import { upsertInboundLead } from "../../../../lib/services/lead-service";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const idempotencyKey = request.headers.get("x-idempotency-key");

  try {
    if (idempotencyKey) {
      const cached = await getIdempotentResponse("leads.inbound", idempotencyKey);
      if (cached) {
        log("info", "leads.inbound.idempotency_hit", { request_id: requestId, idempotency_key: idempotencyKey });
        return success(requestId, cached);
      }
    }

    const body = await request.json();
    const data = await upsertInboundLead(body);

    let escalation = null;
    if (data.classification.should_escalate_to_owner) {
      escalation = await sendTelegramMessage(
        `HOT lead: ${data.lead.id} | ${data.classification.temperature} | ${data.classification.status}`
      );
    }

    const responsePayload = { ...data, escalation };

    if (idempotencyKey) {
      await saveIdempotentResponse("leads.inbound", idempotencyKey, responsePayload as Record<string, unknown>);
    }

    log("info", "leads.inbound.processed", {
      request_id: requestId,
      lead_id: data.lead.id,
      escalated: Boolean(escalation)
    });

    return success(requestId, responsePayload, 201);
  } catch (error) {
    log("error", "leads.inbound.failed", { request_id: requestId, error: (error as Error).message });
    return failure(requestId, "LEAD_INBOUND_FAILED", (error as Error).message, 400);
  }
}
