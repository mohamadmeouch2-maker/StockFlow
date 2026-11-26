import type { Prisma, Role } from "@prisma/client";
import { salePrice } from "../../lib/pricing";
import { prisma } from "../../lib/prisma";
import type { OllamaTool, OllamaToolCall } from "./ollama";

// What the assistant may look up. Every tool only READS data, and the server decides what each
// person may see: a customer's tools only ever return that customer's own orders (the user id
// comes from the login token, never from the AI), and only admins get the shop's numbers.

type Who = { id: number; role: Role };
type Args = Record<string, unknown>;
type ToolDef = { roles: Role[]; tool: OllamaTool; run: (args: Args, who: Who) => Promise<unknown> };

const fn = (name: string, description: string, properties: object = {}): OllamaTool => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required: [] } },
});
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const number = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const itemsText = (items: { quantity: number; product: { name: string } }[]) => items.map((i) => `${i.quantity} × ${i.product.name}`).join(", ");

const TOOLS: Record<string, ToolDef> = {
  search_products: {
    roles: ["CUSTOMER", "ADMIN"],
    tool: fn(
      "search_products",
      "Find products in the shop: name, price in US dollars (sale price during a sale), stock and category. Product names are in English, so search with English words. With no query, it lists products. For products on sale (discounts, offers, promotions), use on_sale_only: product names don't contain the word 'sale'.",
      {
        query: { type: "string", description: "English words from the product name or description, e.g. 'paper' or 'chair'" },
        category: { type: "string", description: "Only this category (see list_categories)" },
        max_price: { type: "number", description: "Only products at or below this price in US dollars" },
        in_stock_only: { type: "boolean", description: "Leave out sold-out products" },
        on_sale_only: { type: "boolean", description: "Only the products on sale right now (with their discount)" },
      },
    ),
    async run(args) {
      let query = text(args.query);
      const category = text(args.category);
      // A small model may still search for the word "sale": that means "the products on sale"
      const saleWord = /^(on )?(sales?|discounts?|offers?|promotions?|promos?)$/i.test(query);
      if (saleWord) query = "";
      const onSale = args.on_sale_only === true || saleWord;
      const where: Prisma.ProductWhereInput = {
        ...(onSale && { promotion: { endsAt: { gt: new Date() } } }), // a sale counts until its end date
        ...(query && {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { category: { name: { contains: query, mode: "insensitive" } } },
          ],
        }),
        ...(category && { category: { name: { equals: category, mode: "insensitive" } } }),
        ...(args.in_stock_only === true && { stock: { gt: 0 } }),
      };
      const rows = await prisma.product.findMany({ where, include: { category: true, promotion: true }, orderBy: { name: "asc" }, take: 40 });
      const maxPrice = Number(args.max_price);
      return rows
        .map((p) => {
          const sale = salePrice(p);
          const price = sale ?? p.price;
          return {
            id: p.id,
            name: p.name,
            category: p.category.name,
            price: `$${price.toFixed(2)}`,
            ...(sale && { normal_price: `$${p.price.toFixed(2)}`, sale: `-${p.promotion!.percent}%`, sale_until: day(p.promotion!.endsAt) }),
            stock: p.stock === 0 ? "sold out" : p.stock <= p.reorderLevel ? `low stock (${p.stock} left)` : "in stock",
            priceValue: Number(price),
          };
        })
        .filter((p) => !(maxPrice > 0) || p.priceValue <= maxPrice)
        .slice(0, 12) // enough for a whole sale, small enough for the AI to read quickly
        .map(({ priceValue: _ignored, ...p }) => p);
    },
  },

  list_categories: {
    roles: ["CUSTOMER", "ADMIN"],
    tool: fn("list_categories", "The shop's real product categories and how many products each has: use it when asked what the shop sells."),
    async run() {
      const rows = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
      return rows.map((c) => ({ name: c.name, products: c._count.products }));
    },
  },

  my_orders: {
    roles: ["CUSTOMER"],
    tool: fn("my_orders", "The customer's own most recent orders: status, items, total in US dollars, delivery and expected day.", {
      limit: { type: "number", description: "How many orders, 1 to 10 (default 5)" },
    }),
    async run(args, who) {
      const orders = await prisma.order.findMany({
        where: { userId: who.id }, // only this customer's orders, whatever the AI asks
        include: { items: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: number(args.limit, 1, 10, 5),
      });
      if (orders.length === 0) return { orders: [], note: "This customer has no orders yet." };
      return orders.map((o) => ({
        order: `#${o.id}`,
        placed: day(o.createdAt),
        status: o.status.toLowerCase(),
        items: itemsText(o.items),
        total: `$${o.total.toFixed(2)}`,
        delivery: o.delivery.toLowerCase(),
        expected_by: o.status === "PENDING" || o.status === "SHIPPED" ? day(o.deliverBy) : null,
        shipped: day(o.shippedAt),
        delivered: day(o.deliveredAt),
      }));
    },
  },

  low_stock: {
    roles: ["ADMIN"],
    tool: fn("low_stock", "Products that are sold out or running low (at or below their reorder level), the most urgent first, to restock."),
    async run() {
      const rows = await prisma.product.findMany({
        where: { stock: { lte: prisma.product.fields.reorderLevel } },
        orderBy: [{ stock: "asc" }, { name: "asc" }],
        take: 20,
      });
      if (rows.length === 0) return { count: 0, sold_out: 0, products: [], note: "Every product has enough stock." };
      // The counts help a small model mention every product, not just the first few
      return {
        count: rows.length,
        sold_out: rows.filter((p) => p.stock === 0).length,
        products: rows.map((p) => ({ name: p.name, stock: p.stock, reorder_level: p.reorderLevel, status: p.stock === 0 ? "sold out" : "low" })),
      };
    },
  },

  sales_summary: {
    roles: ["ADMIN"],
    tool: fn("sales_summary", "Sales of the last days: number of orders, revenue in US dollars (cancelled orders not counted) and the 5 best sellers.", {
      days: { type: "number", description: "How many days back, 1 to 90 (default 7)" },
    }),
    async run(args) {
      const days = number(args.days, 1, 90, 7);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (days - 1));
      const sale = { createdAt: { gte: from }, status: { not: "CANCELLED" as const } };
      const [orders, best] = await Promise.all([
        prisma.order.aggregate({ where: sale, _count: { _all: true }, _sum: { total: true } }),
        prisma.orderItem.groupBy({ by: ["productId"], where: { order: sale }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
      ]);
      const names = await prisma.product.findMany({ where: { id: { in: best.map((b) => b.productId) } }, select: { id: true, name: true } });
      return {
        days,
        orders: orders._count._all,
        revenue: `$${(orders._sum.total ?? 0).toString()}`,
        best_sellers: best.map((b) => ({ name: names.find((n) => n.id === b.productId)?.name, sold: b._sum.quantity ?? 0 })),
      };
    },
  },

  orders_to_ship: {
    roles: ["ADMIN"],
    tool: fn("orders_to_ship", "Pending orders waiting to be shipped, the oldest first, with express orders marked."),
    async run() {
      const orders = await prisma.order.findMany({
        where: { status: "PENDING" },
        include: { user: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: "asc" },
        take: 15,
      });
      if (orders.length === 0) return { orders: [], note: "No order is waiting to be shipped." };
      return orders.map((o) => ({
        order: `#${o.id}`,
        customer: o.user.name,
        placed: day(o.createdAt),
        delivery: o.delivery.toLowerCase(),
        due: day(o.deliverBy),
        items: itemsText(o.items),
        total: `$${o.total.toFixed(2)}`,
      }));
    },
  },
};

// The tools this person may use (what the AI is told about).
export const toolsFor = (role: Role) =>
  Object.values(TOOLS)
    .filter((t) => t.roles.includes(role))
    .map((t) => t.tool);

// Runs one tool call from the AI. A tool this person may not use (or that doesn't exist) is refused,
// even if the AI asks for it; an error becomes a short message the AI can explain.
export async function runTool(call: OllamaToolCall, who: Who): Promise<unknown> {
  const def = TOOLS[call.function.name];
  if (!def || !def.roles.includes(who.role)) return { error: "This tool is not available." };
  try {
    return await def.run(call.function.arguments ?? {}, who);
  } catch (err) {
    console.error(`Assistant tool ${call.function.name} failed:`, err);
    return { error: "Could not read this information right now." };
  }
}
