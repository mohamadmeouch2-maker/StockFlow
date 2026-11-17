import { createContext } from "react";
import type { CurrencyCode, ExchangeRate } from "../api/currencies";
import { currentLocale } from "../i18n/core";
import { formatMoney } from "./money";

export type CurrencyState = {
  currency: CurrencyCode; // the currency prices are shown in right now
  chosen: CurrencyCode; // what the visitor picked (shown once its rate is loaded)
  setCurrency: (currency: CurrencyCode) => void;
  rate: number; // how much of `currency` 1 US dollar is
  rates: ExchangeRate[];
  money: (usd: number | string) => string; // "$12.50", "LBP 1,118,750", "10,88 €"
  moneyCompact: (usd: number) => string; // "$1.2K", for chart axes
};

// Outside CurrencyProvider (e.g. in tests) prices are in US dollars.
export const CurrencyContext = createContext<CurrencyState>({
  currency: "USD",
  chosen: "USD",
  setCurrency: () => {},
  rate: 1,
  rates: [],
  money: (usd) => formatMoney(usd, "USD", 1, currentLocale()),
  moneyCompact: (usd) => formatMoney(usd, "USD", 1, currentLocale(), true),
});
