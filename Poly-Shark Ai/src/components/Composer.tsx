"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
}

export function Composer({ onSend, loading }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const submit = () => {
    const t = value.trim();
    if (!t || loading) return;
    onSend(t);
    setValue("");
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4">
      <div className="glass rounded-2xl p-2 flex items-end gap-2 focus-within:border-shark/60 transition">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Спросите Poly-Shark что угодно… (Enter — отправить, Shift+Enter — новая строка)"
          className="flex-1 bg-transparent resize-none outline-none px-3 py-2 text-abyss-50 placeholder:text-abyss-400 max-h-[200px]"
        />
        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0",
            value.trim() && !loading
              ? "bg-shark-shine text-white hover:opacity-90"
              : "bg-abyss-800 text-abyss-500"
          )}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
      <p className="text-[10px] text-abyss-500 text-center mt-2">
        Poly-Shark может ошибаться. Проверяйте важную информацию.
      </p>
    </div>
  );
}
