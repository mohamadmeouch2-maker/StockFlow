// Small helpers for showing numbers and dates the same way everywhere.

// 1234.5 -> "$1,234.50"
export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// "2026-11-06" -> a Date at midnight in the browser's time zone (new Date("2026-11-06") would use UTC).
export const dayToDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};
