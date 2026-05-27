import { failure, getRequestId, success } from "../../../lib/api/response";
import { log } from "../../../lib/observability/logger";
import { createViewing, listViewings } from "../../../lib/services/viewing-service";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const data = await listViewings();
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "VIEWINGS_LIST_FAILED", (error as Error).message, 500);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = await request.json();
    const data = await createViewing(body);
    log("info", "viewing.created", { request_id: requestId, viewing_id: data.id });
    return success(requestId, data, 201);
  } catch (error) {
    log("error", "viewing.create.failed", { request_id: requestId, error: (error as Error).message });
    return failure(requestId, "VIEWING_CREATE_FAILED", (error as Error).message, 400);
  }
}
