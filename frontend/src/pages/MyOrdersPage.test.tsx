import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import type { Order, Product } from "../api/types";
import { CartProvider } from "../cart/CartProvider";
import { MyOrdersPage } from "./MyOrdersPage";

const product = (id: number, name: string, stock: number): Product => ({ id, name, price: "4.50", stock, reorderLevel: 5, categoryId: 1 });
const order: Order = {
  id: 7,
  userId: 1,
  status: "DELIVERED",
  total: "19.00",
  delivery: "STANDARD",
  deliveryFee: "0.00",
  deliverBy: null,
  createdAt: "2026-11-01T10:00:00Z",
  items: [
    { productId: 1, quantity: 2, unitPrice: "4.50", product: { name: "Stapler" } },
    { productId: 2, quantity: 1, unitPrice: "10.00", product: { name: "Webcam" } },
  ],
  issues: [],
};
vi.spyOn(ordersApi, "mine").mockResolvedValue([order]);
vi.spyOn(productsApi, "get").mockImplementation(async (id) => (id === 1 ? product(1, "Stapler", 10) : product(2, "Webcam", 0)));

test("'Buy again' puts the products back in the cart and skips the sold-out ones", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CartProvider>
        <MemoryRouter initialEntries={["/orders"]}>
          <Routes>
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/cart" element={<p>Cart page</p>} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole("button", { name: /Buy again/ }));
  expect(await screen.findByText("Cart page")).toBeInTheDocument(); // it went to the cart
  const cart = JSON.parse(sessionStorage.getItem("cart") ?? "[]");
  expect(cart.map((i: { product: Product; quantity: number }) => [i.product.name, i.quantity])).toEqual([["Stapler", 2]]); // no sold-out webcam
});
