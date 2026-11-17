import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { currenciesApi, type ExchangeRate } from "../api/currencies";
import { useT } from "../i18n/useT";
import { useToast } from "../toast/useToast";
import { timeAgo } from "../utils/format";

// Admin dashboard: the exchange rates the website uses to show prices in Lebanese pounds and euros.
// Prices and orders stay in US dollars; only what customers see changes.
export function RatesCard() {
  const { t } = useT();
  const rates = useQuery({ queryKey: ["currencies"], queryFn: currenciesApi.list, staleTime: 0 });
  const others = rates.data?.filter((r) => r.currency !== "USD") ?? [];

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <span aria-hidden="true">💱</span>
        <h2 className="font-semibold text-slate-900">{t("Exchange rates")}</h2>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm text-slate-600">{t("Prices are in US dollars. Customers can also see them in Lebanese pounds or euros, with these rates.")}</p>
        {rates.isError && (
          <p className="text-danger-600">
            {t("Could not load the rates.")} {rates.error.message}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((r) => (
            <RateForm key={`${r.currency}-${r.rate}`} rate={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RateForm({ rate }: { rate: ExchangeRate }) {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const [value, setValue] = useState(String(Number(rate.rate))); // "0.8700" -> "0.87", "89500" stays "89500"
  const currency = rate.currency as Exclude<ExchangeRate["currency"], "USD">;

  const save = useMutation({
    mutationFn: () => currenciesApi.setRate(currency, Number(value)),
    onSuccess: () => {
      toast(t("The {currency} rate is saved", { currency }));
      qc.invalidateQueries({ queryKey: ["currencies"] }); // every price on the website uses the new rate
    },
  });
  const valid = Number(value) > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-1.5"
    >
      <label htmlFor={`rate-${currency}`} className="label">
        {t("1 US dollar in {currency}", { currency })}
      </label>
      <div className="flex gap-2">
        <input
          id={`rate-${currency}`}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            save.reset();
          }}
          className="input"
        />
        <button disabled={!valid || save.isPending} className="btn btn-primary">
          {save.isPending ? t("Saving...") : t("Save")}
        </button>
      </div>
      {!valid && <p className="field-error">{t("Must be above 0")}</p>}
      {save.isError && <p className="field-error">{save.error.message}</p>}
      {rate.updatedAt && <p className="text-xs text-slate-500">{t("Updated {date}", { date: timeAgo(rate.updatedAt) })}</p>}
    </form>
  );
}
