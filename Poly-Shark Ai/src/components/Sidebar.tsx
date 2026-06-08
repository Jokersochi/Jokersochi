"use client";
import { useStore } from "@/lib/store";
import { MODE_META } from "@/lib/prompts";
import { SharkLogo } from "./SharkLogo";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const { conversations, activeId, newConversation, setActive, deleteConversation, mode, setMode, streamingId } =
    useStore();

  return (
    <aside className="w-72 shrink-0 glass border-r border-abyss-800/50 flex flex-col h-screen">
      <div className="p-4 border-b border-abyss-800/50">
        <div className="flex items-center gap-3 mb-4">
          <SharkLogo size={36} />
          <div>
            <h1 className="font-bold text-lg bg-shark-shine bg-clip-text text-transparent">
              Poly-Shark AI
            </h1>
            <p className="text-[10px] text-abyss-300 uppercase tracking-widest">
              Apex Intelligence
            </p>
          </div>
        </div>
        <button
          onClick={() => { if (!streamingId) newConversation(); }}
          disabled={!!streamingId}
          title={streamingId ? "Дождитесь окончания текущего ответа" : undefined}
          className="w-full flex items-center justify-center gap-2 bg-shark-shine text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition animate-pulse-glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Новый диалог
        </button>
      </div>

      <div className="p-3 border-b border-abyss-800/50">
        <p className="text-[10px] uppercase tracking-widest text-abyss-400 mb-2 px-2">
          Режим
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(MODE_META) as Array<keyof typeof MODE_META>).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "text-left px-2.5 py-2 rounded-md text-xs transition border",
                mode === m
                  ? "bg-shark/20 border-shark/60 text-shark-tooth"
                  : "border-transparent text-abyss-300 hover:bg-abyss-900/60"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span>{MODE_META[m].icon}</span>
                <span className="font-medium">{MODE_META[m].label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence>
          {conversations.length === 0 && (
            <p className="text-center text-xs text-abyss-400 p-6">
              Здесь появятся ваши диалоги
            </p>
          )}
          {conversations.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition",
                activeId === c.id
                  ? "bg-shark/15 text-shark-tooth"
                  : "text-abyss-200 hover:bg-abyss-900/50",
                streamingId && streamingId !== c.id
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              )}
              onClick={() => {
                if (streamingId && streamingId !== c.id) return;
                setActive(c.id);
              }}
              title={
                streamingId && streamingId !== c.id
                  ? "Дождитесь окончания текущего ответа"
                  : undefined
              }
            >
              <MessageSquare size={14} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate">{c.title}</span>
              {streamingId === c.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-shark animate-pulse shrink-0" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (streamingId === c.id) return;
                  deleteConversation(c.id);
                }}
                disabled={streamingId === c.id}
                title={streamingId === c.id ? "Дождитесь окончания ответа" : "Удалить"}
                className={cn(
                  "transition",
                  streamingId === c.id
                    ? "opacity-30 cursor-not-allowed text-abyss-500"
                    : "opacity-0 group-hover:opacity-100 text-abyss-400 hover:text-red-400"
                )}
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-abyss-800/50 text-[10px] text-abyss-400 text-center">
        v1.0 · powered by Claude
      </div>
    </aside>
  );
}
