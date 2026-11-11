import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { productsApi } from "../api/products";
import { useAuth } from "../auth/useAuth";
import { LogoMark } from "./Logo";

// The top of the products page: a welcome banner and three "why StockFlow" boxes.
export function HomeHero() {
  const { user } = useAuth();
  // Same query as the first page of the product list, so it comes from the cache.
  const all = useQuery({ queryKey: ["products", 1, "", undefined], queryFn: () => productsApi.list({ page: 1 }) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: productsApi.categories });

  return (
    <div className="mb-8 space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 px-6 py-10 text-white shadow-lg sm:px-10">
        {/* Big faded logo in the corner, just for decoration */}
        <LogoMark className="pointer-events-none absolute -right-10 -bottom-12 h-64 w-64 rotate-12 opacity-15" />
        <div className="relative max-w-xl space-y-4">
          <p className="text-sm font-semibold tracking-wider text-brand-100 uppercase">Welcome to StockFlow</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything your office needs, always in stock</h1>
          <p className="text-brand-100">
            Browse stationery, electronics, furniture and cleaning supplies. You always see the real stock, and your order is reserved the moment you place it.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a href="#catalog" className="btn bg-white text-brand-700 shadow-sm hover:bg-brand-50">
              Browse products
            </a>
            {!user && (
              <Link to="/register" className="btn border border-white/40 text-white hover:bg-white/10">
                Create an account
              </Link>
            )}
            {user?.role === "CUSTOMER" && (
              <Link to="/orders" className="btn border border-white/40 text-white hover:bg-white/10">
                My orders
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link to="/admin/products" className="btn border border-white/40 text-white hover:bg-white/10">
                Manage products
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-6 pt-3 text-sm">
            <Stat value={all.data?.total} label="products" />
            <Stat value={categories.data?.length} label="categories" />
            <Stat value="24/7" label="online ordering" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature title="Live stock" text="Every product shows if it's in stock, low or sold out.">
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </Feature>
        <Feature title="Safe checkout" text="Your items are reserved in one step, so nobody can take the last one.">
          <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
          <path d="m9 12 2 2 4-4" />
        </Feature>
        <Feature title="Track your orders" text="Follow each order from pending to delivered, or cancel it in time.">
          <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17" cy="18" r="1.5" />
        </Feature>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value?: number | string; label: string }) {
  return (
    <div>
      <span className="block text-2xl font-bold">{value ?? "–"}</span>
      <span className="text-brand-100">{label}</span>
    </div>
  );
}

function Feature({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="card flex gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          {children}
        </svg>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}
