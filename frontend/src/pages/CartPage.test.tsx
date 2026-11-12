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

vi.spyOn(ordersApi, "deliveryOptions").mockResolvedValue([
  { id: "STANDARD", label: "Standard delivery", fee: "0.00", minDays: 3, maxDays: 5 },
  { id: "EXPRESS", label: "Express delivery", fee: "4.50", minDays: 1, maxDays: 1 },
]);
const savedAddress = vi.spyOn(ordersApi, "savedAddress");
const create = vi.spyOn(ordersApi, "create").mockResolvedValue({ id: 41, deliverBy: new Date().toISOString() } as Order);

beforeEach(() => {
  sessionStorage.setItem("cart", JSON.stringify([{ product: stapler, quantity: 2 }]));
  savedAddress.mockResolvedValue(null); // a first order: nothing to fill in
  create.mockClear();
});

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
const typed = { phone: "70 123 456", city: "Beirut", address: "Hamra Street, Building 12, 3rd floor" };
const fillAddress = async () => {
  await userEvent.type(screen.getByLabelText("Phone number"), typed.phone);
  await userEvent.type(screen.getByLabelText("City"), typed.city);
  await userEvent.type(screen.getByLabelText("Address"), typed.address);
};

test("standard delivery is chosen first and is free", async () => {
  renderCart();
  expect(await screen.findByRole("radio", { name: /Standard delivery/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Standard delivery/ })).toHaveAccessibleName(/3–5 days/);
  expect(totalRow()).toHaveTextContent("$9.00");
});

test("choosing Express adds $4.50 to the total and sends EXPRESS with the order and the address", async () => {
  renderCart();
  await userEvent.click(await screen.findByRole("radio", { name: /Express delivery/ }));
  expect(screen.getByRole("radio", { name: /Express delivery/ })).toHaveAccessibleName(/Next day/);
  expect(totalRow()).toHaveTextContent("$13.50"); // $9.00 + $4.50

  await fillAddress();
  await userEvent.click(screen.getByRole("button", { name: "Place order" }));
  expect(create).toHaveBeenCalledWith([{ productId: 5, quantity: 2 }], "EXPRESS", typed);
});

test("the order needs a phone number, a city and an address", async () => {
  renderCart();
  await userEvent.click(await screen.findByRole("button", { name: "Place order" }));
  expect(await screen.findByText("Enter a valid phone number, for example +961 70 123 456")).toBeInTheDocument();
  expect(screen.getByText("Enter the city")).toBeInTheDocument();
  expect(screen.getByText("Enter the street, building and floor")).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
});

test("the address of the last order is filled in, so ordering again is one click", async () => {
  const saved = { phone: "+961 70 000 101", city: "Beirut", address: "Hamra Street, Cedar Building, 3rd floor" };
  savedAddress.mockResolvedValue({ ...saved, from: "last-order" });
  renderCart();
  expect(await screen.findByText(/Filled in from your last order/)).toBeInTheDocument();
  expect(screen.getByLabelText("Phone number")).toHaveValue(saved.phone);
  expect(screen.getByLabelText("Address")).toHaveValue(saved.address);

  await userEvent.click(screen.getByRole("button", { name: "Place order" }));
  expect(create).toHaveBeenCalledWith([{ productId: 5, quantity: 2 }], "STANDARD", saved);
});

test("the address saved in My account comes first", async () => {
  savedAddress.mockResolvedValue({ phone: "03 555 777", city: "Zahle", address: "Brazil Street, Nour Building", from: "account" });
  renderCart();
  expect(await screen.findByText(/Filled in from My account/)).toBeInTheDocument();
  expect(screen.getByLabelText("City")).toHaveValue("Zahle");
});
