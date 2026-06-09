"use client";
import { Message } from "@/lib/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { SharkLogo } from "./SharkLogo";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 max-w-3xl mx-auto w-full", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isUser
            ? "bg-abyss-800 text-shark-tooth"
            : "bg-shark-shine"
        )}
      >
        {isUser ? <User size={16} /> : <SharkLogo size={26} />}
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-3 max-w-[80%]",
          isUser
            ? "bg-shark/20 border border-shark/30 text-shark-tooth"
            : "glass"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose-shark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || "▍"}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
