import { useEffect, useState, type ReactNode } from "react";
import type { Product } from "../api/types";
import { CartContext, type CartItem } from "./cartContext";

const STORAGE_KEY = "cart";

// FR-06: the cart lives in the browser (sessionStorage, so it survives a refresh).
// A quantity can never go above the product's stock. The server checks again when ordering.
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]"));

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const clamp = (quantity: number, product: Product) => Math.max(1, Math.min(quantity, product.stock));

  const add = (product: Product, quantity = 1) =>
    setItems((current) => {
      const existing = current.find((i) => i.product.id === product.id);
      if (!existing) return [...current, { product, quantity: clamp(quantity, product) }];
      return current.map((i) => (i === existing ? { product, quantity: clamp(i.quantity + quantity, product) } : i));
    });

  const setQuantity = (productId: number, quantity: number) =>
    setItems((current) => current.map((i) => (i.product.id === productId ? { ...i, quantity: clamp(quantity, i.product) } : i)));

  const remove = (productId: number) => setItems((current) => current.filter((i) => i.product.id !== productId));
  const clear = () => setItems([]);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return <CartContext.Provider value={{ items, count, add, setQuantity, remove, clear }}>{children}</CartContext.Provider>;
}
