import type { Rating } from "../api/types";
import { useT } from "../i18n/useT";

// "★ 8.5/10 (12)" or "No ratings yet". One calm style, like each review's score:
// red and green already mean "problem" and "OK" on this website, so a rating doesn't use them.
export function RatingBadge({ rating, size = "sm" }: { rating?: Rating; size?: "sm" | "lg" }) {
  const { t } = useT();
  if (!rating || rating.average === null) return <span className="text-xs whitespace-nowrap text-slate-400">{t("No ratings yet")}</span>;

  const big = size === "lg";
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title={t("Rated {average} out of 10 by {count} customers", { average: rating.average, count: rating.count })}
    >
      <span className={`rounded-md bg-slate-900 font-bold text-slate-50 ${big ? "px-2.5 py-1 text-lg" : "px-1.5 py-0.5 text-xs"}`}>
        <span className="text-warning-400">★</span> {rating.average.toFixed(1)}
        <span className="font-normal opacity-80">/10</span>
      </span>
      <span className={`text-slate-500 ${big ? "text-sm" : "text-xs"}`}>{t("({count} ratings)", { count: rating.count })}</span>
    </span>
  );
}
