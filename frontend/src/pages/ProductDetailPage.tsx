import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { productsApi } from "../api/products";
import { reviewsApi } from "../api/reviews";
import type { Product } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { FavoriteButton } from "../components/FavoriteButton";
import { Price } from "../components/Price";
import { ProductImage } from "../components/ProductImage";
import { ProductReviews } from "../components/ProductReviews";
import { RatingBadge } from "../components/RatingBadge";
import { ProductDetailSkeleton } from "../components/Skeleton";
import { StockBadge } from "../components/StockBadge";
import { useToast } from "../toast/useToast";
import { shortDate } from "../utils/format";

// Counts one view per product per visit (not on every refresh).
function useCountView(id: number) {
  useEffect(() => {
    const seen: number[] = JSON.parse(sessionStorage.getItem("viewed-products") ?? "[]");
    if (seen.includes(id)) return;
    sessionStorage.setItem("viewed-products", JSON.stringify([...seen, id]));
    reviewsApi.countView(id).catch(() => {}); // a missed view is not important
  }, [id]);
}

// FR-05: name, description, price, category and stock status of one product.
export function ProductDetailPage() {
  const id = Number(useParams().id);
  const product = useQuery({ queryKey: ["product", id], queryFn: () => productsApi.get(id) });
  const p = product.data;
  useCountView(id);

  return (
    <div className="space-y-5">
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/products" className="link">
          Products
        </Link>
        {p && <span> / {p.category?.name} / </span>}
        {p && <span className="text-slate-700">{p.name}</span>}
      </nav>

      {product.isLoading && <ProductDetailSkeleton />}
      {product.isError && <p className="text-danger-600">{product.error.message}</p>}

      {p && (
        <div className="card flex flex-col gap-8 p-6 sm:p-8 md:flex-row">
          {/* The photo next to the details (below each other on narrow screens) */}
          <div className="rounded-xl bg-slate-50 p-4 md:w-96 md:shrink-0">
            <ProductImage src={p.imageUrl} alt={p.name} className="aspect-square w-full" />
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">{p.category?.name}</span>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{p.name}</h1>
              </div>
              <FavoriteButton product={p} className="mt-1" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <RatingBadge rating={p.rating} />
              {p.viewCount !== undefined && <span className="text-sm text-slate-400">👁 {p.viewCount} views</span>}
            </div>
            <div>
              <Price product={p} size="lg" />
              {p.promotion && (
                <p className="mt-1 text-sm font-medium text-sale-600">
                  🎄 {p.promotion.name}: {p.promotion.percent}% off until {shortDate(p.promotion.endsAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StockBadge product={p} />
              <span className="text-sm text-slate-500">{p.stock} left</span>
            </div>
            <p className="text-slate-600">{p.description || "No description."}</p>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <dt className="text-slate-500">Product code</dt>
              <dd className="font-medium text-slate-800">SF-{String(p.id).padStart(4, "0")}</dd>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium text-slate-800">{p.category?.name}</dd>
              <dt className="text-slate-500">Availability</dt>
              <dd className="font-medium text-slate-800">{p.stock > 0 ? `${p.stock} in stock` : "Sold out"}</dd>
            </dl>

            <BuyBox product={p} />
          </div>
        </div>
      )}

      {p && <ProductReviews productId={p.id} />}
    </div>
  );
}

// What appears under the product depends on who is looking (FR-06).
function BuyBox({ product }: { product: Product }) {
  const { user } = useAuth();
  const { items, add } = useCart();
  const location = useLocation();
  const toast = useToast();
  const inCart = items.find((i) => i.product.id === product.id)?.quantity ?? 0;

  if (!user)
    return (
      <Link to="/login" state={{ from: location }} className="btn btn-primary self-start">
        Log in to buy
      </Link>
    );
  if (user.role === "ADMIN")
    return (
      <Link to={`/admin/products/${product.id}/edit`} className="btn btn-outline self-start">
        Edit product
      </Link>
    );

  const canAdd = product.stock > inCart; // FR-06: never more than the stock
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={!canAdd}
        onClick={() => {
          add(product);
          toast(`${product.name} added to your cart`);
        }}
        className="btn btn-primary px-6 py-2.5"
      >
        Add to cart
      </button>
      {inCart > 0 && (
        <span className="text-sm text-slate-600">
          {inCart} in your{" "}
          <Link to="/cart" className="link">
            cart
          </Link>
        </span>
      )}
      {!canAdd && product.stock > 0 && <span className="text-sm text-slate-500">You have all the available stock in your cart.</span>}
    </div>
  );
}
