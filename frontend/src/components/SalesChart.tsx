import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Summary } from "../api/reports";
import { dayToDate } from "../utils/format";
import { useT } from "../i18n/useT";
import { useCurrency } from "../currency/useCurrency";
import { useTheme } from "../theme/theme";

const BLUE = "#2563eb"; // the brand colour (brand-600 = Tailwind blue-600); checked for contrast on white
// The chart draws with colour values, not class names, so it picks them for light or dark mode
const LOOKS = {
  light: { active: "#1d4ed8", grid: "#e2e8f0", text: "#64748b", band: "#eff6ff" }, // blue-700, slate-200, slate-500, blue-50
  dark: { active: "#3b82f6", grid: "#334155", text: "#94a3b8", band: "rgba(37, 99, 235, 0.18)" }, // blue-500, slate-700, slate-400
};

// Admin dashboard: a column chart of sales per day (one column per day, the last 14 days).
// Recharts draws the SVG; we only describe the data and the look.
export function SalesChart({ days }: { days: Summary["salesByDay"] }) {
  const { t, locale } = useT();
  const { money, moneyCompact } = useCurrency();
  const look = LOOKS[useTheme().theme]; // the bar under the mouse, the grid lines, the labels, the band behind a day
  const data = days.map((d) => ({
    ...d,
    revenue: Number(d.revenue),
    label: dayToDate(d.date).toLocaleDateString(locale, { month: "short", day: "numeric" }), // "Nov 6"
  }));

  return (
    <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 640, height: 260 }}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={look.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: look.grid }} tick={{ fill: look.text, fontSize: 12 }} minTickGap={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: look.text, fontSize: 12 }}
          width={64}
          allowDecimals={false}
          tickFormatter={(v: number) => moneyCompact(v)}
        />
        <Tooltip
          cursor={{ fill: look.band }} // a light blue band behind the day under the mouse
          content={({ active, payload }) => {
            const day = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !day) return null;
            return (
              <div className="rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm shadow-md">
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
        <Bar dataKey="revenue" name={t("Sales")} fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={24} activeBar={{ fill: look.active }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
