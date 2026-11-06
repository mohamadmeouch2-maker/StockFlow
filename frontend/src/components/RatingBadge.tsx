import type { Rating } from "../api/types";

// "★ 8.5/10 (12)" or "No ratings yet". Colour: green for 8+, amber for 5-7.9, red below 5.
export function RatingBadge({ rating, size = "sm" }: { rating?: Rating; size?: "sm" | "lg" }) {
  if (!rating || rating.average === null) return <span className="text-xs whitespace-nowrap text-slate-400">No ratings yet</span>;

  const color = rating.average >= 8 ? "bg-emerald-600" : rating.average >= 5 ? "bg-amber-500" : "bg-red-500";
  const big = size === "lg";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`Rated ${rating.average} out of 10 by ${rating.count} customers`}>
      <span className={`rounded-md font-bold text-white ${color} ${big ? "px-2.5 py-1 text-lg" : "px-1.5 py-0.5 text-xs"}`}>
        ★ {rating.average.toFixed(1)}
        <span className="font-normal opacity-80">/10</span>
      </span>
      <span className={`text-slate-500 ${big ? "text-sm" : "text-xs"}`}>
        ({rating.count} {rating.count === 1 ? "rating" : "ratings"})
      </span>
    </span>
  );
}
