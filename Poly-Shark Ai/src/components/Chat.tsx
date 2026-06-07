"use client";
import { useStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { MODE_META } from "@/lib/prompts";
import { SharkLogo } from "./SharkLogo";
import { motion } from "framer-motion";

const SUGGESTIONS: Record<string, string[]> = {
  chat: [
    "Объясни квантовую запутанность простыми словами",
    "Помоги спланировать неделю продуктивно",
    "Дай 5 идей для подкаста про ИИ",
  ],
  code: [
    "Напиши хук useDebounce на TypeScript",
    "Объясни разницу между Promise.all и Promise.allSettled",
    "Покажи паттерн Repository на Python",
  ],
  research: [
    "Сравни Rust и Go для backend",
    "Какие тренды в AI на 2026?",
    "Анализ рынка электромобилей",
  ],
  creative: [
    "Слоган для бренда умных часов",
    "Сюжет короткого рассказа в стиле киберпанк",
    "10 необычных названий для кофейни",
  ],
};

export function Chat() {
  const {
    conversations,
    activeId,
    mode,
    newConversation,
    addMessage,
    appendToMessage,
  } = useStore();
  const [loading, setLoading] = useState(false);
  const sendingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId);
  const displayMode = active?.mode ?? mode;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, loading]);

  const send = async (text: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);
    let id = activeId;
    if (!id) id = newConversation(mode);
    const convId = id;
    const userMsg = {
      id: Math.random().toString(36).slice(2),
      role: "user" as const,
      content: text,
      createdAt: Date.now(),
    };
    const assistantId = Math.random().toString(36).slice(2);
    addMessage(convId, userMsg);
    addMessage(convId, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });

    try {
      const conv = useStore.getState().conversations.find((c) => c.id === convId)!;
      const msgs = conv.messages
        .filter((m) => !(m.role === "assistant" && !m.content))
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const accessToken = process.env.NEXT_PUBLIC_APP_ACCESS_TOKEN;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ messages: msgs, mode: conv.mode }),
      });

      if (!res.ok) {
        let errText = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) errText = data.error;
        } catch {
          try {
            errText = (await res.text()) || errText;
          } catch {
            /* ignore */
          }
        }
        throw new Error(errText);
      }

      if (!res.body) throw new Error("Нет потока ответа");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        appendToMessage(convId, assistantId, decoder.decode(value, { stream: true }));
      }
      const tail = decoder.decode();
      if (tail) appendToMessage(convId, assistantId, tail);

      const final = useStore.getState().conversations.find((c) => c.id === convId);
      const target = final?.messages.find((m) => m.id === assistantId);
      if (target && !target.content) {
        appendToMessage(convId, assistantId, "_(пустой ответ)_");
      }
    } catch (e) {
      appendToMessage(
        convId,
        assistantId,
        `\n\n⚠️ Ошибка: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const meta = MODE_META[displayMode];

  return (
    <main className="flex-1 flex flex-col h-screen">
      <header className="px-6 py-4 border-b border-abyss-800/50 glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h2 className="font-semibold text-abyss-50">{meta.label}</h2>
            <p className="text-xs text-abyss-400">{meta.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-abyss-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {(!active || active.messages.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto"
          >
            <div className="mb-6 animate-swim">
              <SharkLogo size={96} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-shark-shine bg-clip-text text-transparent glow-text mb-3">
              Poly-Shark AI
            </h1>
            <p className="text-abyss-300 mb-8 max-w-md">
              Хищный интеллект для творчества, кода и исследований. Выберите режим и
              задайте вопрос.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 w-full">
              {SUGGESTIONS[displayMode].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass p-4 rounded-xl text-left text-sm text-abyss-200 hover:border-shark/60 hover:text-shark-tooth transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {active?.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-abyss-800/50">
        <Composer onSend={send} loading={loading} />
      </div>
    </main>
  );
}
