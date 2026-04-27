import { failure, getRequestId, success } from "../../../../lib/api/response";
import { classifyLeadMessage } from "../../../../lib/ai/classifier";
import { log } from "../../../../lib/observability/logger";
import { classifyResultSchema } from "../../../../shared/validators";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const data = classifyLeadMessage(body.message ?? "", Boolean(body.has_phone));
    const parsed = classifyResultSchema.parse(data);
    return success(requestId, parsed);
  } catch (error) {
    log("error", "ai.classify.failed", { request_id: requestId, error: (error as Error).message });
    return failure(requestId, "AI_CLASSIFY_FAILED", (error as Error).message, 400);
  }
}
