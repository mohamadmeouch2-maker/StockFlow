import type { NotificationType } from "@prisma/client";

type StockChange = { name: string; stock: number; reorderLevel: number }; // stock = AFTER the order

// Should an order that took `sold` pieces of this product create an alert for the admins?
// Only when the stock CROSSES a line, so admins get one alert, not one per order:
// - it reached 0 -> "sold out"
// - it went from above the reorder level to at or below it -> "low on stock"
export function stockAlert(product: StockChange, sold: number): { type: NotificationType; message: string } | null {
  const before = product.stock + sold;
  if (product.stock === 0) return { type: "OUT_OF_STOCK", message: `${product.name} is sold out` };
  if (before > product.reorderLevel && product.stock <= product.reorderLevel)
    return { type: "LOW_STOCK", message: `${product.name} is low on stock: ${product.stock} left (reorder level ${product.reorderLevel})` };
  return null;
}
