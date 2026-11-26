import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { downloadFile, excelDateTime } from "../../utils/csv";
import { AdminOrdersPage } from "./AdminOrdersPage";

// The file is not really saved: the test reads what would be in it
vi.mock("../../utils/csv", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../utils/csv")>()), downloadFile: vi.fn() }));

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

test("Download for Excel saves every order with the chosen status, one row each", async () => {
  const pending = { ...order(7), status: "PENDING" as const, delivery: "EXPRESS" as const, deliveryFee: "7.00", total: "17.00" };
  const exportAll = vi
    .spyOn(ordersApi, "exportAll")
    .mockResolvedValue([{ ...pending, phone: "+961 70 000 101", city: "Beirut", address: "Hamra, Building 3" }]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminOrdersPage />
    </QueryClientProvider>,
  );
  await userEvent.selectOptions(await screen.findByLabelText("Filter by status"), "PENDING");
  await userEvent.click(screen.getByRole("button", { name: /Download for Excel/ }));
  expect(exportAll).toHaveBeenCalledWith("PENDING"); // all of them, not only this page
  await waitFor(() => expect(downloadFile).toHaveBeenCalled());

  const [name, text] = vi.mocked(downloadFile).mock.calls[0];
  expect(name).toMatch(/^stockflow-orders-pending-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(text.slice(1).split("\r\n")).toEqual([
    "Order,Date,Customer,Email,Phone number,City,Address,Items,Delivery,Delivery fee (USD),Total (USD),Status",
    `7,${excelDateTime(pending.createdAt)},Customer 7,c7@test.dev,'+961 70 000 101,Beirut,"Hamra, Building 3",1 × Stapler,Express,7,17,Pending`,
    "",
  ]);
});
