import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { productsApi } from "../api/products";
import { useT } from "../i18n/useT";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { RatingBadge } from "./RatingBadge";

// "You may also like" under a product: 4 other products in stock. The server chooses them:
// the ones most often bought together with this one first, then the same category, then the most viewed.
export function SimilarProducts({ productId }: { productId: number }) {
  const { t } = useT();
  const similar = useQuery({ queryKey: ["product", productId, "similar"], queryFn: () => productsApi.similar(productId) });
  if (!similar.data?.length) return null; // loading, failed or nothing to suggest: no empty box

  return (
    <section aria-labelledby="similar-title" className="space-y-3">
      <h2 id="similar-title" className="text-lg font-semibold text-slate-900">
        {t("You may also like")}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {similar.data.map((p) => (
          <li key={p.id} className="card card-hover group relative flex flex-col p-3">
            <div className="relative rounded-lg bg-slate-50 p-2">
              <ProductImage src={p.imageUrl} alt={p.name} className="aspect-square w-full" />
              {p.salePrice && (
                <span className="absolute top-1 start-1 rounded-full bg-sale-600 px-2 py-0.5 text-xs font-bold text-white shadow" aria-hidden="true">
                  {t("🎁 Sale")}
                </span>
              )}
            </div>
            <span className="mt-2 text-xs font-medium tracking-wide text-slate-400 uppercase">{p.category?.name}</span>
            {/* The name is the link; it stretches over the whole card, so the card is easy to tap */}
            <Link
              to={`/products/${p.id}`}
              className="line-clamp-2 text-sm font-semibold text-slate-900 after:absolute after:inset-0 group-hover:text-brand-700"
            >
              {p.name}
            </Link>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
              <Price product={p} />
              {!!p.rating?.count && <RatingBadge rating={p.rating} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
