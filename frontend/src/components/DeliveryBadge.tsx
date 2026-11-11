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
  const color = late ? "badge-danger" : express ? "badge-brand" : "badge-neutral";
  return (
    <span className={`badge gap-1 ${color}`}>
      <span aria-hidden="true">{late ? "⚠" : express ? "⚡" : "🚚"}</span>
      {express ? "Express" : "Standard"}
      {deliverBy && <span className="font-normal opacity-80">· {late ? `late (due ${shortDate(deliverBy)})` : `by ${shortDate(deliverBy)}`}</span>}
    </span>
  );
}
