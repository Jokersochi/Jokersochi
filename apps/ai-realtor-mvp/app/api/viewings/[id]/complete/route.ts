import { NextResponse } from "next/server";
import { completeViewing } from "../../../../../lib/services/viewing-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({ noShow: false }));
    const data = await completeViewing(id, Boolean(body.noShow));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
