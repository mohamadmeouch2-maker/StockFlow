import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { productsApi } from "../api/products";
import { Pagination } from "../components/Pagination";
import { ProductImage } from "../components/ProductImage";
import { StockBadge } from "../components/StockBadge";
import { useDebounce } from "../hooks/useDebounce";

// FR-04: product list with search, category filter and pagination (guide 4.7).
export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number>();
  const debounced = useDebounce(search, 300);

  const categories = useQuery({ queryKey: ["categories"], queryFn: productsApi.categories });

  const products = useQuery({
    queryKey: ["products", page, debounced, categoryId],
    queryFn: () => productsApi.list({ page, search: debounced, categoryId }),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });

  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / products.data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Products</h1>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="search">
          Search
        </label>
        <input
          id="search"
          className="flex-1 rounded border bg-white px-3 py-2"
          placeholder="Search products"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Category"
          className="rounded border bg-white px-3 py-2"
          value={categoryId ?? ""}
          onChange={(e) => {
            setCategoryId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {products.isLoading && <p>Loading...</p>}
      {products.isError && <p className="text-red-600">Could not load products. {products.error.message}</p>}
      {products.data?.items.length === 0 && <p>No products match your search.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.data?.items.map((p) => (
          <li key={p.id} className="flex gap-4 rounded border bg-white p-4">
            <Link to={`/products/${p.id}`} className="shrink-0">
              <ProductImage src={p.imageUrl} alt={p.name} className="h-24 w-24" />
            </Link>
            <div className="min-w-0">
              <Link to={`/products/${p.id}`} className="font-semibold hover:underline">
                {p.name}
              </Link>
              <p className="text-sm text-gray-500">{p.category?.name}</p>
              <p className="mt-2">${Number(p.price).toFixed(2)}</p>
              <StockBadge product={p} />
            </div>
          </li>
        ))}
      </ul>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
