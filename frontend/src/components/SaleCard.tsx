import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { promotionsApi } from "../api/promotions";
import { useToast } from "../toast/useToast";
import { shortDate } from "../utils/format";
import { useT } from "../i18n/useT";
import { t as translate } from "../i18n/core";

// Dec 31 of this year (as "2026-12-31" for the date field).
const newYearsEve = () => `${new Date().getFullYear()}-12-31`;
const errorText = (err: unknown) =>
  (err instanceof ApiError && err.details[0]?.message) || (err instanceof Error ? err.message : translate("Something went wrong"));

// Admin dashboard: start a sale on the products that sold too little, or end the sale that is on.
export function SaleCard() {
  const { t } = useT();
  const qc = useQueryClient();
  const toast = useToast();
  const sale = useQuery({ queryKey: ["promotion"], queryFn: promotionsApi.current, staleTime: 0 });
  const [form, setForm] = useState({ name: "Christmas Sale", percent: 30, maxSold: 5, days: 30, endsAt: newYearsEve() });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  // Prices change everywhere: product lists, product pages, favourites, the banner
  const refresh = () => ["promotion", "products", "product", "favorites"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const start = useMutation({
    mutationFn: () => promotionsApi.start(form),
    onSuccess: ({ promotion, products }) => {
      toast(t("{name} started: {count} products are {percent}% off", { name: promotion.name, count: products.length, percent: promotion.percent }));
      refresh();
    },
  });
  const end = useMutation({
    mutationFn: (id: number) => promotionsApi.end(id),
    onSuccess: () => {
      toast(t("The sale has ended. Prices are back to normal."), "info");
      refresh();
    },
    onError: (err) => toast(errorText(err), "error"),
  });

  const promo = sale.data;
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-red-50 to-emerald-50 px-5 py-3 dark:from-red-950/40 dark:to-emerald-950/40">
        <span aria-hidden="true">🎄</span>
        <h2 className="font-semibold text-slate-900">{t("Sale")}</h2>
      </div>

      {promo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-slate-700">
            <strong className="text-slate-900">{promo.name}</strong>{" "}
            {t("is on: -{percent}% on {count} products until {date}. Customers see a festive message when they open the shop.", {
              percent: promo.percent,
              count: promo.productCount ?? 0,
              date: shortDate(promo.endsAt),
            })}
          </p>
          <div className="flex gap-2">
            <Link to="/products?sale=1" className="btn btn-outline">
              {t("See the deals")}
            </Link>
            <button
              disabled={end.isPending}
              onClick={() => confirm(t("End the {name} now?", { name: promo.name })) && end.mutate(promo.id)}
              className="btn btn-danger"
            >
              {t("End sale")}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start.mutate();
          }}
          className="space-y-4 p-5"
        >
          <p className="text-sm text-slate-600">
            {t(
              "Give a discount on the products that didn't sell well: products in stock that sold fewer pieces than you choose, in the chosen number of days.",
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-5">
            <label className="sm:col-span-2">
              <span className="label">{t("Name")}</span>
              <input value={form.name} onChange={set("name")} required minLength={2} maxLength={60} className="input" />
            </label>
            <label>
              <span className="label">{t("Discount %")}</span>
              <input type="number" min={1} max={90} value={form.percent} onChange={set("percent")} required className="input" />
            </label>
            <label>
              <span className="label">{t("Sold fewer than")}</span>
              <input type="number" min={1} max={1000} value={form.maxSold} onChange={set("maxSold")} required className="input" />
            </label>
            <label>
              <span className="label">{t("In the last (days)")}</span>
              <input type="number" min={1} max={365} value={form.days} onChange={set("days")} required className="input" />
            </label>
            <label className="sm:col-span-2">
              <span className="label">{t("Ends on")}</span>
              <input type="date" value={form.endsAt} onChange={set("endsAt")} required className="input" />
            </label>
          </div>
          {start.isError && <p className="field-error">{errorText(start.error)}</p>}
          <button disabled={start.isPending} className="btn btn-primary">
            {start.isPending ? t("Starting...") : form.name ? t("Start {name}", { name: form.name }) : t("Start the sale")}
          </button>
        </form>
      )}
    </section>
  );
}
