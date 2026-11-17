import type { CurrencyCode } from "../api/currencies";

// Lebanese pounds have no cents in practice; dollars and euros do.
const DIGITS: Record<CurrencyCode, number> = { USD: 2, EUR: 2, LBP: 0 };

// A price in US dollars, shown in another currency and language:
//   formatMoney(12.5, "USD", 1, "en-US")      -> "$12.50"
//   formatMoney(12.5, "LBP", 89500, "en-US")  -> "LBP 1,118,750"
//   formatMoney(12.5, "EUR", 0.87, "fr-FR")   -> "10,88 €"
// compact: short numbers for chart axes ("$1.2K", "LBP 72M").
export function formatMoney(usd: number | string, currency: CurrencyCode, rate: number, locale: string, compact = false) {
  const digits = DIGITS[currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  }).format(Number(usd) * rate);
}
