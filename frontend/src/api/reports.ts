import { api } from "./client";

export type LowStockRow = { productId: number; name: string; category: string; stock: number; reorderLevel: number };

// Admin reports. FR-16 is served by the Core API (the .NET reporting API is out of scope).
export const reportsApi = {
  lowStock: () => api<LowStockRow[]>("core", "/api/reports/low-stock"),
};
