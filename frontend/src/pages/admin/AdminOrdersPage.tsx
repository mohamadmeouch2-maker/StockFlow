import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ordersApi } from "../../api/orders";
import type { Order, OrderStatus } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";

// FR-12 (guide 4.11): all orders with a status filter. Each row shows only the valid next actions.
const actions: Record<OrderStatus, { label: string; status: Exclude<OrderStatus, "PENDING"> }[]> = {
  PENDING: [
    { label: "Mark shipped", status: "SHIPPED" },
    { label: "Cancel", status: "CANCELLED" },
  ],
  SHIPPED: [{ label: "Mark delivered", status: "DELIVERED" }],
  DELIVERED: [],
  CANCELLED: [],
};

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus>();
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ["orders", "all", status], queryFn: () => ordersApi.all(status) });

  const change = useMutation({
    mutationFn: ({ id, next }: { id: number; next: Exclude<OrderStatus, "PENDING"> }) => ordersApi.setStatus(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // a cancel gives stock back
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  const items = (o: Order) => o.items.map((i) => `${i.quantity} × ${i.product.name}`).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Manage orders</h1>
        <select
          aria-label="Filter by status"
          value={status ?? ""}
          onChange={(e) => setStatus((e.target.value || undefined) as OrderStatus | undefined)}
          className="rounded border bg-white px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {orders.isLoading && <p>Loading...</p>}
      {orders.isError && <p className="text-red-600">Could not load orders. {orders.error.message}</p>}
      {change.isError && <p className="text-red-600">Could not change the status. {change.error.message}</p>}
      {orders.data?.length === 0 && <p>No orders.</p>}

      {!!orders.data?.length && (
        <div className="overflow-x-auto">
          <table className="w-full rounded border bg-white text-left text-sm">
            <thead className="border-b bg-gray-100">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3">
                    #{o.id}
                    <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="p-3">{o.user?.name ?? o.userId}</td>
                  <td className="p-3">{items(o)}</td>
                  <td className="p-3">${Number(o.total).toFixed(2)}</td>
                  <td className="p-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    {actions[o.status].map((a) => (
                      <button
                        key={a.status}
                        disabled={change.isPending}
                        onClick={() => change.mutate({ id: o.id, next: a.status })}
                        className={a.status === "CANCELLED" ? "text-red-600 hover:underline" : "text-blue-600 hover:underline"}
                      >
                        {a.label}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
