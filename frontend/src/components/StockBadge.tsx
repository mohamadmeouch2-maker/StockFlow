import type { Product } from "../api/types";

// FR-05 stock status: 0 = Out of stock, at or below the reorder level = Low stock.
export function StockBadge({ product }: { product: Pick<Product, "stock" | "reorderLevel"> }) {
  const [label, color, dot] =
    product.stock === 0
      ? ["Out of stock", "bg-red-50 text-red-700 ring-red-200", "bg-red-500"]
      : product.stock <= product.reorderLevel
        ? ["Low stock", "bg-amber-50 text-amber-800 ring-amber-200", "bg-amber-500"]
        : ["In stock", "bg-emerald-50 text-emerald-700 ring-emerald-200", "bg-emerald-500"];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
