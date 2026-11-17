import type { Product } from "../api/types";
import { useT } from "../i18n/useT";
import { useCurrency } from "../currency/useCurrency";

const sizes = {
  sm: { now: "text-sm font-medium", was: "text-xs" },
  md: { now: "text-lg font-bold", was: "text-sm" },
  lg: { now: "text-3xl font-bold", was: "text-lg" },
};

// A product's price. During a sale: the sale price in red, the old price crossed out and "-30%".
export function Price({ product, size = "md" }: { product: Pick<Product, "price" | "salePrice" | "promotion">; size?: keyof typeof sizes }) {
  const { t } = useT();
  const { money } = useCurrency();
  const s = sizes[size];
  if (!product.salePrice) return <span className={`${s.now} text-slate-900`}>{money(product.price)}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`${s.now} text-sale-600`}>{money(product.salePrice)}</span>
      <del className={`${s.was} text-slate-400`}>
        <span className="sr-only">{t("was")} </span>
        {money(product.price)}
      </del>
      {product.promotion && (
        <span className="rounded-md bg-sale-600 px-1.5 py-0.5 text-xs font-bold text-white" title={product.promotion.name}>
          -{product.promotion.percent}%
        </span>
      )}
    </span>
  );
}
