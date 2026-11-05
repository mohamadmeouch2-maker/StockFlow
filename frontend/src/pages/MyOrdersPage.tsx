import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { OrderStatusBadge } from "../components/OrderStatusBadge";

// FR-09: my orders, newest first. FR-10: Pending orders can be cancelled (guide 4.9).
export function MyOrdersPage() {
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ["orders", "mine"], queryFn: ordersApi.mine });

  const cancel = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // stock came back
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.isLoading && <p>Loading...</p>}
      {orders.isError && <p className="text-red-600">Could not load your orders. {orders.error.message}</p>}
      {cancel.isError && <p className="text-red-600">Could not cancel. {cancel.error.message}</p>}
      {orders.data?.length === 0 && <p>You have no orders yet.</p>}

      {orders.data?.map((o) => (
        <div key={o.id} className="space-y-2 rounded border bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">Order #{o.id}</span>
            <OrderStatusBadge status={o.status} />
            <span className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</span>
          </div>
          <ul className="text-sm">
            {o.items.map((i) => (
              <li key={i.productId}>
                {i.quantity} × {i.product.name} at ${Number(i.unitPrice).toFixed(2)}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total: ${Number(o.total).toFixed(2)}</span>
            {o.status === "PENDING" && (
              <button
                disabled={cancel.isPending}
                onClick={() => confirm(`Cancel order #${o.id}?`) && cancel.mutate(o.id)}
                className="rounded border border-red-600 px-3 py-1 text-red-600 disabled:opacity-50"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
