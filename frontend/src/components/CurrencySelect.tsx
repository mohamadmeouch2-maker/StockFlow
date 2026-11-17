import type { CurrencyCode } from "../api/currencies";
import { useCurrency } from "../currency/useCurrency";
import { useT } from "../i18n/useT";

const OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: "USD", label: "$ USD" },
  { code: "LBP", label: "LBP" },
  { code: "EUR", label: "€ EUR" },
];

// The currency button in the top bar: prices in US dollars, Lebanese pounds or euros. The choice is remembered.
export function CurrencySelect() {
  const { chosen, setCurrency } = useCurrency();
  const { t } = useT();
  return (
    <label className="flex items-center rounded-lg px-1 py-1 text-sm text-slate-600 transition hover:bg-slate-100">
      <span className="sr-only">{t("Currency")}</span>
      <select
        value={chosen}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className="cursor-pointer bg-transparent py-1 font-medium text-slate-700 outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
