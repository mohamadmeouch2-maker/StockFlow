import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../api/notifications";
import { useToast } from "../toast/useToast";
import { timeAgo } from "../utils/format";
import { ProductImage } from "./ProductImage";

// Admins: a bell with the number of unread stock alerts; the list opens on click.
// It asks the API for new alerts every 20 seconds, and new ones also pop up as messages.
export function NotificationBell() {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const alerts = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list, refetchInterval: 20_000 });
  const unread = alerts.data?.unread ?? 0;

  // Pop up the alerts that arrived since the last check. On the first load, only say how many are unread.
  const newestSeen = useRef<number | null>(null);
  useEffect(() => {
    const data = alerts.data;
    if (!data) return;
    if (newestSeen.current === null) {
      if (data.unread > 0) toast(`You have ${data.unread} unread stock alert${data.unread === 1 ? "" : "s"}`, "info");
    } else {
      const seen = newestSeen.current;
      const fresh = data.items.filter((n) => n.id > seen && !n.readAt).reverse(); // oldest first
      for (const n of fresh) toast(n.message, n.type === "OUT_OF_STOCK" ? "error" : "info");
    }
    newestSeen.current = Math.max(newestSeen.current ?? 0, data.items[0]?.id ?? 0);
  }, [alerts.data, toast]);

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

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Stock alerts, ${unread} unread`}
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
          <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] leading-5 font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-900">Stock alerts</span>
            {unread > 0 && (
              <button onClick={() => readAll.mutate()} disabled={readAll.isPending} className="text-sm font-medium text-blue-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          {alerts.data?.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">No alerts. Every product has enough stock.</p>}
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {alerts.data?.items.map((n) => (
              <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.readAt ? "" : "bg-blue-50/60"}`}>
                <ProductImage src={n.product.imageUrl} alt={n.product.name} className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span aria-hidden="true">{n.type === "OUT_OF_STOCK" ? "⛔ " : "📦 "}</span>
                    {n.message}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="text-slate-400">{timeAgo(n.createdAt)}</span>
                    <Link
                      to={`/admin/products/${n.productId}/edit`}
                      onClick={() => {
                        if (!n.readAt) readOne.mutate(n.id);
                        setOpen(false);
                      }}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Restock
                    </Link>
                  </div>
                </div>
                {!n.readAt && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600">
                    <span className="sr-only">Unread</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Link
            to="/admin/low-stock"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-slate-50"
          >
            See the low-stock list →
          </Link>
        </div>
      )}
    </div>
  );
}
