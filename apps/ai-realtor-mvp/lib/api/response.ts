import { NextResponse } from "next/server";

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function success<T>(requestId: string, data: T, status = 200) {
  return NextResponse.json({ ok: true, request_id: requestId, data }, { status });
}

export function failure(requestId: string, code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, request_id: requestId, error: { code, message, details } }, { status });
}
