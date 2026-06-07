import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      setActive: (id) => set({ activeId: id }),
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
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      setMode: (m) => set({ mode: m }),
      renameConversation: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        })),
    }),
    { name: "poly-shark-store" }
  )
);
