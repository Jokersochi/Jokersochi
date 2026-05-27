export interface AdapterResult {
  ok: boolean;
  provider: "telegram";
  status: "sent" | "not_configured";
}

export async function sendTelegramMessage(text: string): Promise<AdapterResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, provider: "telegram", status: "not_configured" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  return { ok: response.ok, provider: "telegram", status: response.ok ? "sent" : "not_configured" };
}
