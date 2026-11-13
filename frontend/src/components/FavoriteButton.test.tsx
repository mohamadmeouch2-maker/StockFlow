import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { favoritesApi } from "../api/favorites";
import type { Product } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { FavoriteButton } from "./FavoriteButton";

const stapler: Product = { id: 5, name: "Stapler", price: "4.50", stock: 10, reorderLevel: 5, categoryId: 1 };
const list = vi.spyOn(favoritesApi, "list");
const add = vi.spyOn(favoritesApi, "add").mockResolvedValue(undefined);
const remove = vi.spyOn(favoritesApi, "remove").mockResolvedValue(undefined);
beforeEach(() => {
  add.mockClear();
  remove.mockClear();
});

const as = (role: "CUSTOMER" | "ADMIN") =>
  ({
    user: { id: 1, name: "Sara", email: "sara@test.dev", role },
    loading: false,
    login: vi.fn(),
    startSession: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  }) as AuthState;
const renderHeart = (auth: AuthState | null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={auth}>
        <FavoriteButton product={stapler} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

test("a customer saves a product with the heart", async () => {
  list.mockResolvedValue([]);
  renderHeart(as("CUSTOMER"));
  const heart = await screen.findByRole("button", { name: "Save Stapler to favourites" });
  await vi.waitFor(() => expect(heart).toBeEnabled()); // the list has loaded
  expect(heart).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(heart);
  expect(add).toHaveBeenCalledWith(5);
});

test("a saved product shows a full heart, and clicking it removes the favourite", async () => {
  list.mockResolvedValue([stapler]);
  renderHeart(as("CUSTOMER"));
  const heart = await screen.findByRole("button", { name: "Remove Stapler from favourites" });
  expect(heart).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(heart);
  expect(remove).toHaveBeenCalledWith(5);
});

test("guests and admins don't see the heart", () => {
  renderHeart(null);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  renderHeart(as("ADMIN"));
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
