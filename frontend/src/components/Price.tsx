import type { Product } from "../api/types";

const sizes = {
  sm: { now: "text-sm font-medium", was: "text-xs" },
  md: { now: "text-lg font-bold", was: "text-sm" },
  lg: { now: "text-3xl font-bold", was: "text-lg" },
};

// A product's price. During a sale: the sale price in red, the old price crossed out and "-30%".
export function Price({ product, size = "md" }: { product: Pick<Product, "price" | "salePrice" | "promotion">; size?: keyof typeof sizes }) {
  const s = sizes[size];
  if (!product.salePrice) return <span className={`${s.now} text-slate-900`}>${Number(product.price).toFixed(2)}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`${s.now} text-red-600`}>${Number(product.salePrice).toFixed(2)}</span>
      <del className={`${s.was} text-slate-400`}>
        <span className="sr-only">was </span>${Number(product.price).toFixed(2)}
      </del>
      {product.promotion && (
        <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white" title={product.promotion.name}>
          -{product.promotion.percent}%
        </span>
      )}
    </span>
  );
}
