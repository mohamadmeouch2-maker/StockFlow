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
  imageUrl?: string | null; // FR-17: e.g. "/uploads/products/product-1-....jpg", null = no photo
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
  issues?: OrderIssue[]; // problems reported with this order (in "my orders")
};

// A problem a customer reports with an order, and the store's answer.
export type IssueType = "WRONG_ITEM" | "DAMAGED" | "MISSING_ITEM" | "LATE_DELIVERY" | "OTHER";
export type IssueStatus = "OPEN" | "RESOLVED";
export type OrderIssue = {
  id: number;
  orderId: number;
  type: IssueType;
  message: string;
  status: IssueStatus;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { name: string; email: string }; // admin list only
  order?: Pick<Order, "id" | "status" | "total" | "createdAt" | "items">; // admin list only
};

export type ApiErrorBody = {
  error: { code: string; message: string; details: { field: string; message: string }[] };
};
