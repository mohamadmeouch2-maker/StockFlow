import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../api/notifications";
import type { Notification, Role } from "../api/types";
import { useToast } from "../toast/useToast";
import { timeAgo } from "../utils/format";
import { ProductImage } from "./ProductImage";
import { useT } from "../i18n/useT";
import { msg, translateServer } from "../i18n/core";

// What each kind of notification shows: an icon (or the product photo), and where its link goes.
function show(n: Notification): { icon: string; to: string; action: string } {
  switch (n.type) {
    case "LOW_STOCK":
      return { icon: "📦", to: `/admin/products/${n.productId}/edit`, action: msg("Restock") };
    case "OUT_OF_STOCK":
      return { icon: "⛔", to: `/admin/products/${n.productId}/edit`, action: msg("Restock") };
    case "SUPPORT_MESSAGE":
      return { icon: "💬", to: "/admin/support", action: msg("Answer") };
    case "SUPPORT_ANSWER":
      return { icon: "💬", to: "/help", action: msg("Read the answer") };
    case "ORDER_SHIPPED":
      return { icon: "🚚", to: "/orders", action: msg("See the order") };
    case "ORDER_DELIVERED":
      return { icon: "✅", to: "/orders", action: msg("See the order") };
    case "ORDER_CANCELLED":
      return { icon: "❌", to: "/orders", action: msg("See the order") };
    case "BACK_IN_STOCK":
      return { icon: "🔔", to: `/products/${n.productId}`, action: msg("See the product") };
  }
}

// The bell in the top bar, with the number of unread notifications; the list opens on click.
//   Admins: stock alerts (Restock) and customer service messages (Answer), shared by all admins.
//   Customers: their order news (shipped, delivered, cancelled by the store), customer service answers,
//   and the sold-out products they waited for that are back in stock.
// It asks the API for new ones every 20 seconds, and new ones also pop up as messages.
export function NotificationBell({ role }: { role: Role }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const alerts = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list, refetchInterval: 20_000 });
  const unread = alerts.data?.unread ?? 0;
  const admin = role === "ADMIN";

  // Pop up the notifications that arrived since the last check. On the first load, only say how many are unread.
  const newestSeen = useRef<number | null>(null);
  useEffect(() => {
    const data = alerts.data;
    if (!data) return;
    if (newestSeen.current === null) {
      if (data.unread > 0) toast(t("You have {count} unread notifications", { count: data.unread }), "info");
    } else {
      const seen = newestSeen.current;
      const fresh = data.items.filter((n) => n.id > seen && !n.readAt).reverse(); // oldest first
      for (const n of fresh) toast(translateServer(n.message), n.type === "OUT_OF_STOCK" ? "error" : "info");
      // Update the pages they are about at once: Customer service (and the number in the menu), My orders
      if (fresh.some((n) => n.type === "SUPPORT_MESSAGE" || n.type === "SUPPORT_ANSWER")) qc.invalidateQueries({ queryKey: ["support"] });
      if (fresh.some((n) => n.type.startsWith("ORDER_"))) qc.invalidateQueries({ queryKey: ["orders"] });
      // Back in stock: the product shows its new stock, and the customer no longer waits for it
      if (fresh.some((n) => n.type === "BACK_IN_STOCK")) for (const key of ["product", "products", "stock-alerts"]) qc.invalidateQueries({ queryKey: [key] });
    }
    newestSeen.current = Math.max(newestSeen.current ?? 0, data.items[0]?.id ?? 0);
  }, [alerts.data, toast, qc, t]);

  // Close the list when clicking outside it or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const readOne = useMutation({ mutationFn: notificationsApi.read, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: refresh });

  // The two links at the bottom of the list
  const footer = admin
    ? [
        { to: "/admin/low-stock", label: t("Low stock →") },
        { to: "/admin/support", label: t("Customer service →") },
      ]
    : [
        { to: "/orders", label: t("My orders →") },
        { to: "/help", label: t("Customer service →") },
      ];

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("Notifications, {count} unread", { count: unread })}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span dir="ltr" className="absolute -top-0.5 -end-0.5 min-w-5 rounded-full bg-danger-600 px-1 text-center text-[11px] leading-5 font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-900">{t("Notifications")}</span>
            {unread > 0 && (
              <button onClick={() => readAll.mutate()} disabled={readAll.isPending} className="text-sm font-medium text-brand-600 hover:underline">
                {t("Mark all as read")}
              </button>
            )}
          </div>

          {alerts.data?.items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              {admin
                ? t("No notifications. Stock is fine and nobody is waiting for an answer.")
                : t("No notifications yet. We will tell you here when your order is on its way or customer service answers you.")}
            </p>
          )}
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {alerts.data?.items.map((n) => {
              const { icon, to, action } = show(n);
              return (
                <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.readAt ? "" : "bg-brand-50/60"}`}>
                  {n.product ? (
                    <ProductImage src={n.product.imageUrl} alt={n.product.name} className="h-10 w-10 shrink-0" />
                  ) : (
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg">
                      {icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      {n.product && <span aria-hidden="true">{icon} </span>}
                      {translateServer(n.message)}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <span className="text-slate-400">{timeAgo(n.createdAt)}</span>
                      <Link
                        to={to}
                        onClick={() => {
                          if (!n.readAt) readOne.mutate(n.id);
                          setOpen(false);
                        }}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {t(action)}
                      </Link>
                    </div>
                  </div>
                  {!n.readAt && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600">
                      <span className="sr-only">{t("Unread")}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 text-center text-sm font-medium text-brand-600">
            {footer.map((f) => (
              <Link key={f.to} to={f.to} onClick={() => setOpen(false)} className="px-4 py-2.5 hover:bg-slate-50">
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
