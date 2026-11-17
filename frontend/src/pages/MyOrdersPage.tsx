import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import type { Order } from "../api/types";
import { useCart } from "../cart/useCart";
import { DeliveryBadge } from "../components/DeliveryBadge";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { OrderTimeline } from "../components/OrderTimeline";
import { RowsSkeleton } from "../components/Skeleton";
import { useToast } from "../toast/useToast";
import { useT } from "../i18n/useT";
import { dateTime } from "../utils/format";
import { useCurrency } from "../currency/useCurrency";

// FR-09: my orders, newest first. FR-10: Pending orders can be cancelled (guide 4.9).
export function MyOrdersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { money } = useCurrency();
  const { t } = useT();
  const orders = useQuery({ queryKey: ["orders", "mine"], queryFn: ordersApi.mine });
  const { add } = useCart();
  const navigate = useNavigate();

  // "Buy again": put the same products back in the cart, with today's price and stock.
  // Products that are sold out (or no longer sold) are skipped and named in the message.
  const buyAgain = useMutation({
    mutationFn: (o: Order) => Promise.allSettled(o.items.map((i) => productsApi.get(i.productId))),
    onSuccess: (results, o) => {
      const added: string[] = [];
      const unavailable: string[] = [];
      results.forEach((r, n) => {
        if (r.status === "fulfilled" && r.value.stock > 0) {
          add(r.value, o.items[n].quantity); // the cart never goes above the stock
          added.push(r.value.name);
        } else unavailable.push(o.items[n].product.name);
      });
      if (added.length === 0) return toast(t("Sorry, these products are not available right now: {names}", { names: unavailable.join(", ") }), "error");
      const what = added.length === 1 ? t("{name} added to your cart", { name: added[0] }) : t("{count} products added to your cart", { count: added.length });
      toast(what + (unavailable.length ? " " + t("Sold out: {names}", { names: unavailable.join(", ") }) : ""));
      navigate("/cart");
    },
    onError: () => toast(t("Could not add the products. Please try again."), "error"),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: (order) => {
      toast(t("Order #{id} cancelled. The items are back in stock.", { id: order.id }), "info");
      queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // stock came back
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="page-title">{t("My orders")}</h1>
        <p className="text-sm text-slate-500">{t("Newest first. Pending orders can still be cancelled.")}</p>
      </div>
      {orders.isLoading && <RowsSkeleton rows={3} />}
      {orders.isError && (
        <p className="text-danger-600">
          {t("Could not load your orders.")} {orders.error.message}
        </p>
      )}
      {cancel.isError && (
        <p className="alert-danger">
          {t("Could not cancel.")} {cancel.error.message}
        </p>
      )}
      {orders.data?.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">{t("You have no orders yet.")}</p>
          <p className="text-sm">{t("Your orders will appear here after you check out.")}</p>
        </div>
      )}

      {orders.data?.map((o) => (
        <div key={o.id} className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span className="font-semibold text-slate-900">{t("Order #{id}", { id: o.id })}</span>
            <OrderStatusBadge status={o.status} />
            <DeliveryBadge
              delivery={o.delivery}
              deliverBy={o.status === "CANCELLED" ? null : o.deliverBy}
              onTheWay={o.status === "PENDING" || o.status === "SHIPPED"}
            />
            <span className="ms-auto text-sm text-slate-500">{dateTime(o.createdAt)}</span>
          </div>
          <OrderTimeline order={o} />
          <ul className="divide-y divide-slate-100 border-t border-slate-100 px-5 text-sm">
            {o.items.map((i) => (
              <li key={i.productId} className="flex justify-between py-2">
                <span>
                  <span className="font-medium">{i.quantity} ×</span> {i.product.name}
                </span>
                <span className="text-slate-500">{t("{price} each", { price: money(i.unitPrice) })}</span>
              </li>
            ))}
          </ul>
          {o.address && (
            <p className="border-t border-slate-100 px-5 py-2.5 text-sm text-slate-600">
              <span aria-hidden="true">📍 </span>
              {t("Deliver to")}{" "}
              <span className="font-medium text-slate-900">
                {o.address}, {o.city}
              </span>{" "}
              · <span className="whitespace-nowrap">{o.phone}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <span className="font-semibold text-slate-900">
              {t("Total: {price}", { price: money(o.total) })}
              {Number(o.deliveryFee) > 0 && (
                <span className="ms-1 text-sm font-normal text-slate-500">{t("(incl. {price} delivery)", { price: money(o.deliveryFee) })}</span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <button disabled={buyAgain.isPending} onClick={() => buyAgain.mutate(o)} className="btn btn-outline py-1.5">
                {t("🔁 Buy again")}
              </button>
              {o.status === "PENDING" && (
                <button
                  disabled={cancel.isPending}
                  onClick={() => confirm(t("Cancel order #{id}?", { id: o.id })) && cancel.mutate(o.id)}
                  className="btn btn-danger py-1.5"
                >
                  {t("Cancel order")}
                </button>
              )}
            </div>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
            {t("Something wrong with this order?")}{" "}
            <Link to={`/help?topic=ORDER&order=${o.id}`} className="link">
              {t("Contact customer service")}
            </Link>
          </p>
        </div>
      ))}
    </div>
  );
}
