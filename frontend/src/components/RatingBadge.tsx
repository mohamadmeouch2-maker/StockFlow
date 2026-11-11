import type { Rating } from "../api/types";

// "★ 8.5/10 (12)" or "No ratings yet". One calm style, like each review's score:
// red and green already mean "problem" and "OK" on this website, so a rating doesn't use them.
export function RatingBadge({ rating, size = "sm" }: { rating?: Rating; size?: "sm" | "lg" }) {
  if (!rating || rating.average === null) return <span className="text-xs whitespace-nowrap text-slate-400">No ratings yet</span>;

  const big = size === "lg";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`Rated ${rating.average} out of 10 by ${rating.count} customers`}>
      <span className={`rounded-md bg-slate-900 font-bold text-white ${big ? "px-2.5 py-1 text-lg" : "px-1.5 py-0.5 text-xs"}`}>
        <span className="text-warning-400">★</span> {rating.average.toFixed(1)}
        <span className="font-normal opacity-80">/10</span>
      </span>
      <span className={`text-slate-500 ${big ? "text-sm" : "text-xs"}`}>
        ({rating.count} {rating.count === 1 ? "rating" : "ratings"})
      </span>
    </span>
  );
}
