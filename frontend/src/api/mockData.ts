import type { Category, Product } from "./types";

// Fake data for Days 4–5. On Day 14 we replace it with the real API.

export const mockCategories: Category[] = [
  { id: 1, name: "Stationery" },
  { id: 2, name: "Electronics" },
  { id: 3, name: "Furniture" },
  { id: 4, name: "Cleaning" },
];

// 15 products, so the list has 2 pages (12 per page).
// Some have low stock and some have 0 stock, so we can test FR-05 stock status.
const products: Omit<Product, "category">[] = [
  { id: 1, name: "Stapler", description: "Metal stapler for up to 25 sheets.", price: "4.50", stock: 40, reorderLevel: 10, categoryId: 1 },
  { id: 2, name: "Ballpoint Pens (12 pack)", description: "Blue ink, medium tip.", price: "3.20", stock: 120, reorderLevel: 20, categoryId: 1 },
  { id: 3, name: "A4 Paper (500 sheets)", description: "80 gsm white copy paper.", price: "6.99", stock: 4, reorderLevel: 10, categoryId: 1 },
  { id: 4, name: "Sticky Notes", description: "Yellow, 76 x 76 mm, 12 pads.", price: "2.75", stock: 0, reorderLevel: 5, categoryId: 1 },
  { id: 5, name: "Highlighter Set", description: "Four colours.", price: "5.40", stock: 25, reorderLevel: 5, categoryId: 1 },
  { id: 6, name: "Wireless Mouse", description: "2.4 GHz with USB receiver.", price: "18.99", stock: 15, reorderLevel: 5, categoryId: 2 },
  { id: 7, name: "USB Keyboard", description: "Full size, quiet keys.", price: "24.50", stock: 3, reorderLevel: 5, categoryId: 2 },
  { id: 8, name: "HDMI Cable 2m", price: "9.99", stock: 60, reorderLevel: 10, categoryId: 2 },
  { id: 9, name: "LED Desk Lamp", description: "Three brightness levels.", price: "29.00", stock: 0, reorderLevel: 5, categoryId: 2 },
  { id: 10, name: "Office Chair", description: "Adjustable height, mesh back.", price: "149.00", stock: 8, reorderLevel: 3, categoryId: 3 },
  { id: 11, name: "Filing Cabinet", description: "Three drawers, lockable.", price: "89.90", stock: 2, reorderLevel: 3, categoryId: 3 },
  { id: 12, name: "Monitor Stand", price: "34.75", stock: 12, reorderLevel: 3, categoryId: 3 },
  { id: 13, name: "Hand Sanitizer 500ml", description: "70% alcohol.", price: "3.99", stock: 80, reorderLevel: 15, categoryId: 4 },
  { id: 14, name: "Paper Towels (6 rolls)", price: "7.25", stock: 5, reorderLevel: 5, categoryId: 4 },
  { id: 15, name: "Disinfectant Wipes", description: "Pack of 80 wipes.", price: "4.80", stock: 0, reorderLevel: 10, categoryId: 4 },
];

// Add the category object to each product, like the real API does.
export const mockProducts: Product[] = products.map((p) => ({
  ...p,
  category: mockCategories.find((c) => c.id === p.categoryId),
}));
