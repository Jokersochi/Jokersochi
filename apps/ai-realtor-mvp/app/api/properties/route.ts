import { failure, getRequestId, success } from "../../../lib/api/response";
import { createProperty, listProperties } from "../../../lib/services/property-service";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const data = await listProperties();
    return success(requestId, data);
  } catch (error) {
    return failure(requestId, "PROPERTIES_LIST_FAILED", (error as Error).message, 500);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const data = await createProperty(body);
    return success(requestId, data, 201);
  } catch (error) {
    return failure(requestId, "PROPERTY_CREATE_FAILED", (error as Error).message, 400);
  }
}
