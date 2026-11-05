export type Role = "CUSTOMER" | "ADMIN";

export type User = { id: number; name: string; email: string; role: Role };

export type Category = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  description?: string | null; // null when the product has no description
  price: string; // Prisma Decimal arrives as a string
  stock: number;
  reorderLevel: number;
  categoryId: number;
  category?: Category;
};

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number };

export type OrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type Order = {
  id: number;
  userId: number;
  status: OrderStatus;
  total: string;
  createdAt: string;
  items: { productId: number; quantity: number; unitPrice: string; product: { name: string } }[];
  user?: { name: string; email: string }; // only in the admin list
};

export type ApiErrorBody = {
  error: { code: string; message: string; details: { field: string; message: string }[] };
};
