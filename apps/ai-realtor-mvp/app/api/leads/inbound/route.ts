import { NextResponse } from "next/server";
import { upsertInboundLead } from "../../../../lib/services/lead-service";
import { sendTelegramMessage } from "../../../../lib/adapters/telegram-adapter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await upsertInboundLead(body);

    let escalation = null;
    if (data.classification.should_escalate_to_owner) {
      escalation = await sendTelegramMessage(
        `HOT lead: ${data.lead.id} | ${data.classification.temperature} | ${data.classification.status}`
      );
    }

    return NextResponse.json({ ok: true, data, escalation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
