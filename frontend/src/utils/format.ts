// Small helpers for showing numbers and dates the same way everywhere.

// 1234.5 -> "$1,234.50"
export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// "2026-11-06" -> a Date at midnight in the browser's time zone (new Date("2026-11-06") would use UTC).
export const dayToDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "just now", "5 min ago", "3 h ago", "2 days ago"
export const timeAgo = (iso: string, now = Date.now()) => {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

// "Thu, Nov 12"
export const shortDate = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// Today + n days, e.g. the last day a delivery should arrive.
export const addDays = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
};

// The price a customer pays now: the sale price during a sale, otherwise the normal price.
export const effectivePrice = (p: { price: string; salePrice?: string | null }) => Number(p.salePrice ?? p.price);
