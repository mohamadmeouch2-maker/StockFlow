import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { productsApi } from "../api/products";
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
        <div className="max-w-lg space-y-3 rounded border bg-white p-6">
          <h1 className="text-2xl font-bold">{product.data.name}</h1>
          <p className="text-sm text-gray-500">{product.data.category?.name}</p>
          <p>{product.data.description || "No description."}</p>
          <p className="text-xl font-semibold">${Number(product.data.price).toFixed(2)}</p>
          <div className="flex items-center gap-2">
            <StockBadge product={product.data} />
            <span className="text-sm text-gray-500">{product.data.stock} left</span>
          </div>
        </div>
      )}
    </div>
  );
}
