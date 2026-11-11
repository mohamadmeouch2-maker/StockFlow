import { api } from "./client";
import type { Promotion } from "./types";

export type StartSale = { name: string; percent: number; endsAt: string; maxSold: number; days: number };

// Sales such as the Christmas Sale. Anyone can ask which sale is on; only admins start or end one.
export const promotionsApi = {
  current: () => api<Promotion | null>("core", "/api/promotions/current"),
  start: (body: StartSale) =>
    api<{ promotion: Promotion; products: { id: number; name: string }[] }>("core", "/api/promotions", { method: "POST", body: JSON.stringify(body) }),
  end: (id: number) => api<void>("core", `/api/promotions/${id}`, { method: "DELETE" }),
};
