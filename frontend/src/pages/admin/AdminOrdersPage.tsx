import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ordersApi } from "../../api/orders";
import type { Order, OrderStatus } from "../../api/types";
import { DeliveryBadge } from "../../components/DeliveryBadge";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { Pagination } from "../../components/Pagination";
import { RowsSkeleton } from "../../components/Skeleton";
import { useToast } from "../../toast/useToast";
import { useT } from "../../i18n/useT";
import { msg } from "../../i18n/core";
import { dateTime } from "../../utils/format";
import { useCurrency } from "../../currency/useCurrency";

// FR-12 (guide 4.11): all orders with a status filter. Each row shows only the valid next actions.
const actions: Record<OrderStatus, { label: string; status: Exclude<OrderStatus, "PENDING"> }[]> = {
  PENDING: [
    { label: msg("Mark shipped"), status: "SHIPPED" },
    { label: msg("Cancel"), status: "CANCELLED" },
  ],
  SHIPPED: [{ label: msg("Mark delivered"), status: "DELIVERED" }],
  DELIVERED: [],
  CANCELLED: [],
};

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus>();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { money } = useCurrency();
  const { t } = useT();
  // 20 orders per page, newest first
  const orders = useQuery({
    queryKey: ["orders", "all", status, page],
    queryFn: () => ordersApi.all(status, page),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
  const d = orders.data;
  const totalPages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const showing =
    d && d.total > 0
      ? t("Showing {from}–{to} of {count} orders", { from: (d.page - 1) * d.pageSize + 1, to: (d.page - 1) * d.pageSize + d.items.length, count: d.total })
      : "";

  const change = useMutation({
    mutationFn: ({ id, next }: { id: number; next: Exclude<OrderStatus, "PENDING"> }) => ordersApi.setStatus(id, next),
    onSuccess: (order) => {
      toast(t("Order #{id} is now: {status}", { id: order.id, status: t(order.status.charAt(0) + order.status.slice(1).toLowerCase()) }));
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
          <h1 className="page-title">{t("Manage orders")}</h1>
          <p className="text-sm text-slate-500">{showing}</p>
        </div>
        <select
          aria-label={t("Filter by status")}
          value={status ?? ""}
          onChange={(e) => {
            setStatus((e.target.value || undefined) as OrderStatus | undefined);
            setPage(1); // a new filter starts on its first page
          }}
          className="input w-auto"
        >
          <option value="">{t("All statuses")}</option>
          <option value="PENDING">{t("Pending")}</option>
          <option value="SHIPPED">{t("Shipped")}</option>
          <option value="DELIVERED">{t("Delivered")}</option>
          <option value="CANCELLED">{t("Cancelled")}</option>
        </select>
      </div>

      {orders.isLoading && <RowsSkeleton />}
      {orders.isError && (
        <p className="text-danger-600">
          {t("Could not load orders.")} {orders.error.message}
        </p>
      )}
      {change.isError && (
        <p className="alert-danger">
          {t("Could not change the status.")} {change.error.message}
        </p>
      )}
      {d?.items.length === 0 && <div className="card p-10 text-center text-slate-500">{t("No orders with this status.")}</div>}

      {!!d?.items.length && (
        <div className="data-table-wrap">
          {/* On a phone each order is a card (see .data-table-cards) */}
          <table className="data-table data-table-cards">
            <thead>
              <tr>
                <th>{t("Order")}</th>
                <th>{t("Customer")}</th>
                <th>{t("Items")}</th>
                <th>{t("Total")}</th>
                <th>{t("Delivery")}</th>
                <th>{t("Status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="font-medium text-slate-900">#{o.id}</span>
                    <div className="text-xs text-slate-500">{dateTime(o.createdAt)}</div>
                  </td>
                  <td data-label={t("Customer")} className="max-w-60">
                    <span className="font-medium text-slate-900">{o.user?.name ?? o.userId}</span>
                    {/* Where to deliver; tap the number to call the customer */}
                    {o.address ? (
                      <>
                        <a href={`tel:${(o.phone ?? "").replace(/[\s-]/g, "")}`} className="link block text-xs whitespace-nowrap">
                          {o.phone}
                        </a>
                        <div className="text-xs text-slate-500">
                          {o.address}, {o.city}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400">{t("No address (older order)")}</div>
                    )}
                  </td>
                  <td data-label={t("Items")} className="cell-wide">
                    {items(o)}
                  </td>
                  <td data-label={t("Total")}>{money(o.total)}</td>
                  {/* On a phone: Total and Status side by side, then the (long) delivery badge across the card, then the buttons */}
                  <td data-label={t("Delivery")} className="cell-wide max-md:order-1">
                    {/* Express orders first: they must arrive the next day */}
                    <DeliveryBadge delivery={o.delivery} deliverBy={o.status === "PENDING" || o.status === "SHIPPED" ? o.deliverBy : null} onTheWay />
                  </td>
                  <td data-label={t("Status")}>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  {/* (no buttons for delivered or cancelled orders: then the cell is hidden on a phone) */}
                  <td className="cell-wide space-x-2 whitespace-nowrap max-md:order-2 max-md:empty:hidden md:text-end">
                    {actions[o.status].map((a) => (
                      <button
                        key={a.status}
                        disabled={change.isPending}
                        onClick={() => change.mutate({ id: o.id, next: a.status })}
                        className={a.status === "CANCELLED" ? "btn btn-danger px-3 py-1" : "btn btn-primary px-3 py-1"}
                      >
                        {t(a.label)}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" }); // start reading the new page from the top
          }}
        />
      )}
    </div>
  );
}
