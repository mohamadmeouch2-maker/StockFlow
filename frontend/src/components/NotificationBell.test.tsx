import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { notificationsApi } from "../api/notifications";
import type { Notification } from "../api/types";
import { ToastProvider } from "../toast/ToastProvider";
import { NotificationBell } from "./NotificationBell";

const alert = (id: number, type: Notification["type"], message: string, readAt: string | null): Notification => ({
  id,
  type,
  message,
  productId: id + 10,
  readAt,
  createdAt: new Date().toISOString(),
  product: { name: "Product", imageUrl: null },
});
const lowStapler = alert(1, "LOW_STOCK", "Stapler is low on stock: 4 left (reorder level 5)", "2026-11-10T10:00:00Z");
const soldOutTape = alert(2, "OUT_OF_STOCK", "Tape is sold out", null);

const list = vi.spyOn(notificationsApi, "list");
const readAll = vi.spyOn(notificationsApi, "readAll").mockResolvedValue(undefined);
beforeEach(() => readAll.mockClear());

const renderBell = (client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );

test("the bell shows how many alerts are unread, and the list opens with a Restock link", async () => {
  list.mockResolvedValue({ unread: 1, items: [soldOutTape, lowStapler] });
  renderBell();
  const bell = await screen.findByRole("button", { name: "Stock alerts, 1 unread" });
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
  expect(screen.getByRole("button", { name: "Stock alerts, 0 unread" })).toBeInTheDocument();
  expect(screen.queryByText("Tape is sold out")).not.toBeInTheDocument();

  // The next check finds a new alert
  list.mockResolvedValue({ unread: 1, items: [soldOutTape, lowStapler] });
  await act(() => client.invalidateQueries({ queryKey: ["notifications"] }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Tape is sold out");
});
