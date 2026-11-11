import { api } from "./client";
import type { Product } from "./types";

// A customer's favourite products (the heart button).
export const favoritesApi = {
  list: () => api<Product[]>("core", "/api/favorites"),
  add: (productId: number) => api<void>("core", `/api/favorites/${productId}`, { method: "PUT" }),
  remove: (productId: number) => api<void>("core", `/api/favorites/${productId}`, { method: "DELETE" }),
};
