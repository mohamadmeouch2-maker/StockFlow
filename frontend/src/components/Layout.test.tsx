import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { favoritesApi } from "../api/favorites";
import { notificationsApi } from "../api/notifications";
import { promotionsApi } from "../api/promotions";
import { supportApi } from "../api/support";
import type { SupportTicket, User } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { CartContext, type CartState } from "../cart/cartContext";
import { Layout } from "./Layout";

const sara: User = { id: 3, name: "Sara", email: "sara@test.dev", role: "CUSTOMER" };
const admin: User = { id: 1, name: "Admin", email: "admin@test.dev", role: "ADMIN" };

beforeEach(() => {
  vi.spyOn(promotionsApi, "current").mockResolvedValue(null);
  vi.spyOn(favoritesApi, "list").mockResolvedValue([]);
  vi.spyOn(notificationsApi, "list").mockResolvedValue({ unread: 0, items: [] });
  vi.spyOn(supportApi, "all").mockResolvedValue([{ id: 1 }, { id: 2 }] as SupportTicket[]); // waiting for an answer
  vi.spyOn(supportApi, "mine").mockResolvedValue([]);
});

const visit = (user: User | null, cartCount = 0) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={{ user, loading: false, login: vi.fn(), startSession: vi.fn(), logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
        <CartContext.Provider value={{ items: [], count: cartCount, add: vi.fn(), setQuantity: vi.fn(), remove: vi.fn(), clear: vi.fn() } as CartState}>
          <MemoryRouter initialEntries={["/products"]}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/products" element={<p>Products page</p>} />
                <Route path="/orders" element={<p>My orders page</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </CartContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

const menuButton = () => screen.getByRole("button", { name: /^Menu/ });
const menu = () => screen.getByRole("dialog", { name: "Menu" });

test("the page links are in the ☰ menu; a link opens its page and closes the menu", async () => {
  visit(sara, 2);
  expect(menuButton()).toHaveAccessibleName("Menu");
  // The cart is in the top bar, with its number of items
  expect(screen.getByRole("link", { name: "Cart: 2 items in the cart" })).toHaveAttribute("href", "/cart");
  expect(menuButton()).toHaveAttribute("aria-expanded", "false");

  await userEvent.click(menuButton());
  expect(menuButton()).toHaveAttribute("aria-expanded", "true");
  for (const name of ["Products", /^Cart\s*2$/, "Favourites", "My orders", "Customer service", "My account"]) {
    expect(within(menu()).getByRole("link", { name })).toBeInTheDocument();
  }
  expect(document.body.style.overflow).toBe("hidden"); // the page behind can't scroll

  await userEvent.click(within(menu()).getByRole("link", { name: "My orders" }));
  expect(screen.getByText("My orders page")).toBeInTheDocument();
  expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  expect(document.body.style.overflow).toBe("");
});

test("Escape and ✕ close the menu, and the focus goes back to ☰", async () => {
  visit(sara);
  await userEvent.click(menuButton());
  expect(within(menu()).getByRole("link", { name: "Products" })).toHaveFocus(); // keyboard users start on the first link
  await userEvent.keyboard("{Escape}");
  expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  expect(menuButton()).toHaveFocus();

  await userEvent.click(menuButton());
  await userEvent.click(screen.getByRole("button", { name: "Close menu" }));
  expect(menuButton()).toHaveAttribute("aria-expanded", "false");
});

test("admins get the admin pages in the menu, and ☰ shows the messages waiting for an answer", async () => {
  visit(admin);
  expect(await screen.findByRole("button", { name: "Menu, 2 messages waiting for an answer" })).toBeInTheDocument();
  await userEvent.click(menuButton());
  for (const name of ["Dashboard", "Manage products", "Categories", "Manage orders", "Low stock", /^Customer service\s*2$/]) {
    expect(within(menu()).getByRole("link", { name })).toBeInTheDocument();
  }
  expect(within(menu()).queryByRole("link", { name: /Cart/ })).not.toBeInTheDocument();
});

test("visitors who are not logged in find Log in and Register in the menu too", async () => {
  visit(null);
  await userEvent.click(menuButton());
  expect(within(menu()).getByRole("link", { name: "Log in" })).toBeInTheDocument();
  expect(within(menu()).getByRole("link", { name: "Register" })).toBeInTheDocument();
});

test("a new answer from customer service shows on ☰ and next to Customer service", async () => {
  vi.spyOn(supportApi, "mine").mockResolvedValue([
    { id: 7, customerUnread: true },
    { id: 8, customerUnread: false },
  ] as SupportTicket[]);
  visit(sara, 3);
  expect(await screen.findByRole("button", { name: "Menu, 1 new reply from customer service" })).toBeInTheDocument();
  await userEvent.click(menuButton());
  expect(within(menu()).getByRole("link", { name: /^Customer service\s*1$/ })).toHaveAttribute("href", "/help");
});

test("admins and visitors have no cart in the top bar", () => {
  visit(admin);
  expect(screen.queryByRole("link", { name: /^Cart:/ })).not.toBeInTheDocument();
});

test("logged-in people get the assistant button; visitors don't", () => {
  const { unmount } = visit(sara);
  expect(screen.getByRole("button", { name: "Ask the StockFlow assistant" })).toBeInTheDocument();
  unmount();
  visit(null);
  expect(screen.queryByRole("button", { name: "Ask the StockFlow assistant" })).not.toBeInTheDocument();
});
