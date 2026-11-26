export type Role = "CUSTOMER" | "ADMIN";

export type User = { id: number; name: string; email: string; role: Role };
// What the API sends after a login (or after the email code): the token and who it belongs to.
export type Session = { token: string; user: User };

// My account: the user plus the saved delivery address (all null = none saved)
export type Account = User & { phone: string | null; city: string | null; address: string | null; createdAt: string };

export type Category = { id: number; name: string; productCount?: number }; // productCount: how many products are in it

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
  salePrice?: string | null; // the price during a sale (e.g. 30% off for Christmas), null = no sale
  promotion?: Promotion | null; // the sale this product is in
  categoryId: number;
  category?: Category;
};

// A sale campaign: a percentage off some products until a date (e.g. "Christmas Sale", 30%).
export type Promotion = { id: number; name: string; percent: number; endsAt: string; productCount?: number };

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number };

export type OrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

// How fast the order arrives. Express costs more (the API sets the price).
export type DeliveryMethod = "STANDARD" | "EXPRESS";
// freeFrom: the items' total from which this delivery is free ("60.00"), or null if it never is
export type DeliveryOption = { id: DeliveryMethod; label: string; fee: string; freeFrom: string | null; minDays: number; maxDays: number };

// Where to bring the order, typed in the cart.
export type ShipTo = { phone: string; city: string; address: string };
// The address the cart fills in: saved in My account, or else from the last order
export type SavedAddress = ShipTo & { from: "account" | "last-order" };

export type Order = {
  id: number;
  userId: number;
  status: OrderStatus;
  total: string; // products + delivery fee
  delivery: DeliveryMethod;
  deliveryFee: string;
  deliverBy: string | null; // the latest expected arrival day
  // Where to deliver. null only for orders from before Nov 11.
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  // When each step happened (tracking timeline). null = not yet, or unknown for orders from before Nov 11.
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  items: { productId: number; quantity: number; unitPrice: string; product: { name: string } }[];
  user?: { name: string; email: string }; // only in the admin list
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

// Customer service: a conversation between a customer (or a visitor) and the store.
export type SupportTopic = "SIGN_IN" | "ORDER" | "DELIVERY" | "RETURN" | "PAYMENT" | "CHANGE" | "OTHER";
export type SupportStatus = "OPEN" | "ANSWERED" | "RESOLVED"; // waiting for the store / waiting for the customer / solved
export type SupportMessage = { id: number; author: "CUSTOMER" | "STAFF"; body: string; createdAt: string };
export type SupportTicket = {
  id: number;
  userId: number | null; // null = a visitor who was not logged in
  name: string;
  email: string; // where answers are emailed
  topic: SupportTopic;
  orderId: number | null;
  status: SupportStatus;
  customerUnread: boolean; // the store answered and the customer hasn't seen it yet
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[]; // oldest first
  order: { id: number; status: OrderStatus; total: string; createdAt: string; items: { quantity: number; product: { name: string } }[] } | null;
};

// A notification in the bell: for the admins (stock alerts, customer messages) or for one customer (order news, answers).
export type Notification = {
  id: number;
  // For the admins: LOW_STOCK, OUT_OF_STOCK, SUPPORT_MESSAGE. For one customer: ORDER_*, SUPPORT_ANSWER.
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "SUPPORT_MESSAGE" | "ORDER_SHIPPED" | "ORDER_DELIVERED" | "ORDER_CANCELLED" | "SUPPORT_ANSWER";
  message: string; // e.g. "Stapler is low on stock: 4 left (reorder level 5)" or "Your order #12 is on its way"
  userId: number | null; // null = for the admins
  productId: number | null; // stock alerts
  ticketId: number | null; // customer service
  orderId: number | null; // a customer's order
  readAt: string | null; // null = not read yet
  createdAt: string;
  product: { name: string; imageUrl: string | null } | null;
  ticket: { id: number; topic: SupportTopic; name: string } | null;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details: { field: string; message: string }[] };
};
