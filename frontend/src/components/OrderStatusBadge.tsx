import type { OrderStatus } from "../api/types";

const styles: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  SHIPPED: { label: "Shipped", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, color } = styles[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${color}`}>{label}</span>;
}
