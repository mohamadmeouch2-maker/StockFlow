import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { reportsApi, type Summary } from "../../api/reports";
import { DashboardPage } from "./DashboardPage";

// 30 days of sales, $15 a day (one order a day).
const salesByDay = Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, orders: 1, revenue: "15.00" }));
const summary: Summary = {
  days: 30,
  products: { total: 25, lowStock: 11, soldOut: 6 },
  openIssues: 2,
  thisWeek: { orders: 7, revenue: "105.00" },
  lastWeek: { orders: 5, revenue: "70.00" },
  ordersByStatus: { PENDING: 5, SHIPPED: 6, DELIVERED: 17, CANCELLED: 2 },
  salesByDay,
  bestSellers: [
    { productId: 10, name: "Office Chair", imageUrl: null, sold: 14 },
    { productId: 3, name: "A4 Paper (500 sheets)", imageUrl: null, sold: 11 },
  ],
};
const load = vi.spyOn(reportsApi, "summary").mockImplementation(async (days = 30) => ({ ...summary, days, salesByDay: salesByDay.slice(-days) }));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

test("the number tiles show this week's sales and orders, compared with the week before", async () => {
  renderPage();
  const sales = (await screen.findByText("Sales, last 7 days")).closest(".card");
  expect(sales).toHaveTextContent("$105.00");
  expect(sales).toHaveTextContent("▲ 50% vs the week before"); // $105 against $70
  const orders = screen.getByText("Orders, last 7 days").closest(".card");
  expect(orders).toHaveTextContent("7");
  expect(orders).toHaveTextContent("5 the week before");
});

test("restocking and open problems are shown and link to their pages", async () => {
  renderPage();
  const restock = await screen.findByRole("link", { name: /Need restocking/ });
  expect(restock).toHaveTextContent("11");
  expect(restock).toHaveTextContent("6 sold out");
  expect(restock).toHaveAttribute("href", "/admin/low-stock");
  expect(screen.getByRole("link", { name: /Open problems/ })).toHaveAttribute("href", "/admin/support");
});

test("best sellers, orders by status and the sales table are listed", async () => {
  renderPage();
  expect(await screen.findByRole("link", { name: "Office Chair" })).toHaveAttribute("href", "/products/10");
  expect(screen.getByText("14 sold")).toBeInTheDocument();
  expect(screen.getByText("30 orders in the last 30 days")).toBeInTheDocument();
  // The table under the chart has one row per day
  expect(screen.getByText("Show as a table")).toBeInTheDocument();
  expect(screen.getAllByText("$15.00")).toHaveLength(30);
});

test("choosing another period loads the numbers for those days (FR-14)", async () => {
  renderPage();
  expect(await screen.findByRole("button", { name: "Last 30 days" })).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
  expect(load).toHaveBeenLastCalledWith(7);
  expect(await screen.findByText("Pieces sold in the last 7 days")).toBeInTheDocument();
  expect(screen.getAllByText("$15.00")).toHaveLength(7);
});
