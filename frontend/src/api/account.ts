import { api } from "./client";
import type { Account, ShipTo } from "./types";

// My account: my name, my saved delivery address (customers) and my password.
export const accountApi = {
  get: () => api<Account>("core", "/api/account"),
  rename: (name: string) => api<Account>("core", "/api/account", { method: "PATCH", body: JSON.stringify({ name }) }),
  saveAddress: (shipTo: ShipTo) => api<Account>("core", "/api/account/address", { method: "PUT", body: JSON.stringify(shipTo) }),
  removeAddress: () => api<Account>("core", "/api/account/address", { method: "DELETE" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>("core", "/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
};
