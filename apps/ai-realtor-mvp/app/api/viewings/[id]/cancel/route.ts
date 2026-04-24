import { failure, getRequestId, success } from "../../../../../lib/api/response";
import { cancelViewing } from "../../../../../lib/services/viewing-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    const data = await cancelViewing(id);
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "VIEWING_CANCEL_FAILED", (error as Error).message, 400);
  }
}
