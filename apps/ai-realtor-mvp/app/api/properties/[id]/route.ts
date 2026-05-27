import { failure, getRequestId, success } from "../../../../lib/api/response";
import { getProperty, updateProperty } from "../../../../lib/services/property-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    const data = await getProperty(id);
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "PROPERTY_GET_FAILED", (error as Error).message, 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = await updateProperty(id, body);
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "PROPERTY_PATCH_FAILED", (error as Error).message, 400);
  }
}
