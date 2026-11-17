import { api } from "./client";

export type CurrencyCode = "USD" | "LBP" | "EUR";
// How much of this currency 1 US dollar is ("89500" for LBP). USD is always "1".
export type ExchangeRate = { currency: CurrencyCode; rate: string; updatedAt: string | null };

export const currenciesApi = {
  list: () => api<ExchangeRate[]>("core", "/api/currencies"),
  // Admin only
  setRate: (currency: Exclude<CurrencyCode, "USD">, rate: number) =>
    api<ExchangeRate>("core", `/api/currencies/${currency}`, { method: "PUT", body: JSON.stringify({ rate }) }),
};
