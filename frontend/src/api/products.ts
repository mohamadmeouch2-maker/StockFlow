import { api } from "./client";
import type { Category, Paged, Product } from "./types";

export type ProductInput = Omit<Product, "id" | "category" | "price"> & { price: number };

// Guide 4.4: calls to the Core API for products and categories.
// (Until Nov 5 this file returned mock data with the same functions.)
export const productsApi = {
  list: (p: { page: number; search?: string; categoryId?: number }) => {
    const q = new URLSearchParams({ page: String(p.page), pageSize: "12" });
    if (p.search) q.set("search", p.search);
    if (p.categoryId) q.set("categoryId", String(p.categoryId));
    return api<Paged<Product>>("core", `/api/products?${q}`);
  },
  get: (id: number) => api<Product>("core", `/api/products/${id}`),
  create: (d: ProductInput) => api<Product>("core", "/api/products", { method: "POST", body: JSON.stringify(d) }),
  update: (id: number, d: ProductInput) => api<Product>("core", `/api/products/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  remove: (id: number) => api<void>("core", `/api/products/${id}`, { method: "DELETE" }),
  categories: () => api<Category[]>("core", "/api/categories"),
};
