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
  viewCount?: number; // how many times the product page was opened
  rating?: Rating; // average rating out of 10
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

// Ratings out of 10. average is null while nobody has rated the product.
export type Rating = { average: number | null; count: number };
export type Review = {
  id: number;
  userId: number;
  userName: string;
  rating: number; // 1 to 10
  comment: string | null;
  createdAt: string;
  updatedAt: string;
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

// An automatic stock alert for the admins (the bell in the admin menu).
export type Notification = {
  id: number;
  type: "LOW_STOCK" | "OUT_OF_STOCK";
  message: string; // e.g. "Stapler is low on stock: 4 left (reorder level 5)"
  productId: number;
  readAt: string | null; // null = not read yet
  createdAt: string;
  product: { name: string; imageUrl: string | null };
};

export type ApiErrorBody = {
  error: { code: string; message: string; details: { field: string; message: string }[] };
};
