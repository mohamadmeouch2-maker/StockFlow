import { ApiError } from "./client";
import { mockCategories, mockProducts } from "./mockData";
import type { Category, Paged, Product } from "./types";

export type ProductInput = Omit<Product, "id" | "category" | "price"> & { price: number };

// MOCK version of the guide's productsApi (4.4). It has the same functions and
// returns the same shapes as the real API, so on Nov 12 we only replace this
// file and the pages keep working. Changes are lost when the page reloads.

const PAGE_SIZE = 12; // FR-04: 12 products per page
let products: Product[] = [...mockProducts];

// Wait a little, like a real network call, so we can see the loading states.
const delay = () => new Promise((resolve) => setTimeout(resolve, 300));

const toProduct = (id: number, d: ProductInput): Product => ({
  ...d,
  id,
  price: d.price.toFixed(2),
  category: mockCategories.find((c) => c.id === d.categoryId),
});

const findOrThrow = (id: number) => {
  const product = products.find((p) => p.id === id);
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found");
  return product;
};

export const productsApi = {
  list: async (p: { page: number; search?: string; categoryId?: number }): Promise<Paged<Product>> => {
    await delay();
    const search = (p.search ?? "").trim().toLowerCase();
    const matches = products
      .filter((x) => x.name.toLowerCase().includes(search))
      .filter((x) => !p.categoryId || x.categoryId === p.categoryId)
      .sort((a, b) => a.name.localeCompare(b.name)); // the real API sorts by name too
    const start = (p.page - 1) * PAGE_SIZE;
    return { items: matches.slice(start, start + PAGE_SIZE), page: p.page, pageSize: PAGE_SIZE, total: matches.length };
  },
  get: async (id: number): Promise<Product> => {
    await delay();
    return findOrThrow(id);
  },
  create: async (d: ProductInput): Promise<Product> => {
    await delay();
    const product = toProduct(Math.max(0, ...products.map((p) => p.id)) + 1, d);
    products = [...products, product];
    return product;
  },
  update: async (id: number, d: ProductInput): Promise<Product> => {
    await delay();
    findOrThrow(id);
    const product = toProduct(id, d);
    products = products.map((p) => (p.id === id ? product : p));
    return product;
  },
  remove: async (id: number): Promise<void> => {
    await delay();
    products = products.filter((p) => p.id !== id);
  },
  categories: async (): Promise<Category[]> => {
    await delay();
    return mockCategories;
  },
};
