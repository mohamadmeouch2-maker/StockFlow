import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// Admin reports. (The guide puts reports in the .NET API, which is out of scope, so they live here.)
export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("ADMIN"));

// FR-16: products whose stock is at or below their reorder level, so the admin restocks in time.
reportsRouter.get("/low-stock", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { stock: { lte: prisma.product.fields.reorderLevel } }, // compares two columns of the same row
    include: { category: true },
    orderBy: [{ stock: "asc" }, { name: "asc" }], // most urgent first
  });
  res.json(
    products.map((p) => ({ productId: p.id, name: p.name, imageUrl: p.imageUrl, category: p.category.name, stock: p.stock, reorderLevel: p.reorderLevel })),
  );
});

// "2026-11-06" in the server's own time zone (so "today" means the store's today).
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Midnight, n days ago (0 = today).
const midnight = (daysAgo: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
};

// ?days=30: the period the chart, the status counts and the best sellers cover (default 30, like FR-14).
const summaryQuery = z.object({ days: z.coerce.number().int().min(7, "At least 7 days").max(90, "At most 90 days").default(30) });

// The admin dashboard: the main numbers, sales and orders per day (FR-14), the top 5 products (FR-15).
// Cancelled orders don't count as sales.
reportsRouter.get("/summary", validate(summaryQuery, "query"), async (_req, res) => {
  const { days } = res.locals.query as z.infer<typeof summaryQuery>;
  // Also at least the last 14 days, to compare this week with the week before.
  const span = Math.max(days, 14);
  const from = midnight(span - 1);
  const periodStart = midnight(days - 1);
  const sale = { status: { not: "CANCELLED" } } as const;

  // Independent questions, so ask the database all of them at the same time.
  const [products, lowStock, soldOut, openIssues, byStatus, orders, bestSellers] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { stock: { lte: prisma.product.fields.reorderLevel } } }),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.orderIssue.count({ where: { status: "OPEN" } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: periodStart } }, _count: { _all: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: from }, ...sale }, select: { createdAt: true, total: true } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: periodStart }, ...sale } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  // One entry per day, also for days without sales (they show as 0 in the chart).
  const perDay = Array.from({ length: span }, (_, i) => ({ date: dayKey(midnight(span - 1 - i)), orders: 0, revenue: new Prisma.Decimal(0) }));
  const byDay = new Map(perDay.map((d) => [d.date, d]));
  for (const o of orders) {
    const day = byDay.get(dayKey(o.createdAt));
    if (day) {
      day.orders++;
      day.revenue = day.revenue.add(o.total); // Decimal, so cents are never lost
    }
  }
  const total = (list: typeof perDay) => ({
    orders: list.reduce((n, d) => n + d.orders, 0),
    revenue: list.reduce((sum, d) => sum.add(d.revenue), new Prisma.Decimal(0)).toFixed(2),
  });

  const names = await prisma.product.findMany({
    where: { id: { in: bestSellers.map((b) => b.productId) } },
    select: { id: true, name: true, imageUrl: true },
  });
  const productOf = new Map(names.map((p) => [p.id, p]));

  const ordersByStatus = { PENDING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
  for (const s of byStatus) ordersByStatus[s.status] = s._count._all;

  res.json({
    days,
    products: { total: products, lowStock, soldOut },
    openIssues,
    thisWeek: total(perDay.slice(-7)), // the last 7 days, today included
    lastWeek: total(perDay.slice(-14, -7)), // the 7 days before
    // For the chosen period:
    ordersByStatus,
    salesByDay: perDay.slice(-days).map((d) => ({ date: d.date, orders: d.orders, revenue: d.revenue.toFixed(2) })),
    bestSellers: bestSellers.map((b) => ({
      productId: b.productId,
      name: productOf.get(b.productId)?.name ?? "Deleted product",
      imageUrl: productOf.get(b.productId)?.imageUrl ?? null,
      sold: b._sum.quantity ?? 0,
    })),
  });
});
