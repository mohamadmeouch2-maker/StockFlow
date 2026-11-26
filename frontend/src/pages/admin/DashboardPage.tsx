import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { reportsApi, type Summary } from "../../api/reports";
import type { OrderStatus } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { ProductImage } from "../../components/ProductImage";
import { RatesCard } from "../../components/RatesCard";
import { SaleCard } from "../../components/SaleCard";
import { SalesChart } from "../../components/SalesChart";
import { DashboardSkeleton } from "../../components/Skeleton";
import { dayToDate } from "../../utils/format";
import { useT } from "../../i18n/useT";
import { useCurrency } from "../../currency/useCurrency";
import { useToast } from "../../toast/useToast";
import { downloadFile, toCsv, today } from "../../utils/csv";

const PERIODS = [7, 14, 30]; // days the admin can choose; 30 is the default (FR-14)

// The admin's home page: how the store is doing, at a glance.
export function DashboardPage() {
  const { t, locale } = useT();
  const [days, setDays] = useState(30);
  const summary = useQuery({
    queryKey: ["reports", "summary", days],
    queryFn: () => reportsApi.summary(days),
    staleTime: 0, // fresh numbers every time the page is opened
    placeholderData: keepPreviousData, // keep the old numbers on screen while the new period loads
  });
  const s = summary.data;
  const today = new Date().toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("Dashboard")}</h1>
          <p className="text-sm text-slate-500">
            {t("How the store is doing")} · {today}
          </p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          {t("+ New product")}
        </Link>
      </div>

      {summary.isLoading && <DashboardSkeleton />}
      {summary.isError && (
        <p className="text-danger-600">
          {t("Could not load the dashboard.")} {summary.error.message}
        </p>
      )}
      {s && <Dashboard s={s} days={days} onDays={setDays} updating={summary.isPlaceholderData} />}
    </div>
  );
}

type DashboardProps = { s: Summary; days: number; onDays: (days: number) => void; updating: boolean };

function Dashboard({ s, days, onDays, updating }: DashboardProps) {
  const { t, locale } = useT();
  const { money } = useCurrency();
  // This week (the last 7 days) compared with the 7 days before it.
  const sales = Number(s.thisWeek.revenue);
  const before = Number(s.lastWeek.revenue);
  const change = before > 0 ? Math.round(((sales - before) / before) * 100) : null;
  const allOrders = Object.values(s.ordersByStatus).reduce((a, b) => a + b, 0);
  const bestSold = s.bestSellers[0]?.sold ?? 0;
  const toast = useToast();

  // "Download sales for Excel": every product's sales in the chosen period, the best first, and a total.
  // In US dollars, without the delivery fees (they are not a product) and without cancelled orders.
  const download = useMutation({
    mutationFn: () => reportsApi.salesByProduct(days),
    onSuccess: ({ products }) => {
      const header = [t("Product"), t("Category"), t("Pieces sold"), t("Sales (USD)"), t("Stock")];
      const rows = products.map((p) => [p.name, p.category, p.sold, Number(p.revenue), p.stock]);
      const pieces = products.reduce((n, p) => n + p.sold, 0);
      const cents = products.reduce((n, p) => n + Math.round(Number(p.revenue) * 100), 0); // added up in cents: no rounding errors
      downloadFile(`stockflow-sales-${days}-days-${today()}.csv`, toCsv([header, ...rows, [t("Total"), "", pieces, cents / 100, ""]]));
    },
    onError: (err) => toast(`${t("Could not download the file.")} ${err.message}`, "error"),
  });

  return (
    <>
      {/* The four main numbers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("Sales, last 7 days")}
          icon="💵"
          value={money(sales)}
          note={
            change === null ? (
              <span className="text-slate-500">{t("No sales the week before")}</span>
            ) : (
              <span className={change >= 0 ? "text-success-700" : "text-danger-600"}>
                {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% <span className="text-slate-500">{t("vs the week before")}</span>
              </span>
            )
          }
        />
        <StatTile
          label={t("Orders, last 7 days")}
          icon="🧾"
          value={String(s.thisWeek.orders)}
          to="/admin/orders"
          note={<span className="text-slate-500">{t("{count} the week before", { count: s.lastWeek.orders })}</span>}
        />
        <StatTile
          label={t("Need restocking")}
          icon="📦"
          value={String(s.products.lowStock)}
          to="/admin/low-stock"
          note={
            s.products.soldOut > 0 ? (
              <span className="text-warning-700">⚠ {t("{count} sold out", { count: s.products.soldOut })}</span>
            ) : (
              <span className="text-slate-500">{t("of {count} products", { count: s.products.total })}</span>
            )
          }
        />
        <StatTile
          label={t("Customer messages")}
          icon="💬"
          value={String(s.openIssues)}
          to="/admin/support"
          note={
            s.openIssues > 0 ? (
              <span className="text-warning-700">⚠ {t("Waiting for an answer")}</span>
            ) : (
              <span className="text-success-700">✓ {t("All answered")}</span>
            )
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SaleCard />
        <RatesCard />
      </div>

      {/* The period: everything below shows only these days */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("Period")}>
          <span className="me-1 text-sm font-medium text-slate-600">{t("Show:")}</span>
          {PERIODS.map((d) => (
            <button
              key={d}
              aria-pressed={days === d}
              onClick={() => onDays(d)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                days === d
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-slate-300 bg-surface text-slate-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {t("Last {count} days", { count: d })}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => download.mutate()} disabled={download.isPending} className="btn btn-outline">
          <span aria-hidden="true">⬇</span>
          {download.isPending ? t("Preparing the file...") : t("Download sales for Excel")}
        </button>
      </div>

      {/* Fades a little while a new period loads, instead of jumping */}
      <div className={`space-y-6 transition-opacity ${updating ? "opacity-60" : ""}`}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sales per day (FR-14) */}
          <section className="card p-5 lg:col-span-2">
            <h2 className="font-semibold text-slate-900">{t("Sales per day")}</h2>
            <p className="mb-4 text-sm text-slate-500">{t("Cancelled orders are not counted. Point at a day to see its numbers.")}</p>
            <SalesChart days={s.salesByDay} />
            {/* The same numbers as a table, for people who can't see the chart */}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-brand-600 hover:underline">{t("Show as a table")}</summary>
              <table className="data-table mt-2">
                <thead>
                  <tr>
                    <th>{t("Day")}</th>
                    <th>{t("Orders")}</th>
                    <th>{t("Sales")}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.salesByDay.map((d) => (
                    <tr key={d.date}>
                      <td>{dayToDate(d.date).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}</td>
                      <td>{d.orders}</td>
                      <td className="tabular-nums">{money(Number(d.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          {/* Orders by status */}
          <section className="card flex flex-col p-5">
            <h2 className="font-semibold text-slate-900">{t("Orders by status")}</h2>
            <p className="mb-4 text-sm text-slate-500">{t("{count} orders in the last {days} days", { count: allOrders, days: s.days })}</p>
            <ul className="space-y-4">
              {(Object.keys(s.ordersByStatus) as OrderStatus[]).map((status) => (
                <li key={status}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <OrderStatusBadge status={status} />
                    <span className="font-semibold text-slate-900">{s.ordersByStatus[status]}</span>
                  </div>
                  <Meter value={s.ordersByStatus[status]} max={allOrders} />
                </li>
              ))}
            </ul>
            <Link to="/admin/orders" className="link mt-auto pt-4 text-sm">
              {t("Manage orders →")}
            </Link>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Best sellers: the top 5 (FR-15) */}
          <section className="card p-5 lg:col-span-2">
            <h2 className="font-semibold text-slate-900">{t("Best sellers")}</h2>
            <p className="mb-4 text-sm text-slate-500">{t("Pieces sold in the last {days} days", { days: s.days })}</p>
            {s.bestSellers.length === 0 && <p className="text-sm text-slate-500">{t("No sales in this period.")}</p>}
            <ol className="space-y-3">
              {s.bestSellers.map((b, i) => (
                <li key={b.productId} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-semibold text-slate-400">{i + 1}</span>
                  <ProductImage src={b.imageUrl} alt={b.name} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <Link to={`/products/${b.productId}`} className="truncate font-medium text-slate-900 hover:text-brand-700">
                        {b.name}
                      </Link>
                      <span className="whitespace-nowrap text-slate-500">{t("{count} sold", { count: b.sold })}</span>
                    </div>
                    <Meter value={b.sold} max={bestSold} />
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Shortcuts */}
          <section className="card flex flex-col gap-2 p-5">
            <h2 className="mb-2 font-semibold text-slate-900">{t("Quick actions")}</h2>
            <Link to="/admin/products/new" className="btn btn-primary">
              {t("+ Add a product")}
            </Link>
            <Link to="/admin/categories" className="btn btn-outline">
              {t("Manage categories")}
            </Link>
            <Link to="/admin/low-stock" className="btn btn-outline">
              {t("Restock low items ({count})", { count: s.products.lowStock })}
            </Link>
            <Link to="/admin/support" className="btn btn-outline">
              {t("Answer customers ({count})", { count: s.openIssues })}
            </Link>
            <Link to="/products" className="btn btn-outline">
              {t("See the shop as customers do")}
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

// One of the four number boxes at the top. With "to", the whole box is a link.
function StatTile({ label, icon, value, note, to }: { label: string; icon: string; value: string; note: ReactNode; to?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm">{note}</p>
    </>
  );
  return to ? (
    <Link to={to} className="card card-hover block p-5">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}

// A thin bar: how big this number is next to the biggest one.
function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}
