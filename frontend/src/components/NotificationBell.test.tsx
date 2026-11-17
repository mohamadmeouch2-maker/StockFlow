import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { notificationsApi } from "../api/notifications";
import type { Notification, Role } from "../api/types";
import { ToastProvider } from "../toast/ToastProvider";
import { NotificationBell } from "./NotificationBell";

const alert = (id: number, type: Notification["type"], message: string, readAt: string | null): Notification => ({
  id,
  type,
  message,
  userId: null,
  productId: id + 10,
  ticketId: null,
  orderId: null,
  readAt,
  createdAt: new Date().toISOString(),
  product: { name: "Product", imageUrl: null },
  ticket: null,
});
// A customer service message: about a conversation, not a product
const fromSara: Notification = {
  id: 3,
  type: "SUPPORT_MESSAGE",
  message: "New message from Sara: Delivery",
  userId: null,
  productId: null,
  ticketId: 7,
  orderId: null,
  readAt: null,
  createdAt: new Date().toISOString(),
  product: null,
  ticket: { id: 7, topic: "DELIVERY", name: "Sara" },
};
const lowStapler = alert(1, "LOW_STOCK", "Stapler is low on stock: 4 left (reorder level 5)", "2026-11-10T10:00:00Z");
const soldOutTape = alert(2, "OUT_OF_STOCK", "Tape is sold out", null);

const list = vi.spyOn(notificationsApi, "list");
const readAll = vi.spyOn(notificationsApi, "readAll").mockResolvedValue(undefined);
beforeEach(() => readAll.mockClear());

const renderBell = (client = new QueryClient(), role: Role = "ADMIN") =>
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <NotificationBell role={role} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );

test("the bell shows how many alerts are unread, and the list opens with a Restock link", async () => {
  list.mockResolvedValue({ unread: 1, items: [soldOutTape, lowStapler] });
  renderBell();
  const bell = await screen.findByRole("button", { name: "Notifications, 1 unread" });
  expect(bell).toHaveTextContent("1");

  await userEvent.click(bell);
  expect(screen.getByText("Tape is sold out")).toBeInTheDocument();
  expect(screen.getByText("Stapler is low on stock: 4 left (reorder level 5)")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Restock" })[0]).toHaveAttribute("href", "/admin/products/12/edit");

  await userEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  expect(readAll).toHaveBeenCalled();
});

test("a new alert pops up by itself as a message", async () => {
  const client = new QueryClient();
  list.mockResolvedValue({ unread: 0, items: [lowStapler] });
  renderBell(client);
  await vi.waitFor(() => expect(client.getQueryData(["notifications"])).toBeDefined()); // first check done
  expect(screen.getByRole("button", { name: "Notifications, 0 unread" })).toBeInTheDocument();
  expect(screen.queryByText("Tape is sold out")).not.toBeInTheDocument();

  // The next check finds a new alert
  list.mockResolvedValue({ unread: 1, items: [soldOutTape, lowStapler] });
  await act(() => client.invalidateQueries({ queryKey: ["notifications"] }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Tape is sold out");
});

test("a customer service message is in the bell too, with an Answer link, and pops up when it arrives", async () => {
  const client = new QueryClient();
  list.mockResolvedValue({ unread: 0, items: [lowStapler] });
  renderBell(client);
  await vi.waitFor(() => expect(client.getQueryData(["notifications"])).toBeDefined());

  list.mockResolvedValue({ unread: 1, items: [fromSara, lowStapler] });
  await act(() => client.invalidateQueries({ queryKey: ["notifications"] }));
  expect(await screen.findByRole("status")).toHaveTextContent("New message from Sara: Delivery");

  await userEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
  expect(screen.getByRole("link", { name: "Answer" })).toHaveAttribute("href", "/admin/support");
  expect(screen.getByRole("link", { name: "Restock" })).toHaveAttribute("href", "/admin/products/11/edit");
  expect(screen.getByRole("link", { name: "Customer service →" })).toHaveAttribute("href", "/admin/support");
});

test("a customer's bell: order news and customer service answers, with links to their pages", async () => {
  const forSara = (id: number, type: Notification["type"], message: string, more: Partial<Notification>): Notification => ({
    id,
    type,
    message,
    userId: 7,
    productId: null,
    ticketId: null,
    orderId: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    product: null,
    ticket: null,
    ...more,
  });
  list.mockResolvedValue({
    unread: 2,
    items: [
      forSara(21, "ORDER_SHIPPED", "Your order #12 is on its way", { orderId: 12 }),
      forSara(20, "SUPPORT_ANSWER", "Customer service answered your message about Delivery", { ticketId: 4 }),
    ],
  });
  renderBell(new QueryClient(), "CUSTOMER");
  await userEvent.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));
  expect(screen.getByText("Your order #12 is on its way")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "See the order" })).toHaveAttribute("href", "/orders");
  expect(screen.getByRole("link", { name: "Read the answer" })).toHaveAttribute("href", "/help");
  expect(screen.getByRole("link", { name: "My orders →" })).toHaveAttribute("href", "/orders");
  expect(screen.queryByRole("link", { name: "Low stock →" })).not.toBeInTheDocument(); // no admin links
});

test("a customer with no notifications is told what will appear", async () => {
  list.mockResolvedValue({ unread: 0, items: [] });
  renderBell(new QueryClient(), "CUSTOMER");
  await userEvent.click(await screen.findByRole("button", { name: "Notifications, 0 unread" }));
  expect(screen.getByText(/We will tell you here when your order is on its way/)).toBeInTheDocument();
});
