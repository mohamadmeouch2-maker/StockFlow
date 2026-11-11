import { api } from "./client";
import type { DeliveryMethod, DeliveryOption, Order, OrderStatus } from "./types";

// Calls to the Core API for orders (FR-07 to FR-10, FR-12).
export const ordersApi = {
  create: (items: { productId: number; quantity: number }[], delivery: DeliveryMethod = "STANDARD") =>
    api<Order>("core", "/api/orders", { method: "POST", body: JSON.stringify({ items, delivery }) }),
  deliveryOptions: () => api<DeliveryOption[]>("core", "/api/orders/delivery-options"),
  mine: () => api<Order[]>("core", "/api/orders/mine"),
  cancel: (id: number) => api<Order>("core", `/api/orders/${id}/cancel`, { method: "POST" }),
  // Admin only
  all: (status?: OrderStatus) => api<Order[]>("core", `/api/orders${status ? `?status=${status}` : ""}`),
  setStatus: (id: number, status: Exclude<OrderStatus, "PENDING">) =>
    api<Order>("core", `/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
