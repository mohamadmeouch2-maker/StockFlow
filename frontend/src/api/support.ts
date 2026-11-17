import { api } from "./client";
import type { SupportStatus, SupportTicket, SupportTopic } from "./types";

// Customer service topics, in the order the form shows them, with an example for each.
export const SUPPORT_TOPICS: { value: SupportTopic; label: string; example: string }[] = [
  { value: "SIGN_IN", label: "Signing in and my account", example: "For example: I can't log in, or the email code didn't arrive." },
  { value: "ORDER", label: "An order", example: "For example: I got a wrong, damaged or missing item." },
  { value: "DELIVERY", label: "Delivery", example: "For example: where is my order, and when will it arrive?" },
  { value: "RETURN", label: "Returns", example: "For example: I want to send a product back." },
  { value: "PAYMENT", label: "Payments and cards", example: "For example: a question about paying or about a card." },
  { value: "CHANGE", label: "Change or cancel an order", example: "For example: I want to change the address or the items." },
  { value: "OTHER", label: "Something else", example: "Write your question here." },
];
export const topicLabel = (topic: SupportTopic) => SUPPORT_TOPICS.find((t) => t.value === topic)?.label ?? topic;

export type NewSupportMessage = { topic: SupportTopic; message: string; orderId?: number; name?: string; email?: string };

// Customer service: customers and visitors write, admins answer.
export const supportApi = {
  // Logged in: the account's name and email are used. Visitors send a name and an email.
  create: (body: NewSupportMessage) => api<SupportTicket>("core", "/api/support", { method: "POST", body: JSON.stringify(body) }),
  mine: () => api<SupportTicket[]>("core", "/api/support/mine"),
  markRead: () => api<void>("core", "/api/support/read", { method: "POST" }),
  // A new message in a conversation. resolve: admins only, "send and mark solved".
  reply: (id: number, message: string, resolve?: boolean) =>
    api<SupportTicket>("core", `/api/support/${id}/messages`, { method: "POST", body: JSON.stringify({ message, resolve }) }),
  // Admin only
  all: (status?: SupportStatus) => api<SupportTicket[]>("core", `/api/support${status ? `?status=${status}` : ""}`),
  setStatus: (id: number, status: SupportStatus) => api<SupportTicket>("core", `/api/support/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
