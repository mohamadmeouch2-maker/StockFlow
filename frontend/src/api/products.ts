import { api } from "./client";
import type { Category, Paged, Product } from "./types";

// How the product list can be sorted (the API does the sorting).
export type ProductSort = "name" | "price_asc" | "price_desc" | "rating" | "newest";
export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Best rated" },
  { value: "newest", label: "Newest" },
];

export type ProductInput = Omit<Product, "id" | "category" | "price" | "imageUrl"> & { price: number };

// FR-17: same limits as the API, so most mistakes are caught before uploading.
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_MB = 2;

// Guide 4.4: calls to the Core API for products and categories.
// (Until Nov 5 this file returned mock data with the same functions.)
export const productsApi = {
  list: (p: { page: number; search?: string; categoryId?: number; sort?: ProductSort; inStock?: boolean }) => {
    const q = new URLSearchParams({ page: String(p.page), pageSize: "12" });
    if (p.search) q.set("search", p.search);
    if (p.categoryId) q.set("categoryId", String(p.categoryId));
    if (p.sort && p.sort !== "name") q.set("sort", p.sort);
    if (p.inStock) q.set("inStock", "true");
    return api<Paged<Product>>("core", `/api/products?${q}`);
  },
  get: (id: number) => api<Product>("core", `/api/products/${id}`),
  create: (d: ProductInput) => api<Product>("core", "/api/products", { method: "POST", body: JSON.stringify(d) }),
  update: (id: number, d: ProductInput) => api<Product>("core", `/api/products/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  remove: (id: number) => api<void>("core", `/api/products/${id}`, { method: "DELETE" }),
  categories: () => api<Category[]>("core", "/api/categories"),
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api<Product>("core", `/api/products/${id}/image`, { method: "POST", body: form });
  },
  removeImage: (id: number) => api<Product>("core", `/api/products/${id}/image`, { method: "DELETE" }),
};
