import type { Product } from "../api/types";

// FR-05 stock status: 0 = Out of stock, at or below the reorder level = Low stock.
export function StockBadge({ product }: { product: Pick<Product, "stock" | "reorderLevel"> }) {
  const [label, color] =
    product.stock === 0
      ? ["Out of stock", "bg-red-100 text-red-700"]
      : product.stock <= product.reorderLevel
        ? ["Low stock", "bg-yellow-100 text-yellow-800"]
        : ["In stock", "bg-green-100 text-green-700"];

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}
