import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

const PERSIST_DEBOUNCE_MS = 300;

function debouncedLocalStorage(): StateStorage {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingName: string | null = null;
  let pendingValue: string | null = null;
  const flush = () => {
    if (pendingName !== null && pendingValue !== null) {
      try {
        localStorage.setItem(pendingName, pendingValue);
      } catch {
        /* quota or SSR */
      }
    }
    pendingName = null;
    pendingValue = null;
    timer = null;
  };
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flush);
  }
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(name);
    },
    setItem: (name, value) => {
      pendingName = name;
      pendingValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, PERSIST_DEBOUNCE_MS);
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
        pendingName = null;
        pendingValue = null;
      }
      localStorage.removeItem(name);
    },
  };
}

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  mode: AppMode;
}

export type AppMode = "chat" | "code" | "research" | "creative";

interface State {
  conversations: Conversation[];
  activeId: string | null;
  mode: AppMode;
  streamingId: string | null;
  setStreamingId: (id: string | null) => void;
  newConversation: (mode?: AppMode) => string;
  setActive: (id: string) => void;
  addMessage: (id: string, msg: Message) => void;
  updateLastAssistant: (id: string, delta: string) => void;
  appendToMessage: (convId: string, msgId: string, delta: string) => void;
  deleteConversation: (id: string) => void;
  setMode: (m: AppMode) => void;
  renameConversation: (id: string, title: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 11);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      mode: "chat",
      streamingId: null,
      setStreamingId: (id) => set({ streamingId: id }),
      newConversation: (mode) => {
        const id = uid();
        const conv: Conversation = {
          id,
          title: "Новый диалог",
          messages: [],
          createdAt: Date.now(),
          mode: mode ?? get().mode,
        };
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeId: id,
        }));
        return id;
      },
      setActive: (id) =>
        set((s) => {
          // Не уводим фокус с разговора, в который сейчас стримится ответ —
          // иначе пользователь не увидит токены, прилетающие в исходный чат.
          if (s.streamingId && s.streamingId !== id) return s;
          const conv = s.conversations.find((c) => c.id === id);
          return { activeId: id, mode: conv?.mode ?? s.mode };
        }),
      addMessage: (id, msg) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messages: [...c.messages, msg],
                  title:
                    c.messages.length === 0 && msg.role === "user"
                      ? msg.content.slice(0, 40)
                      : c.title,
                }
              : c
          ),
        })),
      updateLastAssistant: (id, delta) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== id) return c;
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            if (last && last.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, content: last.content + delta };
            }
            return { ...c, messages: msgs };
          }),
        })),
      appendToMessage: (convId, msgId, delta) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === msgId ? { ...m, content: m.content + delta } : m
                  ),
                }
          ),
        })),
      deleteConversation: (id) =>
        set((s) => {
          if (s.streamingId === id) return s; // нельзя удалить пока стримится
          return {
            conversations: s.conversations.filter((c) => c.id !== id),
            activeId: s.activeId === id ? null : s.activeId,
          };
        }),
      setMode: (m) =>
        set((s) => ({
          mode: m,
          conversations: s.activeId
            ? s.conversations.map((c) =>
                c.id === s.activeId && c.messages.length === 0
                  ? { ...c, mode: m }
                  : c
              )
            : s.conversations,
        })),
      renameConversation: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        })),
    }),
    {
      name: "poly-shark-store",
      storage: createJSONStorage(debouncedLocalStorage),
      partialize: (s) => ({
        conversations: s.conversations,
        activeId: s.activeId,
        mode: s.mode,
        // streamingId намеренно НЕ персистится — иначе закрытие вкладки
        // во время стрима оставит чат заблокированным навсегда
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.activeId) return;
        const conv = state.conversations.find((c) => c.id === state.activeId);
        if (conv) state.mode = conv.mode;
      },
    }
  )
);
