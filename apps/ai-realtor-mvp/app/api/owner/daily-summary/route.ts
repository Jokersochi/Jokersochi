import { failure, getRequestId, success } from "../../../../lib/api/response";
import { sendTelegramMessage } from "../../../../lib/adapters/telegram-adapter";
import { sendWhatsAppMessage } from "../../../../lib/adapters/whatsapp-adapter";
import { log } from "../../../../lib/observability/logger";
import { ownerSummarySchema } from "../../../../shared/validators";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const payload = ownerSummarySchema.parse(body);
    const text = `Lead ${payload.leadId}\nTemp: ${payload.temperature}\nStatus: ${payload.status}\nUrgency: ${payload.urgency}\n${payload.summary}`;

    const [telegram, whatsapp] = await Promise.all([
      sendTelegramMessage(text),
      sendWhatsAppMessage("owner", text)
    ]);

    log("info", "owner.daily_summary.sent", { request_id: requestId, telegram: telegram.status, whatsapp: whatsapp.status });
    return success(requestId, { payload, delivery: { telegram, whatsapp } });
  } catch (error) {
    log("error", "owner.daily_summary.failed", { request_id: requestId, error: (error as Error).message });
    return failure(requestId, "OWNER_SUMMARY_FAILED", (error as Error).message, 400);
  }
}
