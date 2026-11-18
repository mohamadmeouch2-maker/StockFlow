import { api } from "./client";
import type { Lang } from "../i18n/core";

// Where the conversation is kept while moving between pages (cleared on log out)
export const ASSISTANT_STORAGE_KEY = "assistant";

export type ChatMessage = { role: "user" | "assistant"; content: string; products?: { id: number; name: string }[]; error?: boolean };
export type ChatAnswer = { reply: string; products: { id: number; name: string }[] };

// The StockFlow assistant (a free AI running on the shop's computer, see api-node/src/modules/assistant).
export const assistantApi = {
  // The conversation so far (the last message is the question) -> the answer, in the website's language
  chat: (messages: ChatMessage[], language: Lang) =>
    api<ChatAnswer>("core", "/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ messages: messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content })), language }),
    }),
};
