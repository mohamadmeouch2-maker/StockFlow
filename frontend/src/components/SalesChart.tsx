import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Summary } from "../api/reports";
import { dayToDate } from "../utils/format";
import { useT } from "../i18n/useT";
import { useCurrency } from "../currency/useCurrency";

const BLUE = "#2563eb"; // the brand colour (brand-600 = Tailwind blue-600); checked for contrast on white
const BLUE_DARK = "#1d4ed8"; // the bar under the mouse
const GRID = "#e2e8f0"; // slate-200: thin and quiet
const TEXT = "#64748b"; // slate-500

// Admin dashboard: a column chart of sales per day (one column per day, the last 14 days).
// Recharts draws the SVG; we only describe the data and the look.
export function SalesChart({ days }: { days: Summary["salesByDay"] }) {
  const { t, locale } = useT();
  const { money, moneyCompact } = useCurrency();
  const data = days.map((d) => ({
    ...d,
    revenue: Number(d.revenue),
    label: dayToDate(d.date).toLocaleDateString(locale, { month: "short", day: "numeric" }), // "Nov 6"
  }));

  return (
    <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 640, height: 260 }}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: TEXT, fontSize: 12 }} minTickGap={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: TEXT, fontSize: 12 }}
          width={64}
          allowDecimals={false}
          tickFormatter={(v: number) => moneyCompact(v)}
        />
        <Tooltip
          cursor={{ fill: "#eff6ff" }} // a light blue band behind the day under the mouse
          content={({ active, payload }) => {
            const day = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !day) return null;
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                <p className="font-semibold text-slate-900">{money(day.revenue)}</p>
                <p className="text-slate-500">
                  {dayToDate(day.date).toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })} ·{" "}
                  {t("{count} orders", { count: day.orders })}
                </p>
              </div>
            );
          }}
        />
        {/* Thin columns with rounded tops, flat on the bottom line */}
        <Bar dataKey="revenue" name={t("Sales")} fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={24} activeBar={{ fill: BLUE_DARK }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
