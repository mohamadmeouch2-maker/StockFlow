import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { productsApi } from "../api/products";
import type { Product } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { ProductImage } from "../components/ProductImage";
import { StockBadge } from "../components/StockBadge";

// FR-05: name, description, price, category and stock status of one product.
export function ProductDetailPage() {
  const id = Number(useParams().id);
  const product = useQuery({ queryKey: ["product", id], queryFn: () => productsApi.get(id) });

  return (
    <div className="space-y-4">
      <Link to="/products" className="text-sm text-blue-600 hover:underline">
        ← Back to products
      </Link>

      {product.isLoading && <p>Loading...</p>}
      {product.isError && <p className="text-red-600">{product.error.message}</p>}

      {product.data && (
        <div className="flex max-w-3xl flex-col gap-6 rounded border bg-white p-6 sm:flex-row">
          {/* The photo next to the details (below each other on narrow screens) */}
          <ProductImage src={product.data.imageUrl} alt={product.data.name} className="aspect-square w-full sm:w-72 sm:shrink-0" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{product.data.name}</h1>
            <p className="text-sm text-gray-500">{product.data.category?.name}</p>
            <p>{product.data.description || "No description."}</p>
            <p className="text-xl font-semibold">${Number(product.data.price).toFixed(2)}</p>
            <div className="flex items-center gap-2">
              <StockBadge product={product.data} />
              <span className="text-sm text-gray-500">{product.data.stock} left</span>
            </div>
            <BuyBox product={product.data} />
          </div>
        </div>
      )}
    </div>
  );
}

// What appears under the product depends on who is looking (FR-06).
function BuyBox({ product }: { product: Product }) {
  const { user } = useAuth();
  const { items, add } = useCart();
  const location = useLocation();
  const inCart = items.find((i) => i.product.id === product.id)?.quantity ?? 0;

  if (!user)
    return (
      <Link to="/login" state={{ from: location }} className="inline-block text-blue-600 hover:underline">
        Log in to buy
      </Link>
    );
  if (user.role === "ADMIN")
    return (
      <Link to={`/admin/products/${product.id}/edit`} className="inline-block text-blue-600 hover:underline">
        Edit product
      </Link>
    );

  const canAdd = product.stock > inCart; // FR-06: never more than the stock
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={!canAdd}
        onClick={() => add(product)}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        Add to cart
      </button>
      {inCart > 0 && (
        <span className="text-sm">
          {inCart} in your{" "}
          <Link to="/cart" className="text-blue-600 hover:underline">
            cart
          </Link>
        </span>
      )}
    </div>
  );
}
