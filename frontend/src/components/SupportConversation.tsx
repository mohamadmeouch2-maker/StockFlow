import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supportApi, topicLabel } from "../api/support";
import type { SupportStatus, SupportTicket } from "../api/types";
import { useToast } from "../toast/useToast";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { dateTime } from "../utils/format";
import { useT } from "../i18n/useT";
import { msg } from "../i18n/core";
import { useCurrency } from "../currency/useCurrency";

type Viewer = "CUSTOMER" | "STAFF";

// The status in words: the customer and the store see the same conversation from different sides.
const statusText: Record<Viewer, Record<SupportStatus, string>> = {
  CUSTOMER: { OPEN: msg("Waiting for our answer"), ANSWERED: msg("We answered"), RESOLVED: msg("Solved") },
  STAFF: { OPEN: msg("Waiting for us"), ANSWERED: msg("Answered"), RESOLVED: msg("Solved") },
};
const statusClass: Record<SupportStatus, string> = { OPEN: "badge-warning", ANSWERED: "badge-brand", RESOLVED: "badge-success" };
const when = dateTime;

type Props = { ticket: SupportTicket; viewer: Viewer; isNew?: boolean };

// One customer service conversation: what it is about, the messages like a chat, and a box to write back.
//   viewer CUSTOMER: "My messages" on the Customer service page
//   viewer STAFF:    the admins' Customer service page (who wrote, their order, "Send & mark solved"...)
export function SupportConversation({ ticket, viewer, isNew }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const { money } = useCurrency();
  const { t } = useT();
  const [text, setText] = useState("");
  const staff = viewer === "STAFF";
  const refresh = () => qc.invalidateQueries({ queryKey: ["support"] });

  const reply = useMutation({
    mutationFn: (resolve: boolean) => supportApi.reply(ticket.id, text.trim(), resolve || undefined),
    onSuccess: (_, resolve) => {
      setText("");
      toast(
        staff
          ? resolve
            ? t("Answer sent. The conversation is solved.")
            : t("Answer sent. The customer also gets it by email.")
          : t("Message sent. We will answer soon."),
      );
      refresh();
    },
  });
  const setStatus = useMutation({
    mutationFn: (status: SupportStatus) => supportApi.setStatus(ticket.id, status),
    onSuccess: (_, status) => {
      toast(status === "RESOLVED" ? t("Marked as solved") : t("Conversation reopened"), "info");
      refresh();
    },
  });
  const busy = reply.isPending || setStatus.isPending;
  const error = reply.error ?? setStatus.error;
  const order = ticket.order;

  return (
    <article
      aria-label={t(topicLabel(ticket.topic)) + (ticket.orderId ? t(", order #{id}", { id: ticket.orderId }) : "")}
      className={`card overflow-hidden ${staff && ticket.status === "OPEN" ? "border-s-4 border-s-warning-400" : ""} ${isNew ? "ring-2 ring-brand-300" : ""}`}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm">
        <span className="font-semibold text-slate-900">{t(topicLabel(ticket.topic))}</span>
        {ticket.orderId && <span className="text-slate-500">· {t("Order #{id}", { id: ticket.orderId })}</span>}
        <span className={`badge ${statusClass[ticket.status]}`}>{t(statusText[viewer][ticket.status])}</span>
        {isNew && <span className="badge badge-danger">{t("New reply")}</span>}
        <span className="ms-auto text-xs text-slate-500">{t("Started {date}", { date: when(ticket.createdAt) })}</span>
      </header>

      {staff && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-5 py-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{ticket.name}</span>
          <a href={`mailto:${ticket.email}`} className="link">
            {ticket.email}
          </a>
          {ticket.userId === null && (
            <span className="badge badge-neutral" title={t("Wrote without logging in: your answer only reaches them by email")}>
              {t("Visitor, not logged in")}
            </span>
          )}
          {order && (
            <span className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              {order.items.map((it) => `${it.quantity} × ${it.product.name}`).join(", ")} · {money(order.total)}
            </span>
          )}
        </div>
      )}

      <ol className="space-y-3 px-5 py-4">
        {ticket.messages.map((m) => {
          const ours = (m.author === "STAFF") === staff; // written by the person looking at the page: on the right, in blue
          const who = m.author === "STAFF" ? (staff ? t("You (StockFlow)") : "StockFlow") : staff ? ticket.name : t("You");
          return (
            <li key={m.id} className={`flex ${ours ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${ours ? "stay-light rounded-ee-sm bg-brand-600 text-white" : "rounded-es-sm bg-slate-100 text-slate-800"}`}
              >
                <p className={`mb-0.5 text-xs font-semibold ${ours ? "text-brand-100" : "text-slate-500"}`}>
                  {who} · {when(m.createdAt)}
                </p>
                <p className="break-words whitespace-pre-line">{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="space-y-2 border-t border-slate-100 px-5 py-3">
        <label htmlFor={`reply-${ticket.id}`} className="label">
          {staff ? t("Answer the customer") : t("Write a reply")}
        </label>
        <textarea
          id={`reply-${ticket.id}`}
          rows={2}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={staff ? t("For example: Sorry about that! We are sending a new one today.") : t("Write your message")}
          className="input"
        />
        {error && (
          <p className="field-error">
            {t("Could not send.")} {error.message}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy || !text.trim()} onClick={() => reply.mutate(false)} className="btn btn-primary">
            {staff ? t("Send answer") : t("Send")}
          </button>
          {staff && (
            <>
              <button disabled={busy || !text.trim()} onClick={() => reply.mutate(true)} className="btn btn-outline">
                {t("Send & mark solved")}
              </button>
              {ticket.status === "RESOLVED" ? (
                <button disabled={busy} onClick={() => setStatus.mutate("OPEN")} className="btn btn-outline">
                  {t("Reopen")}
                </button>
              ) : (
                <button disabled={busy} onClick={() => setStatus.mutate("RESOLVED")} className="btn btn-outline">
                  {t("Mark solved")}
                </button>
              )}
            </>
          )}
          {!staff && ticket.status === "RESOLVED" && <span className="text-xs text-slate-500">{t("Still need help? Write again and we'll reopen it.")}</span>}
        </div>
      </div>
    </article>
  );
}
