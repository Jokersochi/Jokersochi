import { failure, getRequestId, success } from "../../../../lib/api/response";
import { patchLead } from "../../../../lib/services/lead-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = await patchLead(id, body);
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "LEAD_PATCH_FAILED", (error as Error).message, 400);
  }
}
