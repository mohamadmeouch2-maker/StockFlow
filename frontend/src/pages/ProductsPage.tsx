import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { productsApi } from "../api/products";
import { Pagination } from "../components/Pagination";
import { ProductImage } from "../components/ProductImage";
import { RatingBadge } from "../components/RatingBadge";
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
  const chooseCategory = (id?: number) => {
    setCategoryId(id);
    setPage(1);
  };

  // "Showing 1–12 of 15 products"
  const d = products.data;
  const showing = d && d.total > 0 ? `Showing ${(d.page - 1) * d.pageSize + 1}–${(d.page - 1) * d.pageSize + d.items.length} of ${d.total} products` : "";

  return (
    <section id="catalog" className="scroll-mt-20 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">Our products</h2>
          <p className="text-sm text-slate-500">{showing}</p>
        </div>
        <div className="relative w-full sm:w-80">
          <label className="sr-only" htmlFor="search">
            Search
          </label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute top-2.5 left-3 h-5 w-5 text-slate-400" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="search"
            className="input pl-10"
            placeholder="Search products"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Category buttons (FR-04 filter) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        {[{ id: undefined, name: "All categories" }, ...(categories.data ?? [])].map((c) => {
          const active = categoryId === c.id;
          return (
            <button
              key={c.id ?? "all"}
              aria-pressed={active}
              onClick={() => chooseCategory(c.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {products.isLoading && <p className="text-slate-500">Loading...</p>}
      {products.isError && <p className="text-red-600">Could not load products. {products.error.message}</p>}
      {products.data?.items.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">No products match your search.</p>
          <p className="text-sm">Try another word or category.</p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.data?.items.map((p) => (
          <li key={p.id} className="card card-hover group flex gap-4 p-4">
            <Link to={`/products/${p.id}`} className="shrink-0">
              <ProductImage src={p.imageUrl} alt={p.name} className="h-24 w-24" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{p.category?.name}</span>
              <Link to={`/products/${p.id}`} className="font-semibold text-slate-900 group-hover:text-blue-700">
                {p.name}
              </Link>
              <p className="mt-1 text-lg font-bold text-slate-900">${Number(p.price).toFixed(2)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingBadge rating={p.rating} />
                {p.viewCount !== undefined && <span className="text-xs whitespace-nowrap text-slate-400">👁 {p.viewCount} views</span>}
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <StockBadge product={p} />
                <Link to={`/products/${p.id}`} className="text-sm font-medium whitespace-nowrap text-blue-600 hover:underline">
                  View details →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
    </section>
  );
}
