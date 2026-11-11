import { useState } from "react";
import type { DeliveryMethod } from "../api/types";
import { shortDate } from "../utils/format";

type Props = {
  delivery: DeliveryMethod;
  deliverBy?: string | null; // shown as "by Thu, Nov 12"
  onTheWay?: boolean; // the order is still Pending or Shipped: then a passed date shows as late
};

// "⚡ Express · by Thu, Nov 12", "🚚 Standard · by Mon, Nov 16", or in red "⚠ Express · late (due Fri, Nov 6)"
export function DeliveryBadge({ delivery, deliverBy, onTheWay = false }: Props) {
  const [now] = useState(() => Date.now()); // read the clock once, when the badge appears
  const express = delivery === "EXPRESS";
  const late = onTheWay && !!deliverBy && new Date(deliverBy).setHours(23, 59, 59, 999) < now; // the whole due day has passed
  const color = late
    ? "bg-red-50 text-red-700 ring-red-200"
    : express
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${color}`}>
      <span aria-hidden="true">{late ? "⚠" : express ? "⚡" : "🚚"}</span>
      {express ? "Express" : "Standard"}
      {deliverBy && <span className="font-normal opacity-80">· {late ? `late (due ${shortDate(deliverBy)})` : `by ${shortDate(deliverBy)}`}</span>}
    </span>
  );
}
