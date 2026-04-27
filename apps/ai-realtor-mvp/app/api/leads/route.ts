import { failure, getRequestId, success } from "../../../lib/api/response";
import { listLeads } from "../../../lib/services/lead-service";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const data = await listLeads();
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "LEADS_LIST_FAILED", (error as Error).message, 500);
  }
}
