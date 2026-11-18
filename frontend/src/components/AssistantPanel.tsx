import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ASSISTANT_STORAGE_KEY, assistantApi, type ChatMessage } from "../api/assistant";
import { useAuth } from "../auth/useAuth";
import { msg, translateServer } from "../i18n/core";
import { useT } from "../i18n/useT";

// The conversation stays while the visitor moves between pages (and is cleared on log out).
const load = (): ChatMessage[] => {
  try {
    return JSON.parse(sessionStorage.getItem(ASSISTANT_STORAGE_KEY) ?? "[]") as ChatMessage[];
  } catch {
    return [];
  }
};
const save = (messages: ChatMessage[]) => {
  try {
    sessionStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
  } catch {
    // not kept, but the chat still works
  }
};

// Questions to start with, depending on who is asking
const SUGGESTIONS = {
  CUSTOMER: [msg("Which products are on sale?"), msg("What can I buy for less than $10?"), msg("Where is my last order?")],
  ADMIN: [msg("Which products need restocking?"), msg("How were the sales this week?"), msg("Which orders should I ship first?")],
};

// The StockFlow assistant: a chat answered by a free AI that runs on the shop's computer.
// It looks up real products, prices and orders, and answers in the website's language.
export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(load);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "end" });
    save(messages);
  }, [messages, waiting]);
  // Escape closes the window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || waiting) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setText("");
    setWaiting(true);
    try {
      const answer = await assistantApi.chat(next, lang);
      setMessages([...next, { role: "assistant", content: translateServer(answer.reply), products: answer.products }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: err instanceof Error ? err.message : t("Something went wrong"), error: true }]);
    } finally {
      setWaiting(false);
      input.current?.focus();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <section
      role="dialog"
      aria-label={t("StockFlow assistant")}
      className="fixed start-4 bottom-20 z-40 flex h-[32rem] max-h-[calc(100vh-7rem)] w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      <header className="flex items-start gap-3 border-b border-slate-100 bg-brand-600 px-4 py-3 text-white">
        <span aria-hidden="true" className="text-2xl">
          🤖
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("StockFlow assistant")}</h2>
          <p className="text-xs text-brand-100">{t("A free AI on the shop's computer. It can make mistakes.")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close the assistant")}
          className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              {user?.role === "ADMIN"
                ? t("Hi {name}! Ask me about stock, sales or the orders to ship.", { name: user.name })
                : t("Hi {name}! Ask me about products, prices or your orders.", { name: user?.name ?? "" })}
            </p>
            <div className="flex flex-col items-start gap-2">
              {SUGGESTIONS[user?.role ?? "CUSTOMER"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(t(s))}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-start text-brand-700 hover:bg-brand-100"
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-ee-sm bg-brand-600 text-white"
                  : m.error
                    ? "rounded-es-sm bg-danger-50 text-danger-700"
                    : "rounded-es-sm bg-slate-100 text-slate-800"
              }`}
            >
              <p className="break-words whitespace-pre-line">{m.content}</p>
              {!!m.products?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.products.map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-700 shadow-sm hover:underline"
                    >
                      {p.name} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {waiting && (
          <div className="flex justify-start" role="status">
            <div className="rounded-2xl rounded-es-sm bg-slate-100 px-3 py-2 text-sm text-slate-500">
              <span className="animate-pulse">{t("Thinking...")}</span>
              <span className="mt-0.5 block text-xs text-slate-400">{t("This can take up to a minute.")}</span>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <label htmlFor="assistant-question" className="sr-only">
          {t("Your question")}
        </label>
        <textarea
          id="assistant-question"
          ref={input}
          rows={1}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // Enter sends, Shift+Enter starts a new line
              send(text);
            }
          }}
          placeholder={t("Ask a question...")}
          className="input max-h-28 min-h-10 resize-none"
        />
        <button disabled={waiting || !text.trim()} className="btn btn-primary">
          {t("Send")}
        </button>
      </form>
    </section>
  );
}
