import { useQuery } from "@tanstack/react-query";
import { promotionsApi } from "../api/promotions";
import { shortDate } from "../utils/format";
import { Snow } from "./ChristmasSalePopup";

// On the products page while a sale is on: "Christmas Sale: 30% off 11 products" + a button to see only those.
export function SaleBanner({ showingDeals, onToggle }: { showingDeals: boolean; onToggle: () => void }) {
  const sale = useQuery({ queryKey: ["promotion"], queryFn: promotionsApi.current, staleTime: 60_000 });
  const promo = sale.data;
  if (!promo) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-emerald-700 p-5 text-white shadow-md">
      <Snow count={10} />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">
            🎁
          </span>
          <div>
            <p className="text-lg font-bold">
              {promo.name}: {promo.percent}% off {promo.productCount} products
            </p>
            <p className="text-sm text-white/80">Until {shortDate(promo.endsAt)}, while stocks last</p>
          </div>
        </div>
        <button onClick={onToggle} aria-pressed={showingDeals} className="btn bg-white font-semibold text-red-700 hover:bg-amber-50">
          {showingDeals ? "Show all products" : "Show the deals 🎄"}
        </button>
      </div>
    </div>
  );
}
