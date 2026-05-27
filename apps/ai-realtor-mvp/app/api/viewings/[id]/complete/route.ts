import { failure, getRequestId, success } from "../../../../../lib/api/response";
import { completeViewing } from "../../../../../lib/services/viewing-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({ noShow: false }));
    const data = await completeViewing(id, Boolean(body.noShow));
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "VIEWING_COMPLETE_FAILED", (error as Error).message, 400);
  }
}
