import { api } from "./client";
import type { Notification } from "./types";

// Stock alerts for admins (created automatically by the API when orders make products low).
export const notificationsApi = {
  list: () => api<{ unread: number; items: Notification[] }>("core", "/api/notifications"),
  read: (id: number) => api<void>("core", `/api/notifications/${id}/read`, { method: "POST" }),
  readAll: () => api<void>("core", "/api/notifications/read-all", { method: "POST" }),
};
