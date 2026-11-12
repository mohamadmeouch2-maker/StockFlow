import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { AdminOrdersPage } from "./AdminOrdersPage";

// 45 orders in all: 20 per page, so 3 pages
const order = (id: number): Order => ({
  id,
  userId: 1,
  status: "DELIVERED",
  total: "10.00",
  delivery: "STANDARD",
  deliveryFee: "0.00",
  deliverBy: null,
  createdAt: "2026-11-01T10:00:00Z",
  items: [{ productId: 1, quantity: 1, unitPrice: "10.00", product: { name: "Stapler" } }],
  user: { name: `Customer ${id}`, email: `c${id}@test.dev` },
});
const all = vi.spyOn(ordersApi, "all").mockImplementation(async (_status, page) => ({
  items: Array.from({ length: page === 3 ? 5 : 20 }, (_, i) => order((page - 1) * 20 + i + 1)),
  page,
  pageSize: 20,
  total: 45,
}));
window.scrollTo = vi.fn(); // jsdom has no scrolling

test("orders come 20 per page, with Previous and Next buttons", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminOrdersPage />
    </QueryClientProvider>,
  );
  expect(await screen.findByText("Showing 1–20 of 45 orders")).toBeInTheDocument();
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Next/ }));
  expect(await screen.findByText("Showing 21–40 of 45 orders")).toBeInTheDocument();
  expect(screen.getByText("Customer 21")).toBeInTheDocument();
  expect(all).toHaveBeenLastCalledWith(undefined, 2);

  // A status filter starts again on page 1
  await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "DELIVERED");
  expect(all).toHaveBeenLastCalledWith("DELIVERED", 1);
});
