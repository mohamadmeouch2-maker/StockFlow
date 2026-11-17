import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { currenciesApi, type CurrencyCode } from "../api/currencies";
import { useT } from "../i18n/useT";
import { CurrencyContext } from "./currencyContext";
import { formatMoney } from "./money";

const STORAGE_KEY = "currency";

function savedCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" || saved === "LBP" || saved === "EUR") return saved;
  } catch {
    // private mode or blocked storage: US dollars
  }
  return "USD";
}

// The currency prices are shown in (the 💲 button in the top bar), remembered on this browser.
// Prices and orders stay in US dollars: only what is shown is converted, with the admin's exchange rates.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale } = useT();
  const [chosen, setChosen] = useState<CurrencyCode>(savedCurrency);
  const rates = useQuery({ queryKey: ["currencies"], queryFn: currenciesApi.list, staleTime: 5 * 60_000 });

  const setCurrency = useCallback((currency: CurrencyCode) => {
    setChosen(currency);
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // not remembered, but the prices still change
    }
  }, []);

  const value = useMemo(() => {
    // Until the rates are loaded (or if they can't be), prices are shown in US dollars
    const found = rates.data?.find((r) => r.currency === chosen);
    const currency = found ? chosen : "USD";
    const rate = found ? Number(found.rate) : 1;
    return {
      currency,
      chosen,
      setCurrency,
      rate,
      rates: rates.data ?? [],
      money: (usd: number | string) => formatMoney(usd, currency, rate, locale),
      moneyCompact: (usd: number) => formatMoney(usd, currency, rate, locale, true),
    };
  }, [chosen, rates.data, setCurrency, locale]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
