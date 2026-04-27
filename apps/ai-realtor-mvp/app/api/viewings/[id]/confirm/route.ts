import { failure, getRequestId, success } from "../../../../../lib/api/response";
import { confirmViewing } from "../../../../../lib/services/viewing-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    const data = await confirmViewing(id);
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "VIEWING_CONFIRM_FAILED", (error as Error).message, 400);
  }
}
