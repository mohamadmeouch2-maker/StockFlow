import type { Order } from "../api/types";
import { shortDate } from "../utils/format";
import { useT } from "../i18n/useT";
import { msg } from "../i18n/core";

type Step = { label: string; done: boolean; date?: string | null; note?: string };

// Tracking for one order: Placed → Shipped → Delivered (or Placed → Cancelled), with the date of each step.
export function OrderTimeline({ order }: { order: Order }) {
  const { t } = useT();
  const cancelled = order.status === "CANCELLED";
  const shipped = order.status === "SHIPPED" || order.status === "DELIVERED";
  const delivered = order.status === "DELIVERED";
  const steps: Step[] = cancelled
    ? [
        { label: msg("Placed"), done: true, date: order.createdAt },
        { label: msg("Cancelled"), done: true, date: order.cancelledAt },
      ]
    : [
        { label: msg("Placed"), done: true, date: order.createdAt },
        { label: msg("Shipped"), done: shipped, date: order.shippedAt },
        {
          label: msg("Delivered"),
          done: delivered,
          date: order.deliveredAt,
          note: order.deliverBy ? t("expected by {date}", { date: shortDate(order.deliverBy) }) : undefined,
        },
      ];

  return (
    <ol className="flex items-start px-5 pt-4 pb-3" aria-label={t("Tracking for order #{id}", { id: order.id })}>
      {steps.map((s, i) => {
        const isCancel = cancelled && i === 1;
        const color = !s.done ? "bg-slate-200 text-slate-500" : isCancel ? "bg-danger-500 text-white" : "bg-brand-600 text-white";
        return (
          <li key={s.label} className="relative flex flex-1 flex-col items-center text-center">
            {/* The line from the step before to this one */}
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-3 end-1/2 h-0.5 w-full ${s.done ? (isCancel ? "bg-danger-300" : "bg-brand-600") : "bg-slate-200"}`}
              />
            )}
            <span aria-hidden="true" className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${color}`}>
              {s.done ? (isCancel ? "✕" : "✓") : i + 1}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-slate-800">
              {t(s.label)}
              <span className="sr-only"> {s.done ? t("(done)") : t("(not yet)")}</span>
            </span>
            <span className="text-xs text-slate-500">{s.done ? (s.date ? shortDate(s.date) : "") : (s.note ?? "")}</span>
          </li>
        );
      })}
    </ol>
  );
}
