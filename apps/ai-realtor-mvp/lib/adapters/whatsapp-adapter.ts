export interface WhatsAppAdapterResult {
  ok: boolean;
  provider: "whatsapp";
  status: "sent" | "not_configured";
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<WhatsAppAdapterResult> {
  const endpoint = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  void to;
  void text;

  if (!endpoint || !token) {
    return { ok: false, provider: "whatsapp", status: "not_configured" };
  }

  // TODO: integrate with approved WhatsApp Business provider API.
  return { ok: true, provider: "whatsapp", status: "sent" };
}
