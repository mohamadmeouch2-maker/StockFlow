import { api } from "./client";
import type { OrderStatus } from "./types";

export type LowStockRow = {
  productId: number;
  name: string;
  imageUrl: string | null;
  category: string;
  stock: number;
  reorderLevel: number;
};

// The admin dashboard's numbers. Cancelled orders don't count as sales.
export type Summary = {
  days: number; // the chosen period
  products: { total: number; lowStock: number; soldOut: number };
  openIssues: number; // customer service messages waiting for an answer
  thisWeek: { orders: number; revenue: string }; // the last 7 days
  lastWeek: { orders: number; revenue: string }; // the 7 days before
  // For the chosen period:
  ordersByStatus: Record<OrderStatus, number>;
  salesByDay: { date: string; orders: number; revenue: string }[]; // oldest first; date = "2026-11-06" (FR-14)
  bestSellers: { productId: number; name: string; imageUrl: string | null; sold: number }[]; // top 5 (FR-15)
};

// Sales per product for a period (every product, the best first), for the Excel download.
// Cancelled orders and delivery fees are not counted. revenue = "12.50" in US dollars.
export type SalesByProduct = {
  days: number;
  products: { productId: number; name: string; category: string; sold: number; revenue: string; stock: number }[];
};

// Admin reports. FR-16 is served by the Core API (the .NET reporting API is out of scope).
export const reportsApi = {
  lowStock: () => api<LowStockRow[]>("core", "/api/reports/low-stock"),
  summary: (days = 30) => api<Summary>("core", `/api/reports/summary?days=${days}`),
  salesByProduct: (days = 30) => api<SalesByProduct>("core", `/api/reports/sales-by-product?days=${days}`),
};
