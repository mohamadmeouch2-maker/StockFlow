import { createContext } from "react";
import type { Product } from "../api/types";

export type CartItem = { product: Product; quantity: number };

export type CartState = {
  items: CartItem[];
  count: number; // total number of pieces, shown in the nav bar
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

export const CartContext = createContext<CartState | null>(null);
