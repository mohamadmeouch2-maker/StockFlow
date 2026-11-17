import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { favoritesApi } from "../api/favorites";
import { useCart } from "../cart/useCart";
import { FavoriteButton } from "../components/FavoriteButton";
import { Price } from "../components/Price";
import { ProductImage } from "../components/ProductImage";
import { RatingBadge } from "../components/RatingBadge";
import { ProductCardsSkeleton } from "../components/Skeleton";
import { StockBadge } from "../components/StockBadge";
import { useToast } from "../toast/useToast";
import { useT } from "../i18n/useT";

// The customer's saved products, with their current price and stock, ready to add to the cart.
export function FavoritesPage() {
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: favoritesApi.list });
  const { items, add } = useCart();
  const toast = useToast();
  const { t } = useT();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">{t("My favourites")}</h1>
        <p className="text-sm text-slate-500">{t("Products you saved for later. Click the heart to remove one.")}</p>
      </div>

      {favorites.isLoading && <ProductCardsSkeleton count={3} />}
      {favorites.isError && (
        <p className="text-danger-600">
          {t("Could not load your favourites.")} {favorites.error.message}
        </p>
      )}
      {favorites.data?.length === 0 && (
        <div className="card mx-auto max-w-md space-y-3 p-10 text-center">
          <div className="text-3xl" aria-hidden="true">
            ♡
          </div>
          <p className="text-lg font-medium text-slate-700">{t("No favourites yet")}</p>
          <p className="text-sm text-slate-500">{t("Click the heart on any product to save it here.")}</p>
          <Link to="/products" className="btn btn-primary">
            {t("Browse products")}
          </Link>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.data?.map((p) => {
          const inCart = items.find((i) => i.product.id === p.id)?.quantity ?? 0;
          const canAdd = p.stock > inCart; // never more than the stock (FR-06)
          return (
            <li key={p.id} className="card card-hover relative flex gap-4 p-4">
              <FavoriteButton product={p} className="absolute top-2 end-2" />
              <Link to={`/products/${p.id}`} className="shrink-0">
                <ProductImage src={p.imageUrl} alt={p.name} className="h-24 w-24" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col pe-6">
                <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{p.category?.name}</span>
                <Link to={`/products/${p.id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                  {p.name}
                </Link>
                <p className="mt-1">
                  <Price product={p} />
                </p>
                <RatingBadge rating={p.rating} />
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                  <StockBadge product={p} />
                  <button
                    disabled={!canAdd}
                    onClick={() => {
                      add(p);
                      toast(t("{name} added to your cart", { name: p.name }));
                    }}
                    className="btn btn-primary px-3 py-1"
                  >
                    {t("Add to cart")}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
