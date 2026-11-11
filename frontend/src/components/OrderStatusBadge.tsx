import type { OrderStatus } from "../api/types";

// Waiting = warning, on its way = brand, done = success, stopped = neutral (the same colours as everywhere)
const styles: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "badge-warning" },
  SHIPPED: { label: "Shipped", color: "badge-brand" },
  DELIVERED: { label: "Delivered", color: "badge-success" },
  CANCELLED: { label: "Cancelled", color: "badge-neutral" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, color } = styles[status];
  return <span className={`badge ${color}`}>{label}</span>;
}
