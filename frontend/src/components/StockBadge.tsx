import type { Product } from "../api/types";

// FR-05 stock status: 0 = Out of stock, at or below the reorder level = Low stock.
export function StockBadge({ product }: { product: Pick<Product, "stock" | "reorderLevel"> }) {
  const [label, color, dot] =
    product.stock === 0
      ? ["Out of stock", "badge-neutral", "bg-slate-400"] // a state, not an error: grey like other "stopped" things
      : product.stock <= product.reorderLevel
        ? ["Low stock", "badge-warning", "bg-warning-500"]
        : ["In stock", "badge-success", "bg-success-500"];

  return (
    <span className={`badge ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
