import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import type { AppMode } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatPayload {
  messages: { role: "user" | "assistant"; content: string }[];
  mode: AppMode;
}

const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 20;
const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 16_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > MAX_REQ_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY не задан. Добавьте в .env.local" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: `Слишком много запросов. Повторите через ${rl.retryAfter}с.` }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rl.retryAfter),
        },
      }
    );
  }

  let body: ChatPayload;
  try {
    body = (await req.json()) as ChatPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Некорректный JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { messages, mode } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages обязательны" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (messages.length > MAX_MESSAGES) {
    return new Response(
      JSON.stringify({ error: `Максимум ${MAX_MESSAGES} сообщений в одном запросе` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  for (const m of messages) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length > MAX_CONTENT_LEN
    ) {
      return new Response(
        JSON.stringify({ error: "Невалидное сообщение в payload" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.chat;

  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Ошибка]: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
