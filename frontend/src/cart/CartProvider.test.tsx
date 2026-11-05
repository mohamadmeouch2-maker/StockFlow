import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import type { Product } from "../api/types";
import { CartProvider } from "./CartProvider";
import { useCart } from "./useCart";

const stapler: Product = { id: 1, name: "Stapler", price: "4.50", stock: 2, reorderLevel: 5, categoryId: 1 };

test("the cart never allows more than the stock (FR-06)", () => {
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => result.current.add(stapler));
  act(() => result.current.add(stapler));
  act(() => result.current.add(stapler)); // a third one: only 2 in stock
  expect(result.current.items[0].quantity).toBe(2);

  act(() => result.current.setQuantity(1, 99));
  expect(result.current.items[0].quantity).toBe(2);
  expect(result.current.count).toBe(2);
});

test("remove and clear empty the cart", () => {
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => result.current.add(stapler));
  act(() => result.current.remove(1));
  expect(result.current.items).toHaveLength(0);
  act(() => result.current.add(stapler));
  act(() => result.current.clear());
  expect(result.current.count).toBe(0);
});
