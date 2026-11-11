import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ordersApi } from "../../api/orders";
import type { Order, OrderStatus } from "../../api/types";
import { DeliveryBadge } from "../../components/DeliveryBadge";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { RowsSkeleton } from "../../components/Skeleton";
import { useToast } from "../../toast/useToast";

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
  const toast = useToast();
  const orders = useQuery({ queryKey: ["orders", "all", status], queryFn: () => ordersApi.all(status) });

  const change = useMutation({
    mutationFn: ({ id, next }: { id: number; next: Exclude<OrderStatus, "PENDING"> }) => ordersApi.setStatus(id, next),
    onSuccess: (order) => {
      toast(`Order #${order.id} is now ${order.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // a cancel gives stock back
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  const items = (o: Order) => o.items.map((i) => `${i.quantity} × ${i.product.name}`).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">Manage orders</h1>
          <p className="text-sm text-slate-500">{orders.data ? `${orders.data.length} orders` : ""}</p>
        </div>
        <select
          aria-label="Filter by status"
          value={status ?? ""}
          onChange={(e) => setStatus((e.target.value || undefined) as OrderStatus | undefined)}
          className="input w-auto"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {orders.isLoading && <RowsSkeleton />}
      {orders.isError && <p className="text-red-600">Could not load orders. {orders.error.message}</p>}
      {change.isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not change the status. {change.error.message}</p>}
      {orders.data?.length === 0 && <div className="card p-10 text-center text-slate-500">No orders with this status.</div>}

      {!!orders.data?.length && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Delivery</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="font-medium text-slate-900">#{o.id}</span>
                    <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</div>
                  </td>
                  <td>{o.user?.name ?? o.userId}</td>
                  <td>{items(o)}</td>
                  <td>${Number(o.total).toFixed(2)}</td>
                  <td>
                    {/* Express orders first: they must arrive the next day */}
                    <DeliveryBadge delivery={o.delivery} deliverBy={o.status === "PENDING" || o.status === "SHIPPED" ? o.deliverBy : null} onTheWay />
                  </td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="space-x-2 text-right whitespace-nowrap">
                    {actions[o.status].map((a) => (
                      <button
                        key={a.status}
                        disabled={change.isPending}
                        onClick={() => change.mutate({ id: o.id, next: a.status })}
                        className={a.status === "CANCELLED" ? "btn btn-danger px-3 py-1" : "btn btn-primary px-3 py-1"}
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
