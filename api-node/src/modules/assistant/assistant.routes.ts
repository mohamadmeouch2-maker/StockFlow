import type { Role } from "@prisma/client";
import { Router, type Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthUser } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ollama, type OllamaMessage } from "./ollama";
import { runTool, toolsFor } from "./tools";

// The StockFlow assistant: a chat for logged-in customers and admins, answered by a free AI that
// runs on this computer (see ollama.ts). It looks up real shop data with read-only tools (tools.ts).

export const assistantRouter = Router();

export const MAX_QUESTIONS_PER_HOUR = 30;
const MAX_ROUNDS = 5; // tool rounds before giving up on one question
const HISTORY = 10; // earlier messages the AI sees

const chatBody = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1, "Write a message").max(1000, "At most 1000 characters") }))
      .min(1)
      .max(40),
    language: z.enum(["en", "ar", "fr"]).default("en"), // the website's language: the answer uses it
  })
  .refine((b) => b.messages.at(-1)?.role === "user", { message: "The last message must be the question", path: ["messages"] });

// Each person can ask MAX_QUESTIONS_PER_HOUR questions an hour: the AI is slow on a laptop, so one
// person can't keep it busy. The counts live in memory.
const asked = new Map<number, number[]>();
function limitQuestions(userId: number, res: Response, now = Date.now()) {
  const recent = (asked.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= MAX_QUESTIONS_PER_HOUR) {
    const minutes = Math.ceil((recent[0] + 3_600_000 - now) / 60_000);
    res.setHeader("Retry-After", String(minutes * 60));
    throw new AppError(429, "TOO_MANY_QUESTIONS", `You asked many questions in a short time. Please try again in ${minutes} minutes.`);
  }
  recent.push(now);
  asked.set(userId, recent);
}

const LANGUAGES = { en: "English", ar: "Arabic", fr: "French" };

function instructions(role: Role, name: string, language: keyof typeof LANGUAGES) {
  const who =
    role === "ADMIN"
      ? "an admin (staff of the shop). Help with products, low stock, sales and the orders to ship. The low_stock tool also lists the sold-out products."
      : "a customer. Help them find products and follow their own orders. The shop's sales and other customers' orders are private: if asked, say only the shop's staff can see them.";
  return [
    "You are the StockFlow assistant, a chat inside the StockFlow website, an office supplies shop in Lebanon.",
    `You are talking to ${name}, ${who}`,
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    `Always answer in ${LANGUAGES[language]}, in a few short sentences or a short list. Plain text: no tables, no headings.`,
    "Before answering about products, categories, prices, stock, sales or orders, always call a tool to get the real data, even if you think you know. Never invent them: if the tools don't have it, say you don't know.",
    "When a tool gives a list, mention every item in it (or say how many there are), not just the first ones.",
    "Prices are in US dollars. Product names are in English: search with English words, even when the question is in another language.",
    "You can only read information. You cannot place, change or cancel orders: say where to do it on the website (Cart, My orders, Customer service).",
  ].join("\n");
}

// Some models write their reasoning into the answer, ending with </think> (sometimes without <think>): only the answer is shown.
const clean = (text: string) => text.replace(/^[\s\S]*<\/think>/, "").trim();

// A question (with the conversation so far) -> the answer, and the products it found (the website links them).
assistantRouter.post("/chat", requireAuth, validate(chatBody), async (_req, res) => {
  const me = res.locals.user as AuthUser;
  limitQuestions(me.id, res);
  const { messages, language } = res.locals.body as z.infer<typeof chatBody>;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true } });

  const conversation: OllamaMessage[] = [{ role: "system", content: instructions(me.role, user.name, language) }, ...messages.slice(-HISTORY)];
  const tools = toolsFor(me.role);
  const found = new Map<number, { id: number; name: string }>();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await ollama.chat(conversation, tools);
    if (!reply.tool_calls?.length) {
      const answer = clean(reply.content ?? "");
      // Links only for the products the answer names
      const named = [...found.values()].filter((p) => answer.toLowerCase().includes(p.name.toLowerCase()));
      res.json({ reply: answer || "Sorry, I could not answer that. Please ask in another way.", products: named.slice(0, 4) });
      return;
    }
    conversation.push({ role: "assistant", content: reply.content ?? "", tool_calls: reply.tool_calls });
    for (const call of reply.tool_calls) {
      const result = await runTool(call, me);
      if (call.function.name === "search_products" && Array.isArray(result)) for (const p of result) found.set(p.id, { id: p.id, name: p.name });
      conversation.push({ role: "tool", tool_name: call.function.name, content: JSON.stringify(result) });
    }
  }
  res.json({ reply: "Sorry, I could not answer that. Please ask in another way.", products: [] });
});
