import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { OrderProblems } from "../components/OrderProblems";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { RowsSkeleton } from "../components/Skeleton";
import { useToast } from "../toast/useToast";

// FR-09: my orders, newest first. FR-10: Pending orders can be cancelled (guide 4.9).
export function MyOrdersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const orders = useQuery({ queryKey: ["orders", "mine"], queryFn: ordersApi.mine });

  const cancel = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: (order) => {
      toast(`Order #${order.id} cancelled. The items are back in stock.`, "info");
      queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // stock came back
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="page-title">My orders</h1>
        <p className="text-sm text-slate-500">Newest first. Pending orders can still be cancelled.</p>
      </div>
      {orders.isLoading && <RowsSkeleton rows={3} />}
      {orders.isError && <p className="text-red-600">Could not load your orders. {orders.error.message}</p>}
      {cancel.isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not cancel. {cancel.error.message}</p>}
      {orders.data?.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">You have no orders yet.</p>
          <p className="text-sm">Your orders will appear here after you check out.</p>
        </div>
      )}

      {orders.data?.map((o) => (
        <div key={o.id} className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span className="font-semibold text-slate-900">Order #{o.id}</span>
            <OrderStatusBadge status={o.status} />
            <span className="ml-auto text-sm text-slate-500">{new Date(o.createdAt).toLocaleString()}</span>
          </div>
          <ul className="divide-y divide-slate-100 px-5 text-sm">
            {o.items.map((i) => (
              <li key={i.productId} className="flex justify-between py-2">
                <span>
                  <span className="font-medium">{i.quantity} ×</span> {i.product.name}
                </span>
                <span className="text-slate-500">${Number(i.unitPrice).toFixed(2)} each</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="font-semibold text-slate-900">Total: ${Number(o.total).toFixed(2)}</span>
            {o.status === "PENDING" && (
              <button
                disabled={cancel.isPending}
                onClick={() => confirm(`Cancel order #${o.id}?`) && cancel.mutate(o.id)}
                className="btn btn-danger py-1.5"
              >
                Cancel order
              </button>
            )}
          </div>
          <OrderProblems orderId={o.id} issues={o.issues ?? []} />
        </div>
      ))}
    </div>
  );
}
