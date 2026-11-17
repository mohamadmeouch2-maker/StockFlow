import type { OrderStatus } from "../api/types";
import { useT } from "../i18n/useT";
import { msg } from "../i18n/core";

// Waiting = warning, on its way = brand, done = success, stopped = neutral (the same colours as everywhere)
const styles: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: msg("Pending"), color: "badge-warning" },
  SHIPPED: { label: msg("Shipped"), color: "badge-brand" },
  DELIVERED: { label: msg("Delivered"), color: "badge-success" },
  CANCELLED: { label: msg("Cancelled"), color: "badge-neutral" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useT();
  const { label, color } = styles[status];
  return <span className={`badge ${color}`}>{t(label)}</span>;
}
