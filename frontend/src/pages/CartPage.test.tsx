import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { ordersApi } from "../api/orders";
import type { Order } from "../api/types";
import { CartProvider } from "../cart/CartProvider";
import { CartPage } from "./CartPage";

// 2 staplers at $4.50 are already in the cart
const stapler = { id: 5, name: "Stapler", price: "4.50", stock: 10, reorderLevel: 5, categoryId: 1, imageUrl: null };
beforeEach(() => sessionStorage.setItem("cart", JSON.stringify([{ product: stapler, quantity: 2 }])));

vi.spyOn(ordersApi, "deliveryOptions").mockResolvedValue([
  { id: "STANDARD", label: "Standard delivery", fee: "0.00", minDays: 3, maxDays: 5 },
  { id: "EXPRESS", label: "Express delivery", fee: "9.99", minDays: 1, maxDays: 1 },
]);
const create = vi.spyOn(ordersApi, "create").mockResolvedValue({ id: 41, deliverBy: new Date().toISOString() } as Order);

const renderCart = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CartProvider>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
const totalRow = () => screen.getByText("Total").parentElement;

test("standard delivery is chosen first and is free", async () => {
  renderCart();
  expect(await screen.findByRole("radio", { name: /Standard delivery/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Standard delivery/ })).toHaveAccessibleName(/3–5 days/);
  expect(totalRow()).toHaveTextContent("$9.00");
});

test("choosing Express adds $9.99 to the total and sends EXPRESS with the order", async () => {
  renderCart();
  await userEvent.click(await screen.findByRole("radio", { name: /Express delivery/ }));
  expect(screen.getByRole("radio", { name: /Express delivery/ })).toHaveAccessibleName(/Next day/);
  expect(totalRow()).toHaveTextContent("$18.99"); // $9.00 + $9.99

  await userEvent.click(screen.getByRole("button", { name: "Place order" }));
  expect(create).toHaveBeenCalledWith([{ productId: 5, quantity: 2 }], "EXPRESS");
});
