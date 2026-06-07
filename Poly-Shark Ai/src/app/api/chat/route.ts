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

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY не задан. Добавьте в .env.local" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const body = (await req.json()) as ChatPayload;
  const { messages, mode } = body;

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.chat,
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
