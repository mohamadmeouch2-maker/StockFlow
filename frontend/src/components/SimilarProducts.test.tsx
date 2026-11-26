import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { productsApi } from "../api/products";
import type { Product } from "../api/types";
import { SimilarProducts } from "./SimilarProducts";

const product = (id: number, name: string, extra: Partial<Product> = {}): Product =>
  ({ id, name, price: "10.00", stock: 5, reorderLevel: 6, categoryId: 1, imageUrl: null, category: { id: 1, name: "Office" }, ...extra }) as Product;

const renderFor = (productId: number) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SimilarProducts productId={productId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

test("You may also like shows the server's suggestions, each a link to its page, with the sale price", async () => {
  const similar = vi
    .spyOn(productsApi, "similar")
    .mockResolvedValue([
      product(2, "Blue Mug", { salePrice: "7.00", promotion: { id: 1, name: "Christmas Sale", percent: 30, endsAt: "2026-12-31T00:00:00Z" } }),
      product(3, "Desk Lamp", { rating: { average: 8.5, count: 4 } }),
    ]);
  renderFor(1);
  const section = await screen.findByRole("region", { name: "You may also like" });
  expect(similar).toHaveBeenCalledWith(1);
  expect(within(section).getByRole("link", { name: "Blue Mug" })).toHaveAttribute("href", "/products/2");
  expect(within(section).getByRole("link", { name: "Desk Lamp" })).toHaveAttribute("href", "/products/3");
  expect(section).toHaveTextContent("$7.00"); // the sale price
  expect(section).toHaveTextContent("8.5"); // a rated product shows its rating
});

test("nothing to suggest: no empty section", async () => {
  const similar = vi.spyOn(productsApi, "similar").mockResolvedValue([]);
  renderFor(5);
  await vi.waitFor(() => expect(similar).toHaveBeenCalled());
  expect(screen.queryByRole("region", { name: "You may also like" })).not.toBeInTheDocument();
});
