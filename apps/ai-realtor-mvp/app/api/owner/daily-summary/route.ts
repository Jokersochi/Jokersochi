import { NextResponse } from "next/server";
import { ownerSummarySchema } from "../../../../shared/validators";
import { sendTelegramMessage } from "../../../../lib/adapters/telegram-adapter";
import { sendWhatsAppMessage } from "../../../../lib/adapters/whatsapp-adapter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = ownerSummarySchema.parse(body);
    const text = `Lead ${payload.leadId}\nTemp: ${payload.temperature}\nStatus: ${payload.status}\nUrgency: ${payload.urgency}\n${payload.summary}`;

    const [telegram, whatsapp] = await Promise.all([
      sendTelegramMessage(text),
      sendWhatsAppMessage("owner", text)
    ]);

    return NextResponse.json({ ok: true, data: payload, delivery: { telegram, whatsapp } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
