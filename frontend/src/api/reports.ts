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
  openIssues: number;
  thisWeek: { orders: number; revenue: string }; // the last 7 days
  lastWeek: { orders: number; revenue: string }; // the 7 days before
  // For the chosen period:
  ordersByStatus: Record<OrderStatus, number>;
  salesByDay: { date: string; orders: number; revenue: string }[]; // oldest first; date = "2026-11-06" (FR-14)
  bestSellers: { productId: number; name: string; imageUrl: string | null; sold: number }[]; // top 5 (FR-15)
};

// Admin reports. FR-16 is served by the Core API (the .NET reporting API is out of scope).
export const reportsApi = {
  lowStock: () => api<LowStockRow[]>("core", "/api/reports/low-stock"),
  summary: (days = 30) => api<Summary>("core", `/api/reports/summary?days=${days}`),
};
