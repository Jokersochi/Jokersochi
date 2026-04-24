import { NextResponse } from "next/server";
import { classifyLeadMessage } from "../../../../lib/ai/classifier";
import { classifyResultSchema } from "../../../../shared/validators";

export async function POST(request: Request) {
  const body = await request.json();
  const data = classifyLeadMessage(body.message ?? "", Boolean(body.has_phone));
  const parsed = classifyResultSchema.parse(data);
  return NextResponse.json({ ok: true, data: parsed });
}
