import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productsApi, SORT_OPTIONS, type ProductSort } from "../api/products";
import { FavoriteButton } from "../components/FavoriteButton";
import { Pagination } from "../components/Pagination";
import { Price } from "../components/Price";
import { ProductImage } from "../components/ProductImage";
import { RatingBadge } from "../components/RatingBadge";
import { SaleBanner } from "../components/SaleBanner";
import { ProductCardsSkeleton } from "../components/Skeleton";
import { StockBadge } from "../components/StockBadge";
import { useDebounce } from "../hooks/useDebounce";

// FR-04: product list with search, category filter and pagination (guide 4.7).
export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number>();
  const [sort, setSort] = useState<ProductSort>("name");
  const [inStock, setInStock] = useState(false); // true = hide sold-out products
  // "?sale=1" in the address shows only the products on sale (the Christmas popup links here)
  const [params, setParams] = useSearchParams();
  const onSale = params.get("sale") === "1";
  const toggleDeals = () => {
    setParams(onSale ? {} : { sale: "1" });
    setPage(1);
  };
  const debounced = useDebounce(search, 300);

  const categories = useQuery({ queryKey: ["categories"], queryFn: productsApi.categories });

  const products = useQuery({
    queryKey: ["products", page, debounced, categoryId, sort, inStock, onSale],
    queryFn: () => productsApi.list({ page, search: debounced, categoryId, sort, inStock, onSale }),
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
      <SaleBanner showingDeals={onSale} onToggle={toggleDeals} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">{onSale ? "Christmas deals 🎁" : "Our products"}</h2>
          <p className="text-sm text-slate-500">{showing}</p>
        </div>
        <div className="relative w-full sm:w-80">
          <label className="sr-only" htmlFor="search">
            Search
          </label>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute top-2.5 left-3 h-5 w-5 text-slate-400"
            aria-hidden="true"
          >
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

      {/* Category buttons (FR-04 filter) on the left, sorting and "in stock only" on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {[{ id: undefined, name: "All categories" }, ...(categories.data ?? [])].map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id ?? "all"}
                aria-pressed={active}
                onClick={() => chooseCategory(c.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => {
                setInStock(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-brand-600"
            />
            In stock only
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Sort by
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as ProductSort);
                setPage(1);
              }}
              className="input w-auto py-1.5"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {products.isLoading && <ProductCardsSkeleton />}
      {products.isError && <p className="text-danger-600">Could not load products. {products.error.message}</p>}
      {products.data?.items.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">No products match your search.</p>
          <p className="text-sm">Try another word or category.</p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.data?.items.map((p) => (
          <li key={p.id} className="card card-hover group relative flex gap-4 p-4">
            <FavoriteButton product={p} className="absolute top-2 right-2" />
            <Link to={`/products/${p.id}`} className="relative shrink-0">
              <ProductImage src={p.imageUrl} alt={p.name} className="h-24 w-24" />
              {p.salePrice && (
                <span className="absolute -top-2 -left-2 rounded-full bg-sale-600 px-2 py-0.5 text-xs font-bold text-white shadow" aria-hidden="true">
                  🎁 Sale
                </span>
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col pr-6">
              <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{p.category?.name}</span>
              <Link to={`/products/${p.id}`} className="font-semibold text-slate-900 group-hover:text-brand-700">
                {p.name}
              </Link>
              <p className="mt-1">
                <Price product={p} />
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingBadge rating={p.rating} />
                {p.viewCount !== undefined && <span className="text-xs whitespace-nowrap text-slate-400">👁 {p.viewCount} views</span>}
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <StockBadge product={p} />
                <Link to={`/products/${p.id}`} className="text-sm font-medium whitespace-nowrap text-brand-600 hover:underline">
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
