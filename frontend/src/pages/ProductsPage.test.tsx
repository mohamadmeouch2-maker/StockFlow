import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { productsApi } from "../api/products";
import type { Product } from "../api/types";
import { ProductsPage } from "./ProductsPage";

vi.spyOn(productsApi, "categories").mockResolvedValue([{ id: 1, name: "Office" }]);
const list = vi.spyOn(productsApi, "list");

const product = (id: number, stock: number): Product => ({
  id,
  name: `Item ${id}`,
  price: "5.00",
  stock,
  reorderLevel: 5,
  categoryId: 1,
  category: { id: 1, name: "Office" },
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

test('shows "No products match" for an empty result (FR-04)', async () => {
  list.mockResolvedValue({ items: [], page: 1, pageSize: 12, total: 0 });
  renderPage();
  expect(await screen.findByText("No products match your search.")).toBeInTheDocument();
});

test("shows products with their stock status and the page count (FR-04, FR-05)", async () => {
  list.mockResolvedValue({ items: [product(1, 50), product(2, 3), product(3, 0)], page: 1, pageSize: 12, total: 15 });
  renderPage();
  expect(await screen.findByText("Item 1")).toBeInTheDocument();
  expect(screen.getByText("In stock")).toBeInTheDocument();
  expect(screen.getByText("Low stock")).toBeInTheDocument();
  expect(screen.getByText("Out of stock")).toBeInTheDocument();
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
});

test("sorting and 'in stock only' are sent to the API and start again at page 1", async () => {
  list.mockResolvedValue({ items: [product(1, 50)], page: 1, pageSize: 12, total: 1 });
  renderPage();
  await userEvent.selectOptions(await screen.findByLabelText("Sort by"), "Price: low to high");
  await userEvent.click(screen.getByLabelText("In stock only"));
  await vi.waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sort: "price_asc", inStock: true })));
});
