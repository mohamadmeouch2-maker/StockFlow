import { api } from "./client";

// "Tell me when it's back" (customers): the sold-out products I wait for.
export const stockAlertsApi = {
  list: () => api<number[]>("core", "/api/stock-alerts"), // the product ids, e.g. [21, 9]
  add: (productId: number) => api<void>("core", `/api/stock-alerts/${productId}`, { method: "PUT" }),
  remove: (productId: number) => api<void>("core", `/api/stock-alerts/${productId}`, { method: "DELETE" }),
};
