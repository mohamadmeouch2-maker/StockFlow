import { api } from "./client";
import type { Category } from "./types";

// FR-11: categories. Listing is open to everyone; the changes are admin-only.
export const categoriesApi = {
  list: () => api<Category[]>("core", "/api/categories"),
  create: (name: string) => api<Category>("core", "/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  rename: (id: number, name: string) => api<Category>("core", `/api/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  remove: (id: number) => api<void>("core", `/api/categories/${id}`, { method: "DELETE" }),
};
