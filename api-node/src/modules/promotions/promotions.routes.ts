import { Router } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// Sales such as the "Christmas Sale": a percentage off the products that didn't sell well.
export const promotionsRouter = Router();
const admin = [requireAuth, requireRole("ADMIN")];

const startBody = z.object({
  name: z.string().trim().min(2).max(60),
  percent: z.number().int().min(1, "From 1 to 90").max(90, "From 1 to 90"),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format 2026-12-31"), // the sale lasts until the end of that day
  maxSold: z.number().int().min(1).max(1000), // products that sold FEWER pieces than this...
  days: z.number().int().min(1).max(365), // ...in the last this many days
});

const now = () => new Date();
const activeSale = () =>
  prisma.promotion.findFirst({ where: { endsAt: { gt: now() } }, orderBy: { id: "desc" }, include: { _count: { select: { products: true } } } });

// The sale that is on now, for the website's popup and banner (anyone may ask). null = no sale.
promotionsRouter.get("/current", async (_req, res) => {
  const sale = await activeSale();
  res.json(sale ? { id: sale.id, name: sale.name, percent: sale.percent, endsAt: sale.endsAt, productCount: sale._count.products } : null);
});

// Admin: start a sale on every product in stock that sold fewer than `maxSold` pieces in the last `days` days.
promotionsRouter.post("/", ...admin, validate(startBody), async (_req, res) => {
  const { name, percent, endsAt, maxSold, days } = res.locals.body as z.infer<typeof startBody>;
  const [y, m, d] = endsAt.split("-").map(Number);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (end <= now()) throw new AppError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "endsAt", message: "Pick a day in the future" }]);
  if (await activeSale()) throw new AppError(409, "SALE_ALREADY_ON", "A sale is already on. End it first.");

  // How many pieces of each product were sold in the period (cancelled orders don't count)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sold = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
  });
  const soldOf = new Map(sold.map((s) => [s.productId, s._sum.quantity ?? 0]));
  // Only products in stock: a discount on something nobody can buy helps no one
  const inStock = await prisma.product.findMany({ where: { stock: { gt: 0 } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const slow = inStock.filter((p) => (soldOf.get(p.id) ?? 0) < maxSold);
  if (slow.length === 0)
    throw new AppError(400, "VALIDATION_ERROR", "Invalid input", [
      { field: "maxSold", message: `Every product in stock sold at least ${maxSold} pieces in ${days} days` },
    ]);

  // Create the sale and put the slow products in it, together
  const promotion = await prisma.$transaction(async (tx) => {
    const promo = await tx.promotion.create({ data: { name, percent, endsAt: end } });
    await tx.product.updateMany({ where: { id: { in: slow.map((p) => p.id) } }, data: { promotionId: promo.id } });
    return promo;
  });
  res.status(201).json({ promotion: { ...promotion, productCount: slow.length }, products: slow });
});

// Admin: end a sale now. The normal prices come back at once (the sale stays in the history).
promotionsRouter.delete("/:id", ...admin, async (req, res) => {
  const id = parseId(req.params.id, "Promotion");
  const { count } = await prisma.promotion.updateMany({ where: { id, endsAt: { gt: now() } }, data: { endsAt: now() } });
  if (count === 0) throw notFound("Active sale");
  res.status(204).end();
});
