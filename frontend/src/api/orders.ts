import { api } from "./client";
import type { DeliveryMethod, DeliveryOption, Order, OrderStatus, Paged, ShipTo } from "./types";

// Calls to the Core API for orders (FR-07 to FR-10, FR-12).
export const ordersApi = {
  create: (items: { productId: number; quantity: number }[], delivery: DeliveryMethod, shipTo: ShipTo) =>
    api<Order>("core", "/api/orders", { method: "POST", body: JSON.stringify({ items, delivery, ...shipTo }) }),
  deliveryOptions: () => api<DeliveryOption[]>("core", "/api/orders/delivery-options"),
  lastAddress: () => api<ShipTo | null>("core", "/api/orders/last-address"), // null = no orders yet
  mine: () => api<Order[]>("core", "/api/orders/mine"),
  cancel: (id: number) => api<Order>("core", `/api/orders/${id}/cancel`, { method: "POST" }),
  // Admin only
  all: (status: OrderStatus | undefined, page: number) => api<Paged<Order>>("core", `/api/orders?page=${page}${status ? `&status=${status}` : ""}`),
  setStatus: (id: number, status: Exclude<OrderStatus, "PENDING">) =>
    api<Order>("core", `/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
