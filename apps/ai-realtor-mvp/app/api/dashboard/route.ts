import { failure, getRequestId, success } from "../../../lib/api/response";
import { getDashboardMetrics } from "../../../lib/services/dashboard-service";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const data = await getDashboardMetrics();
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "DASHBOARD_LOAD_FAILED", (error as Error).message, 500);
  }
}
