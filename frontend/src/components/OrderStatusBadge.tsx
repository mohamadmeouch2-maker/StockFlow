import type { OrderStatus } from "../api/types";

const colors: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status]}`}>{status}</span>;
}
