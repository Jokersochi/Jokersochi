import { failure, getRequestId, success } from "../../../../lib/api/response";
import { generateSellerReply } from "../../../../lib/ai/classifier";
import { log } from "../../../../lib/observability/logger";
import { validatePriceOffer } from "../../../../shared/validators";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    validatePriceOffer(body.proposed_price ?? 9000000, body.price_floor ?? 8500000);

    const reply = generateSellerReply({
      message: body.message ?? "",
      hasPhone: Boolean(body.has_phone),
      priceFloor: Number(body.price_floor ?? 8500000),
      passport: body.passport_json ?? {
        rooms: null,
        area: null,
        floor: null,
        renovation: null,
        documents: "уточнить у владельца",
        description: "Пилотный объект для AI Realtor MVP"
      }
    });

    log("info", "ai.reply.generated", { request_id: requestId });
    return success(requestId, { reply });
  } catch (error) {
    log("error", "ai.reply.failed", { request_id: requestId, error: (error as Error).message });
    return failure(requestId, "AI_REPLY_FAILED", (error as Error).message, 400);
  }
}
